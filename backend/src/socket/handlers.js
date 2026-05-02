import { verifyAccessToken } from '../config/jwt.js'
import prisma from '../prisma/client.js'
import { calculateScore } from '../utils/score.js'

// ─── В памяти: состояние активных сессий ─────────────────────
// Map<sessionId, SessionState>
const activeSessions = new Map()

function getState(sessionId) {
  return activeSessions.get(sessionId)
}
function setState(sessionId, data) {
  activeSessions.set(sessionId, { ...(activeSessions.get(sessionId) || {}), ...data })
}
function clearState(sessionId) {
  activeSessions.delete(sessionId)
}

// ─── Регистрация всех обработчиков ───────────────────────────
export function registerSocketHandlers(io) {

  // Middleware: аутентификация через JWT в handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      socket.user = verifyAccessToken(token)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { id: userId, role, displayName } = socket.user
    console.log(`[Socket] connected: ${displayName} (${role}) — ${socket.id}`)

    // ─── УЧАСТНИК: войти в комнату по коду ─────────────────
    socket.on('room:join', async ({ roomCode }, cb) => {
      try {
        const session = await prisma.quizSession.findUnique({
          where: { roomCode: roomCode.toUpperCase() },
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { answerOptions: { orderBy: { orderIndex: 'asc' } } },
                },
              },
            },
          },
        })

        if (!session)    return cb({ error: 'Session not found' })
        if (session.status === 'FINISHED')  return cb({ error: 'Quiz already finished' })
        if (session.status === 'CANCELLED') return cb({ error: 'Quiz was cancelled' })

        // Проверить лимит участников
        if (session.quiz.maxParticipants) {
          const count = await prisma.sessionParticipant.count({
            where: { sessionId: session.id },
          })
          if (count >= session.quiz.maxParticipants)
            return cb({ error: 'Room is full' })
        }

        // Добавить/найти участника
        await prisma.sessionParticipant.upsert({
          where:  { sessionId_userId: { sessionId: session.id, userId } },
          update: {},
          create: { sessionId: session.id, userId },
        })

        socket.join(session.id)
        socket.sessionId = session.id

        // Уведомить всех в лобби
        socket.to(session.id).emit('room:participant_joined', {
          userId, displayName,
        })

        // Текущих участников — организатору
        const participants = await getParticipantList(session.id)
        io.to(session.id).emit('room:participants_updated', { participants })

        cb({
          ok:        true,
          sessionId: session.id,
          status:    session.status,
          quiz: {
            title:         session.quiz.title,
            description:   session.quiz.description,
            questionCount: session.quiz.questions.length,
          },
        })
      } catch (e) {
        console.error('[room:join]', e)
        cb({ error: 'Server error' })
      }
    })

    // ─── ОРГАНИЗАТОР: подключиться к своей сессии ───────────
    socket.on('room:host', async ({ sessionId }, cb) => {
      try {
        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
          select: { hostId: true, status: true },
        })
        if (!session)              return cb({ error: 'Session not found' })
        if (session.hostId !== userId) return cb({ error: 'Not your session' })

        socket.join(sessionId)
        socket.sessionId = sessionId

        const participants = await getParticipantList(sessionId)
        cb({ ok: true, status: session.status, participants })
      } catch (e) {
        console.error('[room:host]', e)
        cb({ error: 'Server error' })
      }
    })

    // ─── ОРГАНИЗАТОР: запустить квиз ────────────────────────
    socket.on('quiz:start', async ({ sessionId }, cb) => {
      try {
        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { answerOptions: { orderBy: { orderIndex: 'asc' } } },
                },
              },
            },
          },
        })

        if (!session)                  return cb({ error: 'Session not found' })
        if (session.hostId !== userId) return cb({ error: 'Not your session' })
        if (session.status !== 'WAITING') return cb({ error: 'Already started' })

        let questions = session.quiz.questions
        if (session.quiz.shuffleQuestions) questions = shuffle(questions)

        // Сохранить состояние в памяти
        setState(sessionId, {
          questions,
          currentIndex:  -1,
          questionTimer: null,
        })

        await prisma.quizSession.update({
          where: { id: sessionId },
          data:  { status: 'IN_PROGRESS', startedAt: new Date() },
        })

        io.to(sessionId).emit('quiz:started', { totalQuestions: questions.length })
        cb({ ok: true })

        // Показать первый вопрос
        await showNextQuestion(io, sessionId)
      } catch (e) {
        console.error('[quiz:start]', e)
        cb({ error: 'Server error' })
      }
    })

    // ─── ОРГАНИЗАТОР: следующий вопрос вручную ──────────────
    socket.on('quiz:next', async ({ sessionId }, cb) => {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId }, select: { hostId: true },
      })
      if (session?.hostId !== userId) return cb?.({ error: 'Forbidden' })
      await showNextQuestion(io, sessionId)
      cb?.({ ok: true })
    })

    // ─── УЧАСТНИК: отправить ответ ──────────────────────────
    socket.on('answer:submit', async ({ sessionId, questionId, selectedOptionIds }, cb) => {
      try {
        const state = getState(sessionId)
        if (!state) return cb({ error: 'Session not active' })

        const question = state.questions[state.currentIndex]
        if (!question || question.id !== questionId)
          return cb({ error: 'Question mismatch' })

        // Уже отвечал?
        const already = await prisma.participantAnswer.findUnique({
          where: { sessionId_questionId_userId: { sessionId, questionId, userId } },
        })
        if (already) return cb({ error: 'Already answered' })

        // Проверка правильности
        const correctIds = question.answerOptions
          .filter((o) => o.isCorrect)
          .map((o) => o.id)

        const isCorrect =
          correctIds.length === selectedOptionIds.length &&
          correctIds.every((id) => selectedOptionIds.includes(id))

        const timeTakenMs = Date.now() - state.questionStartedAt

        const scoreEarned = calculateScore({
          isCorrect,
          maxPoints:   question.points,
          timeTakenMs,
          timeLimitSec: question.timeLimit,
        })

        // Сохранить ответ + выбранные варианты
        await prisma.$transaction(async (tx) => {
          const pa = await tx.participantAnswer.create({
            data: {
              sessionId, questionId, userId,
              isCorrect, scoreEarned, timeTakenMs,
            },
          })
          if (selectedOptionIds.length) {
            await tx.selectedOption.createMany({
              data: selectedOptionIds.map((answerOptionId) => ({
                participantAnswerId: pa.id,
                answerOptionId,
              })),
            })
          }
          // Обновить total_score участника
          await tx.sessionParticipant.update({
            where: { sessionId_userId: { sessionId, userId } },
            data:  { totalScore: { increment: scoreEarned } },
          })
        })

        cb({ ok: true, isCorrect, scoreEarned })

        // Отправить обновлённый лидерборд после каждого ответа
        const leaderboard = await buildLeaderboard(sessionId)
        io.to(sessionId).emit('leaderboard:update', { leaderboard })
      } catch (e) {
        console.error('[answer:submit]', e)
        cb({ error: 'Server error' })
      }
    })

    // ─── ОРГАНИЗАТОР: отменить квиз ─────────────────────────
    socket.on('quiz:cancel', async ({ sessionId }, cb) => {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId }, select: { hostId: true },
      })
      if (session?.hostId !== userId) return cb?.({ error: 'Forbidden' })

      clearTimer(sessionId)
      clearState(sessionId)
      await prisma.quizSession.update({
        where: { id: sessionId },
        data:  { status: 'CANCELLED', endedAt: new Date() },
      })
      io.to(sessionId).emit('quiz:cancelled')
      cb?.({ ok: true })
    })

    // ─── ОТКЛЮЧЕНИЕ ─────────────────────────────────────────
    socket.on('disconnect', () => {
      const sid = socket.sessionId
      if (sid) {
        socket.to(sid).emit('room:participant_left', { userId, displayName })
      }
      console.log(`[Socket] disconnected: ${displayName} — ${socket.id}`)
    })
  })
}

