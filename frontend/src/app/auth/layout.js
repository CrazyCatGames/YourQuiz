import { Logo } from '@/components/ui'
import Link from 'next/link'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col items-center justify-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet/5 blur-[100px] pointer-events-none" />
      <Link href="/" className="mb-10 relative">
        <Logo size="lg" />
      </Link>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  )
}
