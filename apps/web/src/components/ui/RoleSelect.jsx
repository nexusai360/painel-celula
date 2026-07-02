import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Popover } from './Popover.jsx'
import { Chip } from './RoleBadge.jsx'
import { CORES_PAPEL, CORES_NIVEL, CORES_QUALIFICACAO } from '../../lib/papeis.js'

/**
 * Seleção genérica cujo trigger é o próprio chip colorido.
 * `opcoes` já vem filtrada pelo chamador. readOnly/≤1 opção → chip estático.
 * `cores` é o dicionário (CORES_NIVEL/CORES_QUALIFICACAO/CORES_PAPEL).
 */
export function ChipSelect({ value, opcoes = [], onChange, readOnly = false, cores, ariaLabel = 'Alterar', className = '' }) {
  const [open, setOpen] = useState(false)
  if (readOnly || opcoes.length <= 1) return <Chip conf={cores[value]} className={className} />

  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={() => setOpen((o) => !o)}
      className="inline-flex min-h-11 items-center gap-1 rounded-full pr-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Chip conf={cores[value]} />
      <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger} align="end" className={className}>
      <ul role="listbox" className="min-w-[13rem]">
        {opcoes.map((p) => {
          const c = cores[p]
          if (!c) return null
          const Icon = c.icon
          return (
            <li key={p}>
              <button
                type="button"
                role="option"
                aria-selected={p === value}
                onClick={() => { onChange?.(p); setOpen(false) }}
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

// Legado (papel) — removido na Task 9.
export function RoleSelect({ value, opcoes = [], onChange, readOnly = false, className = '' }) {
  return <ChipSelect value={value} opcoes={opcoes} onChange={onChange} readOnly={readOnly} cores={CORES_PAPEL} ariaLabel="Alterar nível de acesso" className={className} />
}

export function NivelSelect({ value, opcoes = [], onChange, readOnly = false, className = '' }) {
  return <ChipSelect value={value} opcoes={opcoes} onChange={onChange} readOnly={readOnly} cores={CORES_NIVEL} ariaLabel="Alterar nível de acesso" className={className} />
}

export function QualificacaoSelect({ value, opcoes = [], onChange, readOnly = false, className = '' }) {
  return <ChipSelect value={value} opcoes={opcoes} onChange={onChange} readOnly={readOnly} cores={CORES_QUALIFICACAO} ariaLabel="Alterar qualificação" className={className} />
}
