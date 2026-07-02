import { UserCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { AbaPendentes } from './admin/AdminUsuarios.jsx'

/**
 * Aprovações do líder — pendentes da própria célula (o backend já escopa
 * GET /usuarios/pendentes por célula). Rota dedicada para não colidir com a
 * área de Administração.
 */
export default function Aprovacoes() {
  const { usuario: eu } = useAuth()
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <UserCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Aprovações</h1>
          <p className="text-sm text-text-muted">Pessoas que pediram para entrar na sua célula.</p>
        </div>
      </div>
      <AbaPendentes eu={eu} />
    </div>
  )
}
