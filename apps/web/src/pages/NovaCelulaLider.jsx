import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import { NovaCelula } from './Celulas.jsx'

// Líderes/pastores podem criar uma célula; ela fica PENDENTE até um admin aprovar.
export default function NovaCelulaLider() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-text">Criar célula</h1>
        <p className="mt-1 text-sm text-text-muted">Preencha os dados. A célula entra para aprovação de um administrador antes de ficar visível.</p>
      </div>
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-text">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <span>Você será cadastrado como líder desta célula. Ela ficará <strong>aguardando aprovação</strong> até um administrador liberar.</span>
      </div>
      <NovaCelula onCriada={() => navigate('/app')} />
    </div>
  )
}
