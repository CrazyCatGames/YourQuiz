'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Button, Card, Badge, Spinner, EmptyState, Logo } from '@/components/ui'
import { Plus, Play, Edit3, Trash2, Clock, Users, LogOut, LayoutGrid } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [quizzes,  setQuizzes]  = useState([])
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('quizzes')

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    if (user.role !== 'ORGANIZER') { router.push('/join'); return }
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    const [q, s] = await Promise.all([api.quizzes.list(), api.sessions.list()])
    setQuizzes(q || [])
    setSessions(s || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить квиз? Это действие необратимо.')) return
    await api.quizzes.delete(id)
    setQuizzes((prev) => prev.filter((q) => q.id !== id))
  }

  const handleStartSession = async (quizId) => {
    const session = await api.sessions.create(quizId)
    router.push(`/host/${session.id}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="min-h-screen bg-void bg-grid">
      {/* ── Sidebar-style header ── */}
      <div className="border-b border-border bg-ink/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" />
            <nav className="flex gap-1">
              {['quizzes', 'history'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
                    tab === t
                      ? 'bg-panel text-cyan border border-border'
                      : 'text-dim hover:text-ghost'
                  }`}
                >
                  {t === 'quizzes' ? 'Мои квизы' : 'История'}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-dim text-sm hidden sm:block">{user?.displayName}</span>
            <button onClick={() => { logout(); router.push('/') }} className="text-dim hover:text-rose transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {tab === 'quizzes' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display font-extrabold text-3xl text-snow">Мои квизы</h1>
                <p className="text-dim mt-1">{quizzes.length} квизов создано</p>
              </div>
              <Link href="/quiz/new">
                <Button size="md" className="gap-2">
                  <Plus size={18} /> Новый квиз
                </Button>
              </Link>
            </div>

            {quizzes.length === 0 ? (
              <EmptyState
                icon="🎯"
                title="Квизов пока нет"
                description="Создай первый квиз и проведи его для своей аудитории"
                action={<Link href="/quiz/new"><Button>Создать квиз</Button></Link>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {quizzes.map((q) => (
                  <Card key={q.id} className="p-6 flex flex-col gap-4 glow-border group">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-snow text-lg leading-snug">{q.title}</h3>
                        {q.category && (
                          <Badge color="violet" className="mt-1.5">
                            {q.category.icon} {q.category.name}
                          </Badge>
                        )}
                      </div>
                      <Badge color={q.isPublic ? 'emerald' : 'muted'}>
                        {q.isPublic ? 'Публичный' : 'Приватный'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-dim text-sm">
                      <span className="flex items-center gap-1.5">
                        <LayoutGrid size={14} /> {q._count?.questions || 0} вопросов
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Play size={14} /> {q._count?.sessions || 0} сессий
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                      <Button
                        size="sm"
                        onClick={() => handleStartSession(q.id)}
                        className="flex-1 gap-1.5"
                      >
                        <Play size={14} /> Запустить
                      </Button>
                      <Link href={`/quiz/${q.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit3 size={15} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)}>
                        <Trash2 size={15} className="text-rose" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            <h1 className="font-display font-extrabold text-3xl text-snow mb-8">История сессий</h1>
            {sessions.length === 0 ? (
              <EmptyState icon="📋" title="Сессий пока нет" description="Запусти квиз чтобы увидеть историю" />
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map((s) => (
                  <Card key={s.id} className="p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display font-bold text-snow">{s.quiz?.title}</p>
                      <div className="flex items-center gap-4 text-dim text-sm mt-1">
                        <span className="flex items-center gap-1">
                          <Users size={13} /> {s._count?.participants || 0} участников
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {s.startedAt ? new Date(s.startedAt).toLocaleDateString('ru') : '—'}
                        </span>
                        <span className="font-mono text-xs bg-slate px-2 py-0.5 rounded">
                          #{s.roomCode}
                        </span>
                      </div>
                    </div>
                    <Badge color={
                      s.status === 'FINISHED'     ? 'emerald' :
                      s.status === 'IN_PROGRESS'  ? 'cyan' :
                      s.status === 'CANCELLED'    ? 'rose' : 'muted'
                    }>
                      {{ FINISHED: 'Завершён', IN_PROGRESS: 'Идёт', WAITING: 'Ожидание', CANCELLED: 'Отменён' }[s.status]}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
