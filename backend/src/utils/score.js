/**
 * Подсчёт баллов за ответ с учётом скорости
 * score = maxPoints × (1 − 0.5 × timeRatio)
 * Минимум 50% от maxPoints за правильный медленный ответ
 * 0 за неправильный
 */
export const calculateScore = ({ isCorrect, maxPoints, timeTakenMs, timeLimitSec }) => {
  if (!isCorrect) return 0

  const timeRatio = Math.min(timeTakenMs / (timeLimitSec * 1000), 1)
  const score     = Math.round(maxPoints * (1 - 0.5 * timeRatio))
  return Math.max(score, Math.round(maxPoints * 0.5))
}
