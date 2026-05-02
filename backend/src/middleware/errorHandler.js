export const errorHandler = (err, _req, res, _next) => {
  console.error('[Error]', err.message)

  // Multer — превышен размер файла
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' })
  }

  // Ошибки валидации Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists (unique constraint)' })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' })
  }

  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
