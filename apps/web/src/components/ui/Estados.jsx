import { TriangleAlert } from 'lucide-react'

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface ${className}`} />
}

export function SkeletonLinhas({ n = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, titulo, subtitulo, acao, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 py-12 text-center ${className}`}>
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      {titulo && <p className="font-semibold text-text">{titulo}</p>}
      {subtitulo && <p className="max-w-sm text-sm text-text-muted">{subtitulo}</p>}
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  )
}

export function ErrorState({ mensagem = 'Não foi possível carregar.', onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 py-12 text-center ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="max-w-sm text-sm text-text-muted">{mensagem}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-brand-soft cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Tentar de novo
        </button>
      )}
    </div>
  )
}
