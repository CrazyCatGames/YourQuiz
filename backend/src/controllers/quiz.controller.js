import prisma from '../prisma/client.js'
import { asyncHandler } from '../middleware/errorHandler.js'

// GET /api/quizzes
export const listMyQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { createdById: req.user.id },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      _count:   { select: { questions: true, sessions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(quizzes)
})

// GET /api/quizzes/public
export const listPublicQuizzes = asyncHandler(async (req, res) => {
  const { categoryId, search } = req.query
  const quizzes = await prisma.quiz.findMany({
    where: {
      isPublic: true,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      category:   { select: { id: true, name: true, icon: true } },
      createdBy:  { select: { id: true, displayName: true } },
      _count:     { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(quizzes)
})

// GET /api/quizzes/:id
export const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: {
      category:  { select: { id: true, name: true, icon: true, color: true } },
      createdBy: { select: { id: true, displayName: true } },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { answerOptions: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  })
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

  if (req.user?.id !== quiz.createdById && req.user?.role !== 'ORGANIZER') {
    quiz.questions = quiz.questions.map((q) => ({
      ...q,
      answerOptions: q.answerOptions.map(({ isCorrect: _, ...opt }) => opt),
    }))
  }

  res.json(quiz)
})

// POST /api/quizzes
export const createQuiz = asyncHandler(async (req, res) => {
  const {
    title, description, categoryId, coverImageUrl,
    defaultTimePerQuestion, maxParticipants,
    isPublic, shuffleQuestions, showCorrectAnswers,
  } = req.body

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description,
      categoryId:             categoryId || null,
      createdById:            req.user.id,
      coverImageUrl:          coverImageUrl || null,
      defaultTimePerQuestion: defaultTimePerQuestion || 30,
      maxParticipants:        maxParticipants || null,
      isPublic:               isPublic ?? false,
      shuffleQuestions:       shuffleQuestions ?? false,
      showCorrectAnswers:     showCorrectAnswers ?? true,
    },
  })
  res.status(201).json(quiz)
})

// PUT /api/quizzes/:id
export const updateQuiz = asyncHandler(async (req, res) => {
  await assertOwner(req.params.id, req.user.id, res)

  const data = { ...req.body }

  // Проверяем categoryId и превращаем пустую строку в null, чтобы Prisma не пыталась парсить ее в UUID
  if (data.categoryId === '') {
    data.categoryId = null
  }

  const quiz = await prisma.quiz.update({
    where: { id: req.params.id },
    data:  data,
  })
  res.json(quiz)
})

// DELETE /api/quizzes/:id
export const deleteQuiz = asyncHandler(async (req, res) => {
  await assertOwner(req.params.id, req.user.id, res)

  await prisma.quiz.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─── QUESTIONS ────────────────────────────────────────────────

// POST /api/quizzes/:id/questions
export const addQuestion = asyncHandler(async (req, res) => {
  await assertOwner(req.params.id, req.user.id, res)

  const {
    type, answerMode, questionText, imageUrl,
    timeLimit, points, options,
  } = req.body

  const last = await prisma.quiz_Question.findFirst({
    where:   { quizId: req.params.id },
    orderBy: { orderIndex: 'desc' },
    select:  { orderIndex: true },
  })
  const orderIndex = (last?.orderIndex ?? -1) + 1

  const question = await prisma.quiz_Question.create({
    data: {
      quizId:      req.params.id,
      orderIndex,
      type:        type || 'TEXT',
      answerMode:  answerMode || 'SINGLE',
      questionText: questionText || null,
      imageUrl:    imageUrl || null,
      timeLimit:   timeLimit || 30,
      points:      points || 100,
      answerOptions: {
        create: options.map((opt, idx) => ({
          orderIndex: idx,
          text:       opt.text || null,
          imageUrl:   opt.imageUrl || null,
          isCorrect:  opt.isCorrect,
        })),
      },
    },
    include: { answerOptions: { orderBy: { orderIndex: 'asc' } } },
  })

  res.status(201).json(question)
})

// PUT /api/quizzes/:id/questions/:qid
export const updateQuestion = asyncHandler(async (req, res) => {
  await assertOwner(req.params.id, req.user.id, res)

  const { options, ...rest } = req.body

  const question = await prisma.$transaction(async (tx) => {
    await tx.quiz_Question.update({
      where: { id: req.params.qid },
      data:  rest,
    })

    if (options) {
      await tx.answerOption.deleteMany({ where: { questionId: req.params.qid } })
      await tx.answerOption.createMany({
        data: options.map((opt, idx) => ({
          questionId: req.params.qid,
          orderIndex: idx,
          text:       opt.text || null,
          imageUrl:   opt.imageUrl || null,
          isCorrect:  opt.isCorrect,
        })),
      })
    }

    return tx.quiz_Question.findUnique({
      where:   { id: req.params.qid },
      include: { answerOptions: { orderBy: { orderIndex: 'asc' } } },
    })
  })

  res.json(question)
})

// DELETE /api/quizzes/:id/questions/:qid
export const deleteQuestion = asyncHandler(async (req, res) => {
  await assertOwner(req.params.id, req.user.id, res)

  await prisma.quiz_Question.delete({ where: { id: req.params.qid } })
  res.status(204).send()
})

// PUT /api/quizzes/:id/questions/reorder
export const reorderQuestions = asyncHandler(async (req, res) => {
  await assertOwner(req.params.id, req.user.id, res)

  const { order } = req.body
  await prisma.$transaction(
    order.map((qid, idx) =>
      prisma.quiz_Question.update({
        where: { id: qid },
        data:  { orderIndex: idx },
      })
    )
  )
  res.status(204).send()
})

// GET /api/categories
export const listCategories = asyncHandler(async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  res.json(cats)
})

async function assertOwner(quizId, userId, res) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { createdById: true },
  })
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })
  if (quiz.createdById !== userId)
    return res.status(403).json({ error: 'Not your quiz' })
}
