import { Loader2 } from 'lucide-react'

export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Carregando" />
    </div>
  )
}
