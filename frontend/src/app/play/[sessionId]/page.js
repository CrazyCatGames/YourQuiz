'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/lib/socket'
import { Button, Spinner, Logo } from '@/components/ui'
import { Users, Trophy, CheckCircle2, XCircle } from 'lucide-react'

const OPT_LABELS = ['A', 'B', 'C', 'D']

export default function PlayPage() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const router = useRouter()
  const { on, emit } = useSocket()

  const [phase,         setPhase]         = useState('lobby')   // lobby | question | reveal | finished
  const [question,      setQuestion]      = useState(null)
  const [qIndex,        setQIndex]        = useState(0)
  const [totalQ,        setTotalQ]        = useState(0)
  const [timeLeft,      setTimeLeft]      = useState(0)
  const [endsAt,        setEndsAt]        = useState(null)
  const [selected,      setSelected]      = useState([])         // ids выбранных вариантов
  const [submitted,     setSubmitted]     = useState(false)
  const [result,        setResult]        = useState(null)       // { isCorrect, scoreEarned }
  const [correctIds,    setCorrectIds]    = useState([])
  const [leaderboard,   setLeaderboard]   = useState([])
  const [participants,  setParticipants]  = useState(0)
  const [myScore,       setMyScore]       = useState(0)
  const [quizInfo,      setQuizInfo]      = useState(null)
  const timerRef = useRef(null)

  // ── Join room ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }

    // Найти sessionId → roomCode через API
    import('@/lib/api').then(({ api }) => {
      api.sessions.get(sessionId).then((s) => {
        setQuizInfo({ title: s.quiz.title, questionCount: s.quiz.questions.length })
        setTotalQ(s.quiz.questions.length)
        return emit('room:join', { roomCode: s.roomCode })
      }).then((res) => {
        if (res?.error) { alert(res.error); router.push('/join') }
      })
    })
  }, [user])

  // ── Socket listeners ────────────────────────────────────────
  useEffect(() => {
    const handlers = {
      'room:participants_updated': ({ participants }) => setParticipants(participants.length),
      'quiz:started':              ()     => setPhase('loading'),
      'question:show':             (data) => {
        setQuestion(data.question)
        setQIndex(data.questionIndex + 1)
        setTotalQ(data.totalQuestions)
        setEndsAt(data.endsAt)
        setTimeLeft(data.timeLimit)
        setSelected([])
        setSubmitted(false)
        setResult(null)
        setCorrectIds([])
        setPhase('question')
      },
      'question:end':   ({ correctOptionIds, leaderboard }) => {
        setCorrectIds(correctOptionIds)
        setLeaderboard(leaderboard)
        const me = leaderboard.find((r) => r.userId === user?.id)
        if (me) setMyScore(me.totalScore)
        setPhase('reveal')
      },
      'leaderboard:update': ({ leaderboard }) => {
        setLeaderboard(leaderboard)
        const me = leaderboard.find((r) => r.userId === user?.id)
        if (me) setMyScore(me.totalScore)
      },
      'quiz:finished': ({ leaderboard }) => { setLeaderboard(leaderboard); setPhase('finished') },
      'quiz:cancelled': () => { alert('Квиз отменён организатором'); router.push('/profile') },
    }

    const cleanups = Object.entries(handlers).map(([ev, fn]) => on(ev, fn))
    return () => cleanups.forEach((fn) => fn())
  }, [on, user])

  // ── Countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question' || !endsAt) return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) clearInterval(timerRef.current)
    }, 250)
    return () => clearInterval(timerRef.current)
  }, [phase, endsAt])

  const toggleOption = (optId) => {
    if (submitted) return
    if (question.answerMode === 'SINGLE') {
      setSelected([optId])
    } else {
      setSelected((prev) => prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId])
    }
  }

  const submitAnswer = async () => {
    if (!selected.length || submitted) return
    setSubmitted(true)
    const res = await emit('answer:submit', {
      sessionId,
      questionId: question.id,
      selectedOptionIds: selected,
    })
    setResult(res)
  }

  const myRank = leaderboard.findIndex((r) => r.userId === user?.id) + 1

  // ─── PHASES ────────────────────────────────────────────────

  if (phase === 'lobby') return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan/4 blur-[100px] pointer-events-none" />
      <Logo size="md" className="mb-12 relative" />
      <div className="bg-panel border border-border rounded-3xl p-10 max-w-md w-full animate-pop relative">
        <div className="w-14 h-14 rounded-2xl bg-cyan-glow border border-cyan/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">👋</span>
        </div>
        <h2 className="font-display font-extrabold text-2xl text-snow mb-1">Ты в лобби</h2>
        <p className="text-ghost font-display font-bold text-lg mb-1">{quizInfo?.title}</p>
        <p className="text-dim text-sm mb-8">{quizInfo?.questionCount} вопросов</p>
        <div className="flex items-center justify-center gap-2 text-dim text-sm">
          <Users size={16} /> {participants} участников
        </div>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Spinner size="sm" />
          <span className="text-dim text-sm">Ждём начала от организатора...</span>
        </div>
      </div>
    </div>
  )

  if (phase === 'loading') return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center animate-bounce-in">
        <p className="font-display font-extrabold text-5xl text-snow mb-2">3</p>
      </div>
    </div>
  )

  if (phase === 'finished') {
    const me = leaderboard.find((r) => r.userId === user?.id)
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 text-center">
        <Trophy size={56} className="text-amber mb-5 animate-bounce-in" />
        <h1 className="font-display font-extrabold text-4xl text-snow mb-2">Квиз завершён!</h1>
        {me && (
          <p className="text-dim mb-8">
            Ты набрал <span className="text-cyan font-bold">{me.totalScore}</span> баллов,{' '}
            место <span className="text-amber font-bold">#{me.rank || myRank}</span>
          </p>
        )}
        <div className="w-full max-w-sm flex flex-col gap-2 mb-8">
          {leaderboard.slice(0, 5).map((r, i) => (
            <div key={r.userId} className={`flex items-center gap-3 p-4 rounded-2xl border ${r.userId === user?.id ? 'border-cyan bg-cyan-glow' : 'border-border bg-panel'} animate-rank-in`} style={{ animationDelay: `${i * 0.07}s` }}>
              <span className="font-bold text-lg w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${r.rank}`}</span>
              <span className="flex-1 text-snow font-display font-semibold truncate">{r.displayName}</span>
              <span className="font-mono font-bold text-cyan">{r.totalScore}</span>
            </div>
          ))}
        </div>
        <Button onClick={() => router.push('/profile')}>Вернуться в профиль</Button>
      </div>
    )
  }

  if (!question) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>

  const timePct = (timeLeft / (question.timeLimit || 30)) * 100
  const isCritical = timeLeft <= 5

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* ── Header ── */}
      <div className="bg-ink/80 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-dim text-sm font-display">{qIndex}/{totalQ}</span>
          {phase === 'reveal' && result && (
            result.isCorrect
              ? <span className="text-emerald text-sm font-display font-semibold flex items-center gap-1"><CheckCircle2 size={15} /> +{result.scoreEarned}</span>
              : <span className="text-rose text-sm font-display font-semibold flex items-center gap-1"><XCircle size={15} /> Неверно</span>
          )}
        </div>
        <span className="font-mono font-bold text-cyan">{myScore} pts</span>
      </div>

      {/* ── Timer bar ── */}
      <div className="h-1.5 bg-slate">
        <div
          className={`h-full rounded-r-full transition-all ${isCritical ? 'bg-rose' : 'bg-cyan'} ${isCritical ? 'timer-critical' : ''}`}
          style={{ width: `${timePct}%`, transition: 'width 0.25s linear' }}
        />
      </div>

      <div className="flex-1 flex flex-col px-4 py-6 max-w-xl mx-auto w-full gap-5">
        {/* Timer number */}
        <div className="text-center">
          <span className={`font-mono font-extrabold text-5xl transition-colors ${isCritical ? 'text-rose timer-critical' : 'text-cyan'}`}>
            {phase === 'question' ? timeLeft : '—'}
          </span>
        </div>

        {/* Question */}
        <div className="bg-panel border border-border rounded-2xl p-6 text-center animate-slide-in">
          {question.imageUrl && (
            <img src={`http://localhost:4000${question.imageUrl}`} alt="" className="max-h-44 mx-auto rounded-xl mb-4 object-contain" />
          )}
          <p className="font-display font-bold text-snow text-xl leading-snug">{question.questionText}</p>
          {question.answerMode === 'MULTIPLE' && (
            <p className="text-dim text-xs mt-2">Выбери все подходящие варианты</p>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {question.options?.map((opt, i) => {
            const isSelected = selected.includes(opt.id)
            const isCorrect  = correctIds.includes(opt.id)
            const wasSelected = submitted && selected.includes(opt.id)

            let cls = `opt-${OPT_LABELS[i]} p-4 rounded-2xl border border-border flex items-center gap-3 cursor-pointer transition-all select-none active:scale-95`
            if (phase === 'reveal') {
              if (isCorrect)      cls += ' opt-correct'
              else if (wasSelected) cls += ' opt-wrong'
              else                cls += ' opacity-40'
            } else if (isSelected) {
              cls += ' opt-selected'
            } else {
              cls += ' bg-panel hover:bg-slate'
            }

            return (
              <button
                key={opt.id}
                className={cls}
                onClick={() => toggleOption(opt.id)}
                disabled={phase === 'reveal'}
              >
                <span
                  className="w-8 h-8 rounded-lg font-display font-bold text-sm flex items-center justify-center shrink-0"
                  style={{ background: 'var(--opt-bg)', color: 'var(--opt-color)' }}
                >
                  {OPT_LABELS[i]}
                </span>
                <span className="text-snow text-sm font-display font-semibold text-left leading-tight">{opt.text}</span>
              </button>
            )
          })}
        </div>

        {/* Submit */}
        {phase === 'question' && !submitted && (
          <Button
            size="lg"
            onClick={submitAnswer}
            disabled={selected.length === 0}
            className="w-full"
          >
            Ответить
          </Button>
        )}

        {phase === 'question' && submitted && (
          <div className="text-center text-dim text-sm animate-fade-in">
            Ответ принят. Ждём остальных...
          </div>
        )}

        {/* Reveal leaderboard */}
        {phase === 'reveal' && (
          <div className="bg-panel border border-border rounded-2xl p-4 animate-fade-up">
            <p className="text-dim text-xs font-display font-semibold mb-3 flex items-center gap-1"><Trophy size={13} /> Топ-5</p>
            {leaderboard.slice(0, 5).map((r, i) => (
              <div key={r.userId} className={`flex items-center gap-2 py-1.5 ${r.userId === user?.id ? 'text-cyan' : 'text-ghost'}`}>
                <span className="font-mono text-xs w-6 shrink-0">#{r.rank}</span>
                <span className="font-display font-semibold text-sm flex-1 truncate">{r.displayName}</span>
                <span className="font-mono text-sm font-bold">{r.totalScore}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
