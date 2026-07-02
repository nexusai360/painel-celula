import { CORES_PAPEL, CORES_STATUS } from '../../lib/papeis.js'

function Chip({ conf, className }) {
  if (!conf) return null
  const Icon = conf.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${conf.chip} ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {conf.label}
    </span>
  )
}

export function RoleBadge({ papel, className = '' }) {
  return <Chip conf={CORES_PAPEL[papel]} className={className} />
}

export function StatusBadge({ status, className = '' }) {
  return <Chip conf={CORES_STATUS[status]} className={className} />
}
