import { CORES_PAPEL, CORES_STATUS, CORES_NIVEL, CORES_QUALIFICACAO } from '../../lib/papeis.js'

export function Chip({ conf, className = '', soIcone = false, title }) {
  if (!conf) return null
  const Icon = conf.icon
  if (soIcone) {
    return (
      <span
        title={title ?? conf.label}
        aria-label={conf.label}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${conf.chip} ${className}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${conf.chip} ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {conf.label}
    </span>
  )
}

// Legado (papel) — removido na Task 9.
export function RoleBadge({ papel, className = '' }) {
  return <Chip conf={CORES_PAPEL[papel]} className={className} />
}

export function StatusBadge({ status, className = '' }) {
  return <Chip conf={CORES_STATUS[status]} className={className} />
}

/** Badge do NÍVEL de acesso. `soIcone` mostra só o ícone (hover revela o rótulo). */
export function NivelBadge({ nivel, soIcone = false, className = '' }) {
  return <Chip conf={CORES_NIVEL[nivel]} soIcone={soIcone} className={className} />
}

/** Badge da QUALIFICAÇÃO. */
export function QualificacaoBadge({ qualificacao, className = '' }) {
  return <Chip conf={CORES_QUALIFICACAO[qualificacao]} className={className} />
}
