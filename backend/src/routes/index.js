import { Router } from 'express'
import { body }   from 'express-validator'

import { authenticate, requireOrganizer } from '../middleware/auth.js'
import { validate }                       from '../middleware/validate.js'
import { upload }                         from '../config/upload.js'

import * as auth    from '../controllers/auth.controller.js'
import * as quiz    from '../controllers/quiz.controller.js'
import * as session from '../controllers/session.controller.js'

const router = Router()

// ─── AUTH ──────────────────────────────────────────────────────
router.post('/auth/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').trim().notEmpty(),
    validate,
  ],
  auth.register
)
router.post('/auth/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
  ],
  auth.login
)
router.post('/auth/refresh', auth.refresh)
router.get('/auth/me', authenticate, auth.me)

// ─── CATEGORIES ───────────────────────────────────────────────
router.get('/categories', quiz.listCategories)

// ─── QUIZZES ──────────────────────────────────────────────────
router.get('/quizzes/public', quiz.listPublicQuizzes)

router.get('/quizzes',      authenticate, requireOrganizer, quiz.listMyQuizzes)
router.post('/quizzes',     authenticate, requireOrganizer,
  [body('title').trim().notEmpty(), validate],
  quiz.createQuiz
)
router.get('/quizzes/:id',  authenticate, quiz.getQuiz)
router.put('/quizzes/:id',  authenticate, requireOrganizer, quiz.updateQuiz)
router.delete('/quizzes/:id', authenticate, requireOrganizer, quiz.deleteQuiz)

// ─── QUESTIONS ────────────────────────────────────────────────
router.post('/quizzes/:id/questions',
  authenticate, requireOrganizer,
  [
    body('type').isIn(['TEXT', 'IMAGE']),
    body('answerMode').isIn(['SINGLE', 'MULTIPLE']),
    body('options').isArray({ min: 2 }),
    validate,
  ],
  quiz.addQuestion
)
router.put('/quizzes/:id/questions/reorder',
  authenticate, requireOrganizer,
  [body('order').isArray(), validate],
  quiz.reorderQuestions
)
router.put('/quizzes/:id/questions/:qid',
  authenticate, requireOrganizer,
  quiz.updateQuestion
)
router.delete('/quizzes/:id/questions/:qid',
  authenticate, requireOrganizer,
  quiz.deleteQuestion
)

// ─── IMAGE UPLOAD ─────────────────────────────────────────────
router.post('/upload/image',
  authenticate, requireOrganizer,
  upload.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.json({ url: `/uploads/${req.file.filename}` })
  }
)

// ─── SESSIONS ─────────────────────────────────────────────────
router.post('/sessions',
  authenticate, requireOrganizer,
  [body('quizId').notEmpty(), validate],
  session.createSession
)
router.get('/sessions',       authenticate, session.listMySessions)
router.get('/sessions/join/:code', authenticate, session.findByCode)
router.get('/sessions/:id',   authenticate, session.getSession)
router.get('/sessions/:id/leaderboard', authenticate, session.getLeaderboard)
router.get('/sessions/:id/my-answers',  authenticate, session.getMyAnswers)

export default router
