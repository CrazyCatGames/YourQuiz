'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Input, Card } from '@/components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const router    = useRouter()
  const [form,  setForm]  = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      router.push(user.role === 'ORGANIZER' ? '/dashboard' : '/join')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8 animate-pop">
      <h1 className="font-display font-extrabold text-2xl text-snow mb-1">С возвращением</h1>
      <p className="text-dim text-sm mb-8">Войди в свой аккаунт</p>

      <form onSubmit={handle} className="flex flex-col gap-5">
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
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {error && (
          <div className="bg-rose/10 border border-rose/30 text-rose text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-1">
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </form>

      <p className="text-dim text-sm text-center mt-6">
        Нет аккаунта?{' '}
        <Link href="/auth/register" className="text-cyan hover:underline">Зарегистрироваться</Link>
      </p>
    </Card>
  )
}
