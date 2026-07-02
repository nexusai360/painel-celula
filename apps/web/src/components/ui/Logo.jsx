import { Users } from 'lucide-react'

export function Logo({ className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="brand-grad inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm">
        <Users className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="font-display text-xl font-bold text-text whitespace-nowrap">
        Hineni
      </span>
    </div>
  )
}
