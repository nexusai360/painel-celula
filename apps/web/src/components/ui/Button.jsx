import { Loader2 } from 'lucide-react'

const variantes = {
  primary:
    'brand-grad bg-brand text-on-brand active:scale-[0.98] shadow-sm',
  secondary:
    'bg-surface text-text border border-border hover:border-brand-soft active:scale-[0.98]',
  ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface'
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const inativo = disabled || loading
  return (
    <button
      type={type}
      disabled={inativo}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
