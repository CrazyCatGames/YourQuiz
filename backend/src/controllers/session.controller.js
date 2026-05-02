import prisma from '../prisma/client.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { generateRoomCode } from '../utils/roomCode.js'

// POST /api/sessions
export const createSession = asyncHandler(async (req, res) => {
  const { quizId } = req.body

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { createdById: true, id: true },
  })
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })
  if (quiz.createdById !== req.user.id)
    return res.status(403).json({ error: 'Not your quiz' })

  let roomCode, exists
  do {
    roomCode = generateRoomCode()
    exists   = await prisma.quizSession.findUnique({ where: { roomCode } })
  } while (exists)

  const session = await prisma.quizSession.create({
    data: {
      quizId,
      hostId:   req.user.id,
      roomCode,
      status:   'WAITING',
    },
    include: { quiz: { select: { title: true } } },
  })

  res.status(201).json(session)
})

// GET /api/sessions/join/:code
export const findByCode = asyncHandler(async (req, res) => {
  const session = await prisma.quizSession.findUnique({
    where: { roomCode: req.params.code.toUpperCase() },
    include: {
      quiz: {
        select: {
          id: true, title: true, description: true, coverImageUrl: true,
          _count: { select: { questions: true } },
        },
      },
      _count: { select: { participants: true } },
    },
  })

  if (!session) return res.status(404).json({ error: 'Session not found' })
  if (session.status === 'FINISHED')
    return res.status(410).json({ error: 'Session already finished' })
  if (session.status === 'CANCELLED')
    return res.status(410).json({ error: 'Session was cancelled' })

  res.json(session)
})

// GET /api/sessions/:id 
export const getSession = asyncHandler(async (req, res) => {
  const session = await prisma.quizSession.findUnique({
    where: { id: req.params.id },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: { answerOptions: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      },
      participants: {
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { totalScore: 'desc' },
      },
    },
  })
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json(session)
})

// GET /api/sessions/:id/leaderboard  
export const getLeaderboard = asyncHandler(async (req, res) => {
  const participants = await prisma.sessionParticipant.findMany({
    where:   { sessionId: req.params.id },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    orderBy: { totalScore: 'desc' },
  })

  const leaderboard = participants.map((p, idx) => ({
    rank:        idx + 1,
    userId:      p.userId,
    displayName: p.user.displayName,
    avatarUrl:   p.user.avatarUrl,
    totalScore:  p.totalScore,
  }))

  res.json(leaderboard)
})

// GET /api/sessions/:id/my-answers 
export const getMyAnswers = asyncHandler(async (req, res) => {
  const answers = await prisma.participantAnswer.findMany({
    where:   { sessionId: req.params.id, userId: req.user.id },
    include: {
      question: {
        select: {
          questionText: true, imageUrl: true, points: true,
          answerOptions: { orderBy: { orderIndex: 'asc' } },
        },
      },
      selectedOptions: {
        include: { answerOption: { select: { text: true, imageUrl: true, isCorrect: true } } },
      },
    },
    orderBy: { answeredAt: 'asc' },
  })
  res.json(answers)
})

// GET /api/sessions 
export const listMySessions = asyncHandler(async (req, res) => {
  const { role } = req.user

  if (role === 'ORGANIZER') {
    const sessions = await prisma.quizSession.findMany({
      where:   { hostId: req.user.id },
      include: {
        quiz:   { select: { title: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(sessions)
  }

  // PARTICIPANT
  const participations = await prisma.sessionParticipant.findMany({
    where:   { userId: req.user.id },
    include: {
      session: {
        include: {
          quiz: { select: { title: true } },
          _count: { select: { participants: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  res.json(
    participations.map((p) => ({
      ...p.session,
      myScore: p.totalScore,
      myRank:  p.rank,
    }))
  )
})
