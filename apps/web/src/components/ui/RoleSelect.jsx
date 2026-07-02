import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Popover } from './Popover.jsx'
import { RoleBadge } from './RoleBadge.jsx'
import { CORES_PAPEL } from '../../lib/papeis.js'

/**
 * Seleção de papel cujo trigger é o próprio chip colorido.
 * `opcoes` já vem filtrada pelo chamador (opcoesDePapel). readOnly/≤1 opção → chip estático.
 * Trigger com alvo de toque ≥44px.
 */
export function RoleSelect({ value, opcoes = [], onChange, readOnly = false, className = '' }) {
  const [open, setOpen] = useState(false)
  if (readOnly || opcoes.length <= 1) return <RoleBadge papel={value} className={className} />

  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label="Alterar nível de acesso"
      onClick={() => setOpen((o) => !o)}
      className="inline-flex min-h-11 items-center gap-1 rounded-full pr-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <RoleBadge papel={value} />
      <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger} align="end" className={className}>
      <ul role="listbox" className="min-w-[13rem]">
        {opcoes.map((p) => {
          const c = CORES_PAPEL[p]
          const Icon = c.icon
          return (
            <li key={p}>
              <button
                type="button"
                role="option"
                aria-selected={p === value}
                onClick={() => {
                  onChange?.(p)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface cursor-pointer"
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${c.chip}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="flex-1 text-text">{c.label}</span>
                {p === value && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>
    </Popover>
  )
}
