import { useEffect, useState } from 'react'
import { Check, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { Avatar } from '../components/ui/Avatar.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Tag } from '../components/ui/Tag.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ROTULO_PAPEL, ehAdmin, ehSuperAdmin } from '../lib/papeis.js'
import {
  apiUsuariosPendentes, apiAprovarUsuario, apiRecusarUsuario,
  apiListarUsuarios, apiAtualizarPapel, apiAtualizarUsuarioAtivo
} from '../lib/api.js'

const LEGENDA = [
  { papel: 'MEMBRO', desc: 'Participante de uma célula.' },
  { papel: 'LIDER', desc: 'Líder de célula: gerencia a célula e aprova membros dela.' },
  { papel: 'ADMIN', desc: 'Faz tudo na plataforma (usuários, células, avisos).' },
  { papel: 'SUPER_ADMIN', desc: 'Dono. Único que concede ADMIN / SUPER_ADMIN.' }
]

function formatarData(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Usuarios() {
  const { usuario: eu } = useAuth()
  const [pendentes, setPendentes] = useState(null)
  const [usuarios, setUsuarios] = useState(null)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(null)

  async function carregarPendentes() {
    try { setPendentes(await apiUsuariosPendentes()) } catch { setErro('Não foi possível carregar as solicitações.') }
  }
  async function carregarUsuarios(q = '') {
    try { setUsuarios(await apiListarUsuarios(q)) } catch { setErro('Não foi possível carregar os usuários.') }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregarPendentes(); carregarUsuarios() }, [])
  useEffect(() => {
    const t = setTimeout(() => carregarUsuarios(busca), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  async function aprovar(id) {
    setOcupado(id); setErro('')
    try { await apiAprovarUsuario(id); setPendentes((l) => l.filter((u) => u.id !== id)); carregarUsuarios(busca) }
    catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível aprovar.') }
    finally { setOcupado(null) }
  }
  async function recusar(id) {
    setOcupado(id); setErro('')
    try { await apiRecusarUsuario(id); setPendentes((l) => l.filter((u) => u.id !== id)) }
    catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível recusar.') }
    finally { setOcupado(null) }
  }
  async function trocarPapel(id, papel) {
    setOcupado(id); setErro('')
    try {
      const u = await apiAtualizarPapel(id, papel)
      setUsuarios((l) => l.map((x) => (x.id === id ? { ...x, papel: u.papel } : x)))
    } catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível alterar o nível.') }
    finally { setOcupado(null) }
  }
  async function alternarAtivo(u) {
    setOcupado(u.id); setErro('')
    try {
      const at = await apiAtualizarUsuarioAtivo(u.id, !u.ativo)
      setUsuarios((l) => l.map((x) => (x.id === u.id ? { ...x, ativo: at.ativo } : x)))
    } catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível alterar o status.') }
    finally { setOcupado(null) }
  }

  const opcoesPapel = ehSuperAdmin(eu?.papel)
    ? ['MEMBRO', 'LIDER', 'ADMIN', 'SUPER_ADMIN']
    : ['MEMBRO', 'LIDER']
  const optsSelect = opcoesPapel.map((p) => ({ value: p, label: ROTULO_PAPEL[p] }))

  function podeEditarPapel(u) {
    if (u.id === eu?.id) return false
    const alto = u.papel === 'ADMIN' || u.papel === 'SUPER_ADMIN'
    if (alto) return ehSuperAdmin(eu?.papel)
    return ehAdmin(eu?.papel)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Usuários</h1>
        <p className="mt-1 text-sm text-text-muted">Aprove solicitações e gerencie os níveis de acesso.</p>
      </div>

      {erro && <p className="mb-3 text-sm text-danger" role="alert">{erro}</p>}

      {/* Legenda de papéis */}
      <Card className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
          <ShieldCheck className="h-4 w-4 text-brand" /> Níveis de acesso
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {LEGENDA.map((n) => (
            <li key={n.papel} className="flex items-start gap-2 text-sm">
              <Tag variant={n.papel === 'SUPER_ADMIN' ? 'brand' : 'neutro'} className="mt-0.5 shrink-0">{ROTULO_PAPEL[n.papel]}</Tag>
              <span className="text-text-muted">{n.desc}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Aprovações pendentes */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Aprovações pendentes {pendentes?.length ? `(${pendentes.length})` : ''}
      </h2>
      {!pendentes ? (
        <Spinner className="py-10" />
      ) : pendentes.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <UserPlus className="h-7 w-7 text-text-muted" />
          <p className="text-sm text-text-muted">Nenhuma solicitação pendente.</p>
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
              <span className="hidden shrink-0 text-xs text-text-muted sm:block">{formatarData(u.criadoEm)}</span>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => recusar(u.id)} disabled={ocupado === u.id} aria-label={`Recusar ${u.nome}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-danger">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={() => aprovar(u.id)} disabled={ocupado === u.id} aria-label={`Aprovar ${u.nome}`}
                  className="brand-grad inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-on-brand shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <Check className="h-4 w-4" /> Aprovar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Todos os usuários */}
      <div className="mb-3 mt-8 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Todos os usuários</h2>
      </div>
      <div className="mb-3">
        <Input id="busca-usuarios" aria-label="Buscar usuário" placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {!usuarios ? (
        <Spinner className="py-10" />
      ) : usuarios.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <Users className="h-7 w-7 text-text-muted" />
          <p className="text-sm text-text-muted">Nenhum usuário encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {usuarios.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center gap-3">
              <Avatar nome={u.nome} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">
                  {u.nome} {u.id === eu?.id && <span className="text-xs font-normal text-text-muted">(você)</span>}
                </p>
                <p className="truncate text-sm text-text-muted">{u.email}</p>
              </div>
              <div className="w-40 shrink-0">
                {podeEditarPapel(u) ? (
                  <Select options={optsSelect} value={u.papel} onChange={(p) => trocarPapel(u.id, p)} />
                ) : (
                  <Tag variant={ehAdmin(u.papel) ? 'brand' : 'neutro'}>{ROTULO_PAPEL[u.papel] ?? u.papel}</Tag>
                )}
              </div>
              <button
                onClick={() => alternarAtivo(u)}
                disabled={ocupado === u.id || u.id === eu?.id}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer ${
                  u.ativo ? 'border-border text-text-muted hover:border-danger hover:text-danger' : 'border-success/40 text-success hover:bg-success/10'
                }`}
              >
                {u.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
