'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Input, Card } from '@/components/ui'

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [form,  setForm]  = useState({ email: '', password: '', displayName: '', role: 'PARTICIPANT' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await register(form)
      router.push(user.role === 'ORGANIZER' ? '/dashboard' : '/join')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8 animate-pop">
      <h1 className="font-display font-extrabold text-2xl text-snow mb-1">Создать аккаунт</h1>
      <p className="text-dim text-sm mb-8">Присоединяйся к QuizFlow</p>

      <form onSubmit={handle} className="flex flex-col gap-5">
        <Input
          label="Имя"
          placeholder="Как тебя зовут?"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          label="Пароль"
          type="password"
          placeholder="Минимум 6 символов"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={6}
        />

        {/* Роль */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-display font-semibold text-ghost">Я хочу...</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'PARTICIPANT', label: '🎮 Участвовать', desc: 'Проходить квизы' },
              { value: 'ORGANIZER',  label: '🎯 Создавать',   desc: 'Проводить квизы' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({ ...form, role: r.value })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.role === r.value
                    ? 'border-cyan bg-cyan-glow text-cyan'
                    : 'border-border text-dim hover:border-muted'
                }`}
              >
                <div className="font-display font-semibold text-sm">{r.label}</div>
                <div className="text-xs mt-0.5 opacity-70">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rose/10 border border-rose/30 text-rose text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-1">
          {loading ? 'Создание...' : 'Зарегистрироваться'}
        </Button>
      </form>

      <p className="text-dim text-sm text-center mt-6">
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="text-cyan hover:underline">Войти</Link>
      </p>
    </Card>
  )
}