// ─── Показать следующий вопрос ────────────────────────────────
async function showNextQuestion(io, sessionId) {
  const state = getState(sessionId)
  if (!state) return

  clearTimer(sessionId)

  const nextIndex = state.currentIndex + 1

  // Квиз закончен
  if (nextIndex >= state.questions.length) {
    await finishQuiz(io, sessionId)
    return
  }

  const question = state.questions[nextIndex]
  const now      = Date.now()

  setState(sessionId, { currentIndex: nextIndex, questionStartedAt: now })

  await prisma.quizSession.update({
    where: { id: sessionId },
    data:  {
      currentQuestionIndex: nextIndex,
      questionStartedAt:    new Date(now),
    },
  })

  // Отправить вопрос БЕЗ is_correct всем
  io.to(sessionId).emit('question:show', {
    questionIndex: nextIndex,
    totalQuestions: state.questions.length,
    question: sanitizeQuestion(question),
    timeLimit: question.timeLimit,
    endsAt: now + question.timeLimit * 1000,
  })

  // Таймер автоматического перехода
  const timer = setTimeout(async () => {
    await revealAnswer(io, sessionId, question)
  }, question.timeLimit * 1000)

  setState(sessionId, { questionTimer: timer })
}

// ─── Открыть правильный ответ и показать лидерборд ────────────
async function revealAnswer(io, sessionId, question) {
  clearTimer(sessionId)

  const correctIds = question.answerOptions
    .filter((o) => o.isCorrect)
    .map((o) => o.id)

  const leaderboard = await buildLeaderboard(sessionId)

  io.to(sessionId).emit('question:end', {
    questionId: question.id,
    correctOptionIds: correctIds,
    leaderboard,
  })

  // 5 секунд паузы, потом следующий вопрос
  const timer = setTimeout(() => showNextQuestion(io, sessionId), 5000)
  setState(sessionId, { questionTimer: timer })
}

