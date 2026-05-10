'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Card, Badge, Spinner, EmptyState, Logo, Button } from '@/components/ui'
import { Clock, Users, Trophy, Star, LogOut, ArrowLeft, Hash } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [code, setCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/auth/login')
      return
    }
    
    loadHistory()
  }, [user, authLoading, router])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const data = await api.sessions.list()
      setSessions(data || [])
    } catch (error) {
      console.error('Ошибка при загрузке истории:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (code.trim().length < 4) return
    setJoinError('')
    setJoining(true)
    try {
      const session = await api.sessions.findByCode(code.trim())
      router.push(`/play/${session.id}`)
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  const isOrganizer = user?.role === 'ORGANIZER'

  return (
    <div className="min-h-screen bg-void bg-grid">
      {/* ── Header ── */}
      <div className="border-b border-border bg-ink/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" />
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-display font-medium text-snow">{user?.displayName}</p>
               <p className="text-xs text-dim">
                 {isOrganizer ? 'Организатор' : 'Участник'}
               </p>
             </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-dim hover:text-rose gap-2">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {!isOrganizer && (
          <div className="mb-12 bg-panel/50 border border-border rounded-3xl p-8 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-snow mb-2 flex items-center gap-2">
                  <Hash size={24} className="text-cyan" /> Войти в квиз
                </h2>
                <p className="text-dim">Введи 6-значный код комнаты, чтобы присоединиться к игре</p>
              </div>

              <form onSubmit={handleJoin} className="w-full md:w-auto flex flex-col gap-3 shrink-0">
                <div className="flex gap-2">
                  <input
                    className="bg-slate border border-border rounded-xl px-5 py-3 text-snow text-xl font-mono font-bold uppercase tracking-widest outline-none transition-all focus:border-cyan w-full md:w-48 text-center"
                    placeholder="КОД"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                  <Button type="submit" size="lg" disabled={joining || code.trim().length < 4}>
                    {joining ? <Spinner size="sm" /> : 'Войти'}
                  </Button>
                </div>
                {joinError && <p className="text-rose text-sm font-medium">{joinError}</p>}
              </form>
            </div>
          </div>
        )}

        {/* История */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-2xl text-snow">
            {isOrganizer ? 'История проведённых квизов' : 'История участия'}
          </h2>
        </div>

        {sessions.length === 0 ? (
          <EmptyState 
            icon="📭" 
            title="Истории пока нет" 
            description={
              isOrganizer 
                ? "Вы еще не провели ни одной игры." 
                : "Вы еще не участвовали в квизах. Подключитесь к своей первой игре!"
            } 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessions.map((s) => (
              <Card key={s.id} className="p-6 flex flex-col gap-4 glow-border">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-snow text-lg leading-snug">
                    {s.quiz?.title || s.title || "Неизвестный квиз"}
                  </h3>
                  
                  {isOrganizer ? (
                    <Badge color={
                      s.status === 'FINISHED'     ? 'emerald' :
                      s.status === 'IN_PROGRESS'  ? 'cyan' :
                      s.status === 'CANCELLED'    ? 'rose' : 'muted'
                    }>
                      {
                        s.status === 'FINISHED' ? 'Завершён' :
                        s.status === 'IN_PROGRESS' ? 'В процессе' :
                        s.status === 'WAITING' ? 'Ожидание' : 'Отменён'
                      }
                    </Badge>
                  ) : (
                    s.myRank && (
                      <Badge color={s.myRank === 1 ? 'emerald' : 'cyan'}>
                        <Trophy size={14} className="mr-1"/> {s.myRank} место
                      </Badge>
                    )
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-auto text-dim text-sm">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> 
                    {s.startedAt || s.joinedAt 
                      ? new Date(s.startedAt || s.joinedAt).toLocaleDateString('ru') 
                      : 'Неизвестная дата'}
                  </span>
                  
                  {isOrganizer ? (
                    <div className="flex items-center justify-between mt-1">
                      <span className="flex items-center gap-1.5">
                        <Users size={14} /> {s._count?.participants || 0} участников
                      </span>
                      <span className="font-mono text-xs bg-slate px-2 py-0.5 rounded border border-border">
                        #{s.roomCode}
                      </span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 mt-1 text-snow font-medium">
                      <Star size={14} className="text-violet" /> {s.myScore || 0} баллов
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}