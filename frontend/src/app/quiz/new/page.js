'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Spinner } from '@/components/ui'

// Создаём "заготовку" квиза и сразу редиректим на редактор
export default function NewQuizPage() {
  const router = useRouter()
  useEffect(() => {
    api.quizzes.create({ title: 'Новый квиз' }).then((q) => {
      router.replace(`/quiz/${q.id}/edit`)
    })
  }, [])
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <Spinner size="lg" />
      <p className="text-dim font-display">Создаём квиз...</p>
    </div>
  )
}