// ─── Завершить квиз ───────────────────────────────────────────
async function finishQuiz(io, sessionId) {
  clearTimer(sessionId)
  clearState(sessionId)

  // Проставить итоговые ранги
  const participants = await prisma.sessionParticipant.findMany({
    where:   { sessionId },
    orderBy: { totalScore: 'desc' },
  })

  await prisma.$transaction(
    participants.map((p, idx) =>
      prisma.sessionParticipant.update({
        where: { id: p.id },
        data:  { rank: idx + 1 },
      })
    )
  )

  await prisma.quizSession.update({
    where: { id: sessionId },
    data:  { status: 'FINISHED', endedAt: new Date() },
  })

  const leaderboard = await buildLeaderboard(sessionId)
  io.to(sessionId).emit('quiz:finished', { leaderboard })
}

// ─── Helpers ──────────────────────────────────────────────────

async function buildLeaderboard(sessionId) {
  const rows = await prisma.sessionParticipant.findMany({
    where:   { sessionId },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    orderBy: { totalScore: 'desc' },
  })
  return rows.map((r, i) => ({
    rank:        i + 1,
    userId:      r.userId,
    displayName: r.user.displayName,
    avatarUrl:   r.user.avatarUrl,
    totalScore:  r.totalScore,
  }))
}

async function getParticipantList(sessionId) {
  const rows = await prisma.sessionParticipant.findMany({
    where:   { sessionId },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  return rows.map((r) => ({
    userId:      r.userId,
    displayName: r.user.displayName,
    avatarUrl:   r.user.avatarUrl,
  }))
}

function sanitizeQuestion(q) {
  return {
    id:          q.id,
    type:        q.type,
    answerMode:  q.answerMode,
    questionText: q.questionText,
    imageUrl:    q.imageUrl,
    points:      q.points,
    options:     q.answerOptions.map(({ isCorrect: _, ...o }) => o),
  }
}

function clearTimer(sessionId) {
  const state = getState(sessionId)
  if (state?.questionTimer) {
    clearTimeout(state.questionTimer)
    setState(sessionId, { questionTimer: null })
  }
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}
