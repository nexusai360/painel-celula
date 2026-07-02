import { useEffect, useState } from 'react'
import { Check, UserPlus, X } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { Avatar } from '../components/ui/Avatar.jsx'
import { apiUsuariosPendentes, apiAprovarUsuario, apiRecusarUsuario } from '../lib/api.js'

function formatarData(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Usuarios() {
  const [pendentes, setPendentes] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(null) // id em ação

  async function carregar() {
    try {
      setPendentes(await apiUsuariosPendentes())
    } catch {
      setErro('Não foi possível carregar as solicitações.')
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar() }, [])

  async function aprovar(id) {
    setOcupado(id); setErro('')
    try { await apiAprovarUsuario(id); setPendentes((l) => l.filter((u) => u.id !== id)) }
    catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível aprovar.') }
    finally { setOcupado(null) }
  }
  async function recusar(id) {
    setOcupado(id); setErro('')
    try { await apiRecusarUsuario(id); setPendentes((l) => l.filter((u) => u.id !== id)) }
    catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível recusar.') }
    finally { setOcupado(null) }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Usuários</h1>
        <p className="mt-1 text-sm text-text-muted">Aprove ou recuse quem solicitou acesso à plataforma.</p>
      </div>

      {erro && <p className="mb-3 text-sm text-danger" role="alert">{erro}</p>}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Aprovações pendentes {pendentes?.length ? `(${pendentes.length})` : ''}
      </h2>

      {!pendentes ? (
        <Spinner className="py-16" />
      ) : pendentes.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <UserPlus className="h-8 w-8 text-text-muted" />
          <p className="font-medium text-text">Nenhuma solicitação pendente</p>
          <p className="text-sm text-text-muted">Novos cadastros aparecerão aqui para aprovação.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendentes.map((u) => (
            <Card key={u.id} className="flex items-center gap-3">
              <Avatar nome={u.nome} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{u.nome}</p>
                <p className="truncate text-sm text-text-muted">{u.email}</p>
              </div>
              <span className="hidden shrink-0 text-xs text-text-muted sm:block">
                {formatarData(u.criadoEm)}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => recusar(u.id)}
                  disabled={ocupado === u.id}
                  aria-label={`Recusar ${u.nome}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={() => aprovar(u.id)}
                  disabled={ocupado === u.id}
                  aria-label={`Aprovar ${u.nome}`}
                  className="brand-grad inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-on-brand shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <Check className="h-4 w-4" /> Aprovar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
