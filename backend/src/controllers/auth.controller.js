import bcrypt from 'bcryptjs'
import prisma from '../prisma/client.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../config/jwt.js'
import { asyncHandler } from '../middleware/errorHandler.js'

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { email, password, displayName, role } = req.body

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      role: role === 'ORGANIZER' ? 'ORGANIZER' : 'PARTICIPANT',
    },
    select: { id: true, email: true, displayName: true, role: true, createdAt: true },
  })

  const payload = { id: user.id, email: user.email, role: user.role }
  res.status(201).json({
    user,
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  })
})

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const payload = { id: user.id, email: user.email, role: user.role }
  res.json({
    user: {
      id: user.id, email: user.email,
      displayName: user.displayName, role: user.role,
    },
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  })
})

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' })

  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } })
  if (!user) return res.status(401).json({ error: 'User not found' })

  const newPayload = { id: user.id, email: user.email, role: user.role }
  res.json({
    accessToken:  signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  })
})

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, displayName: true,
      avatarUrl: true, role: true, createdAt: true,
    },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})
