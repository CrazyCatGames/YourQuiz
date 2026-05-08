'use client'
import { clsx } from 'clsx'

// ─── Button ───────────────────────────────────────────────────
const btnBase = 'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none'

const btnVariants = {
  primary:  'bg-cyan text-void hover:bg-cyan-dim shadow-cyan hover:shadow-cyan active:scale-95',
  ghost:    'border border-border text-ghost hover:border-cyan hover:text-cyan hover:bg-cyan-glow active:scale-95',
  danger:   'bg-rose text-white hover:bg-rose/80 active:scale-95',
  violet:   'bg-violet text-white hover:bg-violet-dim shadow-violet active:scale-95',
  subtle:   'text-dim hover:text-ghost hover:bg-panel active:scale-95',
}

const btnSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
  xl: 'px-10 py-4 text-lg',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button className={clsx(btnBase, btnVariants[variant], btnSizes[size], className)} {...props}>
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-display font-semibold text-ghost">{label}</label>}
      <input
        className={clsx(
          'bg-panel border rounded-xl px-4 py-3 text-snow placeholder-muted outline-none',
          'transition-all duration-200 font-body text-sm',
          'focus:border-cyan focus:shadow-glow-sm',
          error ? 'border-rose' : 'border-border',
          className
        )}
        {...props}
      />
      {error && <p className="text-rose text-xs">{error}</p>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────
export function Card({ className, children, glow, ...props }) {
  return (
    <div
      className={clsx(
        'bg-panel border border-border rounded-2xl',
        glow && 'glow-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────
const badgeColors = {
  cyan:    'bg-cyan-glow text-cyan border border-cyan/30',
  violet:  'bg-violet-glow text-violet border border-violet/30',
  emerald: 'bg-emerald-glow text-emerald border border-emerald/30',
  amber:   'bg-amber/10 text-amber border border-amber/30',
  rose:    'bg-rose/10 text-rose border border-rose/30',
  muted:   'bg-slate text-dim border border-border',
}

export function Badge({ color = 'muted', children, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-display font-semibold', badgeColors[color], className)}>
      {children}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={clsx('rounded-full border-2 border-border border-t-cyan animate-spin', sz)} />
  )
}

// ─── Logo ─────────────────────────────────────────────────────
export function Logo({ size = 'md' }) {
  const sz = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }[size]
  return (
    <span className={clsx('font-display font-extrabold tracking-tight', sz)}>
      <span className="text-snow">Quiz</span>
      <span className="text-cyan">Flow</span>
    </span>
  )
}

// ─── EmptyState ───────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="text-5xl opacity-40">{icon}</div>
      <h3 className="font-display font-bold text-ghost text-xl">{title}</h3>
      {description && <p className="text-dim text-sm max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
