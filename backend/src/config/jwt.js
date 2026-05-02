import jwt from 'jsonwebtoken'

export const jwtConfig = {
  secret:         process.env.JWT_SECRET,
  refreshSecret:  process.env.JWT_REFRESH_SECRET,
  expiresIn:      process.env.JWT_EXPIRES_IN      || '15m',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}

export const signAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

export const signRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpires })

export const verifyAccessToken = (token) =>
  jwt.verify(token, jwtConfig.secret)

export const verifyRefreshToken = (token) =>
  jwt.verify(token, jwtConfig.refreshSecret)
