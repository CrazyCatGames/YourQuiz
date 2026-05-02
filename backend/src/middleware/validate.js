import { validationResult } from 'express-validator'

// Запускает после цепочки express-validator — возвращает 422 при ошибках
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  next()
}
