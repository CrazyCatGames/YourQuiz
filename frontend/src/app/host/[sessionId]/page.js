'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocket } from '@/lib/socket'
import { api } from '@/lib/api'
import { Button, Badge, Spinner, Logo } from '@/components/ui'
import { Users, Play, ChevronRight, X, Crown, Trophy } from 'lucide-react'

export default function HostPage() {
  const { sessionId } = useParams()
  const router = useRouter()
  const { on, emit, off } = useSocket()

  const [session,      setSession]      = useState(null)
  const [participants, setParticipants] = useState([])
  const [status,       setStatus]       = useState('WAITING')
  const [leaderboard,  setLeaderboard]  = useState([])
  const [currentQ,     setCurrentQ]     = useState(null)
  const [qIndex,       setQIndex]       = useState(0)
  const [totalQ,       setTotalQ]       = useState(0)
  const [timeLeft,     setTimeLeft]     = useState(0)
  const [phase,        setPhase]        = useState('lobby') 
  const [correctIds,   setCorrectIds]   = useState([])

  useEffect(() => {
    api.sessions.get(sessionId).then((s) => {
      setSession(s)
      setTotalQ(s.quiz.questions.length)
    })
    emit('room:host', { sessionId }).then((res) => {
      if (res?.participants) setParticipants(res.participants)
    })
  }, [])

  useEffect(() => {
    const handlers = {
      'room:participants_updated': ({ participants }) => setParticipants(participants),
      'quiz:started':              ({ totalQuestions }) => { setTotalQ(totalQuestions); setStatus('IN_PROGRESS') },
      'question:show':             (data) => {
        setCurrentQ(data.question)
        setQIndex(data.questionIndex + 1)
        setTotalQ(data.totalQuestions)
        setTimeLeft(data.timeLimit)
        setPhase('question')
        setCorrectIds([])
      },
      'question:end':              ({ correctOptionIds, leaderboard }) => {
        setCorrectIds(correctOptionIds)
        setLeaderboard(leaderboard)
        setPhase('reveal')
      },
      'leaderboard:update':        ({ leaderboard }) => setLeaderboard(leaderboard),
      'quiz:finished':             ({ leaderboard }) => { setLeaderboard(leaderboard); setPhase('finished'); setStatus('FINISHED') },
    }

    const cleanups = Object.entries(handlers).map(([ev, fn]) => on(ev, fn))
    return () => cleanups.forEach((off) => off())
  }, [on])

  useEffect(() => {
    if (phase !== 'question') return
    if (timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const startQuiz  = () => emit('quiz:start',  { sessionId })
  const nextQ      = () => emit('quiz:next',   { sessionId })
  const cancelQuiz = async () => {
    if (!confirm('Отменить квиз?')) return
    await emit('quiz:cancel', { sessionId })
    router.push('/dashboard')
  }

  const OPT = ['A', 'B', 'C', 'D']

  if (phase === 'finished') return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan/5 to-violet/5 pointer-events-none" />
      <Trophy size={64} className="text-amber mb-6 animate-bounce-in" />
      <h1 className="font-display font-extrabold text-4xl text-snow mb-2">Квиз завершён!</h1>
      <p className="text-dim mb-10">Итоговые результаты</p>
      <Leaderboard rows={leaderboard} />
      <Button onClick={() => router.push('/dashboard')} variant="ghost" className="mt-8">
        ← В кабинет
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col">
      {/* ── Header ── */}
      <div className="bg-ink/80 backdrop-blur border-b border-border px-8 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          {session && (
            <div className="flex items-center gap-2">
              <span className="text-dim text-sm">Код:</span>
              <span className="font-mono font-bold text-cyan text-xl tracking-widest">{session.roomCode}</span>
            </div>
          )}
          <Badge color={status === 'IN_PROGRESS' ? 'cyan' : 'muted'}>
            {status === 'WAITING' ? 'Лобби' : status === 'IN_PROGRESS' ? 'Идёт' : 'Завершён'}
          </Badge>
          <button onClick={cancelQuiz} className="text-dim hover:text-rose transition-colors"><X size={20} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">

          {/* LOBBY */}
          {phase === 'lobby' && (
            <div className="text-center max-w-lg animate-fade-up">
              <div className="bg-panel border border-border rounded-3xl p-10 mb-8">
                <p className="text-dim text-sm mb-2">Код для подключения</p>
                <p className="font-mono font-extrabold text-cyan text-6xl tracking-[0.3em]">
                  {session?.roomCode || '------'}
                </p>
                <p className="text-dim text-sm mt-4">quizflow.app/join</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-dim mb-8">
                <Users size={18} /> <span>{participants.length} участников подключено</span>
              </div>
              <Button size="xl" onClick={startQuiz} disabled={participants.length === 0} className="gap-3 w-full">
                <Play size={22} /> Начать квиз
              </Button>
              {participants.length === 0 && (
                <p className="text-dim text-sm mt-3">Жди пока участники подключатся</p>
              )}
            </div>
          )}

          {/* QUESTION (только предпросмотр для ведущего) */}
          {(phase === 'question' || phase === 'reveal') && currentQ && (
            <div className="w-full max-w-3xl animate-slide-in">
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-dim text-sm font-display">Вопрос {qIndex} / {totalQ}</span>
                <span className={`font-mono font-bold text-2xl ${timeLeft <= 5 ? 'text-rose timer-critical' : 'text-cyan'}`}>
                  {phase === 'question' ? timeLeft : '—'}
                </span>
              </div>

              {/* Timer bar */}
              {phase === 'question' && (
                <div className="h-1.5 bg-slate rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-cyan rounded-full transition-all"
                    style={{ width: `${(timeLeft / (currentQ.timeLimit || 30)) * 100}%` }}
                  />
                </div>
              )}

              <div className="bg-panel border border-border rounded-2xl p-8 mb-6">
                {currentQ.imageUrl && (
                  <img src={`http://localhost:4000${currentQ.imageUrl}`} alt="" className="max-h-48 rounded-xl mx-auto mb-6 object-contain" />
                )}
                <p className="font-display font-bold text-snow text-2xl text-center">{currentQ.questionText}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currentQ.options?.map((opt, i) => {
                  const isCorrect = correctIds.includes(opt.id)
                  return (
                    <div
                      key={opt.id}
                      className={`opt-${OPT[i]} p-4 rounded-xl border border-border flex items-center gap-3 transition-all ${
                        phase === 'reveal' ? (isCorrect ? 'opt-correct' : 'opacity-50') : 'bg-slate'
                      }`}
                    >
                      <span className="font-display font-bold text-lg w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--opt-bg)', color: 'var(--opt-color)' }}>{OPT[i]}</span>
                      <span className="text-snow text-sm font-display font-semibold">{opt.text}</span>
                    </div>
                  )
                })}
              </div>

              {phase === 'reveal' && (
                <div className="mt-6 flex justify-center">
                  <Button size="lg" onClick={nextQ} className="gap-2">
                    {qIndex >= totalQ ? 'Завершить квиз' : 'Следующий вопрос'} <ChevronRight size={18} />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Participants sidebar ── */}
        <div className="w-72 border-l border-border bg-ink/40 flex flex-col">
          <div className="p-5 border-b border-border">
            <p className="font-display font-bold text-ghost text-sm flex items-center gap-2">
              <Users size={15} /> Участники ({participants.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {phase === 'lobby'
              ? participants.map((p, i) => (
                  <div key={p.userId} className="flex items-center gap-3 p-3 bg-panel border border-border rounded-xl animate-rank-in" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-violet flex items-center justify-center text-void font-bold text-xs">
                      {p.displayName[0]}
                    </div>
                    <span className="text-snow text-sm font-display font-semibold truncate">{p.displayName}</span>
                  </div>
                ))
              : leaderboard.map((p, i) => (
                  <div key={p.userId} className="flex items-center gap-3 p-3 bg-panel border border-border rounded-xl">
                    <span className={`font-mono font-bold text-sm w-6 ${i === 0 ? 'text-amber' : 'text-dim'}`}>#{p.rank}</span>
                    <span className="text-snow text-sm font-display font-semibold flex-1 truncate">{p.displayName}</span>
                    <span className="font-mono text-cyan text-sm font-bold">{p.totalScore}</span>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function Leaderboard({ rows }) {
  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      {rows.slice(0, 10).map((r, i) => (
        <div
          key={r.userId}
          className="flex items-center gap-4 p-4 bg-panel border border-border rounded-2xl animate-rank-in"
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          <span className={`w-8 font-display font-extrabold text-xl ${i === 0 ? 'text-amber' : i === 1 ? 'text-ghost' : i === 2 ? 'text-amber/60' : 'text-muted'}`}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${r.rank}`}
          </span>
          <span className="flex-1 font-display font-bold text-snow truncate">{r.displayName}</span>
          <span className="font-mono font-bold text-cyan text-lg">{r.totalScore}</span>
        </div>
      ))}
    </div>
  )
}
