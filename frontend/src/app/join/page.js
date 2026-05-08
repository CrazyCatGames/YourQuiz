'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Button, Logo } from '@/components/ui'
import { Hash } from 'lucide-react'
import Link from 'next/link'

export default function JoinPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e) => {
    e.preventDefault()
    if (code.trim().length < 4) return
    setError('')
    setLoading(true)
    try {
      const session = await api.sessions.findByCode(code.trim())
      router.push(`/play/${session.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col items-center justify-center px-4">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan/4 blur-[120px] pointer-events-none" />

      <Link href="/" className="relative mb-12"><Logo size="lg" /></Link>

      <div className="relative w-full max-w-md">
        <div className="bg-panel border border-border rounded-3xl p-10 text-center animate-pop shadow-card">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-glow border border-cyan/30 mx-auto mb-6">
            <Hash size={28} className="text-cyan" />
          </div>

          <h1 className="font-display font-extrabold text-3xl text-snow mb-2">Войти по коду</h1>
          <p className="text-dim text-sm mb-8">Введи 6-значный код комнаты</p>

          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              className="bg-slate border-2 border-border rounded-2xl px-6 py-5 text-snow text-3xl font-mono font-bold text-center uppercase tracking-[0.25em] outline-none placeholder-muted transition-all focus:border-cyan focus:shadow-cyan"
              placeholder="AB12CD"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoFocus
            />

            {error && (
              <div className="bg-rose/10 border border-rose/30 text-rose text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="xl"
              disabled={loading || code.trim().length < 4}
              className="w-full"
            >
              {loading ? 'Поиск...' : 'Войти в квиз'}
            </Button>
          </form>

          {!user && (
            <p className="text-dim text-sm mt-6">
              <Link href="/auth/login" className="text-cyan hover:underline">Войди</Link>{' '}
              чтобы видеть историю участия
            </p>
          )}
          {user?.role === 'ORGANIZER' && (
            <p className="text-dim text-sm mt-4">
              <Link href="/dashboard" className="text-violet hover:underline">← Вернуться в кабинет организатора</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
