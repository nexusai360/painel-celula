const ESTILOS = {
  neutro: 'border-border text-text-muted',
  brand: 'bg-brand-soft/20 text-brand border-transparent',
  sucesso: 'bg-success/15 text-success border-transparent',
  perigo: 'bg-danger/15 text-danger border-transparent'
}

export function Tag({ children, variant = 'neutro', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ESTILOS[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

// Mapeia status de encontro/pedido/testemunho para uma Tag
const STATUS = {
  AGENDADO: { label: 'Agendado', variant: 'brand' },
  REALIZADO: { label: 'Realizado', variant: 'sucesso' },
  CANCELADO: { label: 'Cancelado', variant: 'perigo' },
  ATIVO: { label: 'Ativo', variant: 'brand' },
  ATENDIDO: { label: 'Atendido', variant: 'sucesso' },
  PENDENTE: { label: 'Pendente', variant: 'brand' },
  CONCLUIDO: { label: 'Concluído', variant: 'sucesso' }
}

export function StatusTag({ status }) {
  const s = STATUS[status] || { label: status, variant: 'neutro' }
  return <Tag variant={s.variant}>{s.label}</Tag>
}
