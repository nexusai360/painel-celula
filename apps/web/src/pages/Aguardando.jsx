import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, UserCog, RefreshCw } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { StatusBadge } from '../components/ui/RoleBadge.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiMe } from '../lib/api.js'

export default function Aguardando() {
  const { usuario, aplicarUsuario } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [checando, setChecando] = useState(false)

  async function atualizarStatus() {
    setChecando(true)
    try {
      const u = await apiMe()
      aplicarUsuario(u)
      if (u?.aprovado) {
        toast.sucesso('Você foi aprovado! Bem-vindo(a).')
        navigate('/app', { replace: true })
      } else {
        toast.info('Ainda em aprovação. Assim que um líder aprovar, você entra.')
      }
    } catch {
      toast.erro('Não foi possível checar o status agora.')
    } finally {
      setChecando(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <Clock className="h-8 w-8 text-brand" aria-hidden="true" />
        </div>
        <div className="mb-3 flex justify-center">
          <StatusBadge status="PENDENTE" />
        </div>
        <h1 className="font-display text-xl font-bold text-text">Você está quase lá!</h1>
        <p className="mt-2 text-sm text-text-muted">
          {usuario?.celulaNome
            ? <>Enviamos seu pedido para os líderes da célula <span className="font-semibold text-text">{usuario.celulaNome}</span>. Assim que aprovarem, tudo é liberado.</>
            : 'Estamos aguardando a aprovação dos líderes da sua célula. Assim que aprovarem, tudo é liberado.'}
        </p>

        <button
          type="button"
          onClick={atualizarStatus}
          disabled={checando}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-text transition-colors hover:border-brand hover:text-brand disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <RefreshCw className={`h-4 w-4 ${checando ? 'animate-spin' : ''}`} /> Atualizar status
        </button>

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
