'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Logo, Button } from '@/components/ui'
import { LogOut, Zap, Users, BarChart3, ArrowRight } from 'lucide-react'

export default function HomePage() {
    const { user, logout } = useAuth()
    const router = useRouter()

    const handleMainAction = () => {
        if (!user) {
            router.push('/auth/login')
        } else if (user.role === 'ORGANIZER') {
            router.push('/dashboard')
        } else {
            router.push('/profile')
        }
    }

    return (
        <div className="min-h-screen bg-void bg-grid flex flex-col">

            {/* ── Nav ── */}
            <nav className="flex items-center justify-between px-8 py-5 border-b border-border/50">
                <Logo size="md" />
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                             <div className="text-right hidden sm:block">
                               <p className="text-sm font-display font-medium text-snow">{user.displayName || user.email}</p>
                               <p className="text-xs text-dim">
                                 {user.role === 'ORGANIZER' ? 'Организатор' : 'Участник'}
                               </p>
                             </div>
                            <button 
                                onClick={logout} 
                                className="text-dim hover:text-rose transition-colors"
                                title="Выйти"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link href="/auth/login">
                                <Button variant="ghost" size="sm">Войти</Button>
                            </Link>
                            <Link href="/auth/register">
                                <Button size="sm">Регистрация</Button>
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* ── Hero ── */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
                {/* Glow orbs */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan/5 blur-[120px] pointer-events-none" />
                <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full bg-violet/5 blur-[100px] pointer-events-none" />

                <div className="relative max-w-4xl flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan/30 bg-cyan-glow text-cyan text-sm font-display font-semibold mb-8 animate-fade-in">
                        <Zap size={14} /> Квизы в реальном времени
                    </div>

                    <h1 className="font-display font-extrabold text-5xl md:text-7xl leading-tight text-snow mb-6 animate-fade-up">
                        Создавай квизы.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan to-violet">
                            Играй вместе.
                        </span>
                    </h1>

                    <p className="text-dim text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
                        Платформа для проведения интерактивных квизов с подключением по коду комнаты,
                        живым лидербордом и моментальными результатами.
                    </p>

                    <div className="animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
                        <Button size="xl" className="gap-3 group" onClick={handleMainAction}>
                            Вперёд к квизам
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>

                {/* ── Features ── */}
                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-28">
                    {[
                        {
                            icon: <Zap size={24} className="text-cyan" />,
                            title: 'Реальное время',
                            text: 'Вопросы появляются синхронно для всех. Ответы — только пока вопрос активен.',
                        },
                        {
                            icon: <Users size={24} className="text-violet" />,
                            title: 'Вход по коду',
                            text: 'Участники подключаются вводом 6-значного кода. Никаких регистраций для гостей.',
                        },
                        {
                            icon: <BarChart3 size={24} className="text-emerald" />,
                            title: 'Живой лидерборд',
                            text: 'Баллы обновляются после каждого вопроса с учётом скорости ответа.',
                        },
                    ].map((f, i) => (
                        <div
                            key={i}
                            className="bg-panel border border-border rounded-2xl p-7 text-left glow-border animate-fade-up"
                            style={{ animationDelay: `${0.3 + i * 0.1}s`, opacity: 0 }}
                        >
                            <div className="mb-4 p-3 bg-slate rounded-xl w-fit">{f.icon}</div>
                            <h3 className="font-display font-bold text-snow text-lg mb-2">{f.title}</h3>
                            <p className="text-dim text-sm leading-relaxed">{f.text}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="py-6 border-t border-border/50 text-center text-dim text-sm mt-auto relative z-10">
                <Logo size="sm" className="justify-center mb-2" /> Домашние квизы © 2024
            </footer>
        </div>
    )
}
