import { Link } from 'react-router-dom'
import { Clock, UserCog } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Aguardando() {
  const { usuario } = useAuth()
  return (
    <div className="mx-auto max-w-md">
      <Card className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <Clock className="h-8 w-8 text-brand" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-text">Você está quase lá!</h1>
        <p className="mt-2 text-sm text-text-muted">
          {usuario?.celulaNome
            ? <>Enviamos seu pedido para os líderes da célula <span className="font-semibold text-text">{usuario.celulaNome}</span>. Assim que aprovarem, tudo é liberado.</>
            : 'Estamos aguardando a aprovação dos líderes da sua célula. Assim que aprovarem, tudo é liberado.'}
        </p>
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-left">
          <p className="text-sm font-semibold text-text">Enquanto isso, complete seu perfil</p>
          <p className="mt-1 text-sm text-text-muted">Adicione sua foto, WhatsApp e seus dados. Assim a célula já te conhece quando entrar.</p>
          <Link
            to="/app/perfil"
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-text transition-colors hover:border-brand hover:text-brand"
          >
            <UserCog className="h-4 w-4" /> Completar perfil
          </Link>
        </div>
      </Card>
    </div>
  )
}
