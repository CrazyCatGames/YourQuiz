'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button, Input, Card, Badge, Spinner } from '@/components/ui'
import {
  Plus, Trash2, Save, ArrowLeft, ImagePlus,
  CheckSquare, Square, GripVertical, Clock, Star
} from 'lucide-react'

const OPT_LABELS = ['A', 'B', 'C', 'D']

function emptyQuestion() {
  return {
    type: 'TEXT', answerMode: 'SINGLE',
    questionText: '', imageUrl: null,
    timeLimit: 30, points: 100,
    options: [
      { text: '', isCorrect: true  },
      { text: '', isCorrect: false },
    ],
  }
}

export default function QuizEditPage() {
  const params = useParams()
  const router = useRouter()
  const isNew  = params.id === undefined
  const fileRef = useRef(null)

  const [quiz,    setQuiz]    = useState({ title: '', description: '', isPublic: false, defaultTimePerQuestion: 30, categoryId: '' })
  const [questions, setQ]     = useState([emptyQuestion()])
  const [cats,    setCats]    = useState([])
  const [active,  setActive]  = useState(0)
  const [loading, setLoading] = useState(!isNew)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    api.categories.list().then(setCats)
    if (!isNew && params.id) {
      api.quizzes.get(params.id).then((data) => {
        setQuiz({
          title: data.title, description: data.description || '',
          isPublic: data.isPublic, categoryId: data.categoryId || '',
          defaultTimePerQuestion: data.defaultTimePerQuestion,
        })
        setQ(data.questions.map((q) => ({
          id: q.id, type: q.type, answerMode: q.answerMode,
          questionText: q.questionText || '', imageUrl: q.imageUrl,
          timeLimit: q.timeLimit, points: q.points,
          options: q.answerOptions.map((o) => ({
            id: o.id, text: o.text || '', imageUrl: o.imageUrl, isCorrect: o.isCorrect,
          })),
        })))
        setLoading(false)
      })
    }
  }, [])

  const save = async () => {
    if (!quiz.title?.trim()) {
      alert('Пожалуйста, укажите название квиза.')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      
      if (q.type === 'TEXT' && !q.questionText?.trim()) {
        alert(`Пожалуйста, введите текст для вопроса №${i + 1}`)
        setActive(i)
        return
      }

      if (q.type === 'IMAGE' && !q.imageUrl) {
        alert(`Пожалуйста, загрузите картинку для вопроса №${i + 1}`)
        setActive(i)
        return
      }

      const hasEmptyOptions = q.options.some((opt) => !opt.text?.trim())
      if (hasEmptyOptions) {
        alert(`Пожалуйста, заполните текст всех вариантов ответов в вопросе №${i + 1}`)
        setActive(i)
        return
      }

      const hasCorrect = q.options.some((opt) => opt.isCorrect)
      if (!hasCorrect) {
        alert(`Пожалуйста, отметьте правильный ответ в вопросе №${i + 1}`)
        setActive(i)
        return
      }
    }

    setSaving(true)
    try {
      let quizId = params.id
      if (isNew) {
        const created = await api.quizzes.create(quiz)
        quizId = created.id
      } else {
        await api.quizzes.update(quizId, quiz)
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const body = { ...q, options: q.options }
        
        if (q.id) {
          await api.questions.update(quizId, q.id, body)
        } else {
          const created = await api.questions.add(quizId, body)

          setQ((prev) => {
            const next = [...prev]
            if (next[i]) {
              next[i] = { ...next[i], id: created.id }
            }
            return next
          })
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (isNew) router.replace(`/quiz/${quizId}/edit`)
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = () => {
    setQ((prev) => [...prev, emptyQuestion()])
    setActive(questions.length)
  }

  const removeQuestion = async (idx) => {
    const q = questions[idx]
    if (q.id && params.id) await api.questions.delete(params.id, q.id)
    setQ((prev) => prev.filter((_, i) => i !== idx))
    setActive(Math.max(0, idx - 1))
  }

  const updateQ = (idx, patch) => setQ((prev) => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))

  const setCorrect = (qIdx, optIdx, multi) => {
    const q = questions[qIdx]
    const updated = q.options.map((o, i) => ({
      ...o,
      isCorrect: multi
        ? i === optIdx ? !o.isCorrect : o.isCorrect
        : i === optIdx,
    }))
    updateQ(qIdx, { options: updated })
  }

  const addOption = (qIdx) => {
    if (questions[qIdx].options.length >= 4) return
    updateQ(qIdx, { options: [...questions[qIdx].options, { text: '', isCorrect: false }] })
  }

  const uploadImage = async (file, target) => {
    const { url } = await api.upload.image(file)
    if (target === 'question') updateQ(active, { imageUrl: url, type: 'IMAGE' })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>

  const q = questions[active]

  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col">
      {/* ── Topbar ── */}
      <div className="bg-ink/80 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-dim hover:text-ghost transition-colors">
            <ArrowLeft size={20} />
          </button>
          <input
            className="bg-transparent font-display font-bold text-snow text-xl outline-none flex-1 min-w-0 placeholder-muted"
            placeholder="Название квиза..."
            value={quiz.title}
            maxLength={28}
            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
          />
          <div className="flex items-center gap-2 ml-auto">
            <Badge color={saved ? 'emerald' : 'muted'}>{saved ? '✓ Сохранено' : `${questions.length} вопросов`}</Badge>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save size={15} /> {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex gap-6 flex-1">

        {/* ── Question List (left) ── */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          <p className="text-dim text-xs font-display font-semibold uppercase tracking-widest mb-1">Вопросы</p>
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-display font-semibold transition-all truncate ${
                active === i
                  ? 'bg-panel border-cyan text-cyan'
                  : 'border-border text-dim hover:border-muted hover:text-ghost'
              }`}
            >
              {i + 1}. {q.questionText || 'Без текста'}
            </button>
          ))}
          <button
            onClick={addQuestion}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-dashed border-muted text-dim hover:border-cyan hover:text-cyan text-sm font-display font-semibold transition-all flex items-center gap-2"
          >
            <Plus size={15} /> Добавить
          </button>
        </div>

        {/* ── Question Editor (center) ── */}
        <div className="flex-1 min-w-0">
          {q && (
            <Card className="p-7 flex flex-col gap-6 animate-fade-in">
              {/* Type + Mode */}
              <div className="flex items-center gap-3 flex-wrap">
                {[['TEXT', 'Текстовый'], ['IMAGE', 'С картинкой']].map(([v, l]) => (
                  <button key={v} onClick={() => updateQ(active, { type: v })}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-display font-semibold transition-all ${q.type === v ? 'border-cyan text-cyan bg-cyan-glow' : 'border-border text-dim'}`}>
                    {l}
                  </button>
                ))}
                <div className="w-px h-5 bg-border mx-1" />
                {[['SINGLE', 'Один ответ'], ['MULTIPLE', 'Несколько']].map(([v, l]) => (
                  <button key={v} onClick={() => updateQ(active, { answerMode: v })}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-display font-semibold transition-all ${q.answerMode === v ? 'border-violet text-violet bg-violet-glow' : 'border-border text-dim'}`}>
                    {l}
                  </button>
                ))}
                <button onClick={() => removeQuestion(active)} className="ml-auto text-dim hover:text-rose transition-colors">
                  <Trash2 size={17} />
                </button>
              </div>

              {/* Question text */}
              <textarea
                className="bg-slate border border-border rounded-xl px-4 py-3 text-snow placeholder-muted outline-none resize-none text-base font-body focus:border-cyan transition-all"
                placeholder="Текст вопроса..."
                rows={3}
                value={q.questionText}
                onChange={(e) => updateQ(active, { questionText: e.target.value })}
              />

              {/* Image upload */}
              <div>
                {q.imageUrl ? (
                  <div className="relative group w-fit">
                    <img src={`http://localhost:4000${q.imageUrl}`} alt="" className="max-h-48 rounded-xl border border-border object-contain" />
                    <button
                      onClick={() => updateQ(active, { imageUrl: null })}
                      className="absolute top-2 right-2 bg-rose/80 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-muted text-dim hover:border-cyan hover:text-cyan text-sm font-display font-semibold transition-all"
                  >
                    <ImagePlus size={16} /> Добавить изображение
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'question')} />
              </div>

              {/* Answer options */}
              <div className="flex flex-col gap-3">
                <p className="text-ghost text-sm font-display font-semibold">Варианты ответа</p>
                {q.options.map((opt, oi) => (
                  <div key={oi} className={`flex items-center gap-3 p-3 rounded-xl border transition-all opt-${OPT_LABELS[oi]} ${opt.isCorrect ? 'opt-correct' : 'border-border'}`}>
                    <button onClick={() => setCorrect(active, oi, q.answerMode === 'MULTIPLE')} className="shrink-0">
                      {opt.isCorrect
                        ? <CheckSquare size={20} className="text-emerald" />
                        : <Square size={20} className="text-muted" />}
                    </button>
                    <span className="font-display font-bold text-sm w-5 shrink-0" style={{ color: `var(--opt-color)` }}>{OPT_LABELS[oi]}</span>
                    <input
                      className="bg-transparent flex-1 text-snow placeholder-muted outline-none text-sm"
                      placeholder={`Вариант ${OPT_LABELS[oi]}...`}
                      value={opt.text}
                      onChange={(e) => updateQ(active, { options: q.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o) })}
                    />
                    {q.options.length > 2 && (
                      <button onClick={() => updateQ(active, { options: q.options.filter((_, i) => i !== oi) })} className="text-muted hover:text-rose transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {q.options.length < 4 && (
                  <button onClick={() => addOption(active)} className="flex items-center gap-2 text-dim hover:text-cyan text-sm font-display font-semibold transition-colors px-3 py-2">
                    <Plus size={15} /> Добавить вариант
                  </button>
                )}
              </div>

              {/* Time + Points */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-display font-semibold text-dim flex items-center gap-1"><Clock size={12} /> Время (сек)</label>
                  <input
                    type="number" min={5} max={120} step={5}
                    className="bg-slate border border-border rounded-xl px-3 py-2 text-snow text-sm outline-none focus:border-cyan transition-all"
                    value={q.timeLimit}
                    onChange={(e) => updateQ(active, { timeLimit: +e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-display font-semibold text-dim flex items-center gap-1"><Star size={12} /> Баллы</label>
                  <input
                    type="number" min={50} max={1000} step={50}
                    className="bg-slate border border-border rounded-xl px-3 py-2 text-snow text-sm outline-none focus:border-cyan transition-all"
                    value={q.points}
                    onChange={(e) => updateQ(active, { points: +e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── Quiz Settings (right) ── */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-4">
            <p className="font-display font-bold text-ghost text-sm">Настройки квиза</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-display font-semibold text-dim">Категория</label>
              <select
                className="bg-slate border border-border rounded-xl px-3 py-2 text-snow text-sm outline-none focus:border-cyan"
                value={quiz.categoryId}
                onChange={(e) => setQuiz({ ...quiz, categoryId: e.target.value })}
              >
                <option value="">— Без категории</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
