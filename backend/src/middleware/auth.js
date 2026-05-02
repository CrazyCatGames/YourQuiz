import { verifyAccessToken } from '../config/jwt.js'

// Проверяет JWT и добавляет req.user
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' })
  }

  const token = header.slice(7)
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Ограничивает доступ по роли
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
  next()
}

export const requireOrganizer = requireRole('ORGANIZER')
