import { useEffect, useState } from 'react'
import { ShieldCheck, HelpCircle, Check, X, Users, UserPlus, Search, Pencil } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs.jsx'
import { QualificacaoSelect, NivelSelect } from '../../components/ui/RoleSelect.jsx'
import { QualificacaoBadge, NivelBadge, StatusBadge } from '../../components/ui/RoleBadge.jsx'
import { Checkbox } from '../../components/ui/Checkbox.jsx'
import { Popover } from '../../components/ui/Popover.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { SkeletonLinhas, EmptyState, ErrorState } from '../../components/ui/Estados.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  CORES_STATUS, ROTULO_QUALIFICACAO, TODAS_QUALIFICACOES, opcoesDeQualificacao,
  opcoesDeNivel, ehAdmin, statusDeUsuario,
} from '../../lib/papeis.js'
import {
  apiUsuariosPendentes, apiAprovarUsuario, apiRecusarUsuario, apiListarUsuarios,
  apiAtualizarQualificacao, apiAtualizarNivel, apiAtualizarUsuario, apiAtualizarUsuarioAtivo,
} from '../../lib/api.js'

const LEGENDA_QUALIF = [
  { q: 'CONVIDADO', desc: 'Visitante que ainda não é membro.' },
  { q: 'MEMBRO', desc: 'Participante de uma célula.' },
  { q: 'LOUVOR', desc: 'Serve no ministério de louvor.' },
  { q: 'COLIDER', desc: 'Auxilia a liderança de uma célula.' },
  { q: 'LIDER', desc: 'Lidera uma célula e aprova seus membros.' },
  { q: 'PASTOR', desc: 'Pastoreia; qualificação mais alta.' },
]

function formatarData(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function Cabecalho() {
  const [legenda, setLegenda] = useState(false)
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Usuários</h1>
          <p className="text-sm text-text-muted">Aprove solicitações e gerencie qualificações e acessos.</p>
        </div>
      </div>
      <Popover
        open={legenda}
        onOpenChange={setLegenda}
        align="end"
        trigger={
          <button
            type="button"
            onClick={() => setLegenda((o) => !o)}
            aria-label="O que são as qualificações"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-text-muted transition-colors hover:text-text cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <HelpCircle className="h-4 w-4" /> Qualificações
          </button>
        }
      >
        <div className="w-[22rem] space-y-3.5 p-2.5">
          {LEGENDA_QUALIF.map((n) => (
            <div key={n.q} className="grid grid-cols-[7rem_1fr] items-start gap-3">
              <QualificacaoBadge qualificacao={n.q} className="mt-0.5 justify-self-start whitespace-nowrap" />
              <span className="text-xs leading-relaxed text-text-muted">{n.desc}</span>
            </div>
          ))}
        </div>
      </Popover>
    </div>
  )
}

// ── Aprovação (Pendentes) ────────────────────────────────────────────────────
function CardPendente({ u, selecionado, onToggle, onAprovar, onRecusar, ocupado }) {
  const [qualif, setQualif] = useState('MEMBRO')
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-transparent transition hover:ring-border">
      <Checkbox id={`sel-${u.id}`} checked={selecionado} onChange={() => onToggle(u.id)} />
      <Avatar nome={u.nome} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text">{u.nome}</p>
        <p className="truncate text-sm text-text-muted">{u.email}</p>
      </div>
      <span className="hidden text-xs text-text-muted sm:block">{formatarData(u.criadoEm)}</span>
      <div className="flex shrink-0 items-center gap-2">
        <QualificacaoSelect value={qualif} opcoes={TODAS_QUALIFICACOES} onChange={setQualif} />
        <button
          onClick={() => onRecusar(u)}
          disabled={ocupado}
          aria-label={`Recusar ${u.nome}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={() => onAprovar(u.id, qualif)}
          disabled={ocupado}
          className="brand-grad inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-on-brand shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Check className="h-4 w-4" /> Aprovar
        </button>
      </div>
    </div>
  )
}

export function AbaPendentes({ eu }) {
  const toast = useToast()
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(false)
  const [sel, setSel] = useState(new Set())
  const [ocupado, setOcupado] = useState(false)
  const [aRecusar, setARecusar] = useState(null)

  async function carregar() {
    setErro(false)
    try { setLista(await apiUsuariosPendentes()) } catch { setErro(true) }
  }
  useEffect(() => { carregar() }, [])

  function toggle(id) {
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  async function aprovar(id, qualificacao) {
    setOcupado(true)
    try {
      await apiAprovarUsuario(id, qualificacao)
      setLista((l) => l.filter((u) => u.id !== id))
      setSel((s) => { const n = new Set(s); n.delete(id); return n })
      toast.sucesso('Usuário aprovado.')
    } catch (e) { toast.erro(e?.response?.data?.erro || 'Não foi possível aprovar.') }
    finally { setOcupado(false) }
  }
  async function aprovarSelecionados() {
    setOcupado(true)
    const ids = [...sel]
    const res = await Promise.allSettled(ids.map((id) => apiAprovarUsuario(id, 'MEMBRO')))
    const ok = res.filter((r) => r.status === 'fulfilled').length
    setLista((l) => l.filter((u) => !ids.includes(u.id) || res[ids.indexOf(u.id)]?.status !== 'fulfilled'))
    setSel(new Set())
    setOcupado(false)
    if (ok) toast.sucesso(`${ok} usuário(s) aprovado(s) como Membro.`)
    if (ok < ids.length) toast.erro(`${ids.length - ok} não puderam ser aprovados.`)
  }
  async function confirmarRecusa() {
    const u = aRecusar
    setOcupado(true)
    try {
      await apiRecusarUsuario(u.id)
      setLista((l) => l.filter((x) => x.id !== u.id))
      toast.sucesso('Solicitação recusada.')
    } catch (e) { toast.erro(e?.response?.data?.erro || 'Não foi possível recusar.') }
    finally { setOcupado(false); setARecusar(null) }
  }

  if (erro) return <ErrorState onRetry={carregar} />
  if (!lista) return <SkeletonLinhas n={3} />
  if (lista.length === 0) {
    return <EmptyState icon={UserPlus} titulo="Tudo em dia" subtitulo="Nenhuma aprovação pendente no momento." />
  }

  // Agrupa por célula pretendida (líder N:N vê seções por célula).
  const grupos = {}
  for (const u of lista) {
    const chave = u.celulaNome || 'Sem célula'
    ;(grupos[chave] ||= []).push(u)
  }

  return (
    <div className="space-y-5">
      {sel.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5">
          <span className="text-sm text-text-muted">{sel.size} selecionado(s)</span>
          <button
            onClick={aprovarSelecionados}
            disabled={ocupado}
            className="brand-grad inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-on-brand shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-4 w-4" /> Aprovar selecionados (Membro)
          </button>
        </div>
      )}
      {Object.entries(grupos).map(([celula, us]) => (
        <div key={celula} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{celula} · {us.length}</p>
          {us.map((u) => (
            <CardPendente
              key={u.id} u={u} selecionado={sel.has(u.id)} onToggle={toggle}
              onAprovar={aprovar} onRecusar={setARecusar} ocupado={ocupado}
            />
          ))}
        </div>
      ))}
      <ConfirmDialog
        open={!!aRecusar}
        titulo="Recusar solicitação"
        mensagem={`Recusar ${aRecusar?.nome}? A solicitação some da lista de pendentes.`}
        confirmarLabel="Recusar"
        carregando={ocupado}
        onConfirmar={confirmarRecusa}
        onCancelar={() => setARecusar(null)}
      />
    </div>
  )
}

// ── Status (1 ícone que expande no hover e age no clique) ────────────────────
const HINT_STATUS = {
  PENDENTE: 'clique para aprovar',
  ATIVO: 'clique para inativar',
  INATIVO: 'clique para ativar',
  REPROVADO: 'clique para reativar',
}

function StatusControl({ status, onClick, ocupado }) {
  const c = CORES_STATUS[status]
  const Ic = c.icon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ocupado}
      title={`${c.label} — ${HINT_STATUS[status]}`}
      aria-label={`${c.label}. ${HINT_STATUS[status]}`}
      className={`group inline-flex shrink-0 items-center rounded-full border p-1.5 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${c.chip}`}
    >
      <Ic className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-[240px] group-hover:opacity-100">
        {c.label} · {HINT_STATUS[status]}
      </span>
    </button>
  )
}

// ── Modal de edição de usuário ───────────────────────────────────────────────
function EditarUsuarioModal({ u, eu, onFechar, onSalvo }) {
  const toast = useToast()
  const [nome, setNome] = useState(u.nome)
  const [whatsapp, setWhatsapp] = useState(u.whatsapp || '')
  const [ativo, setAtivo] = useState(u.ativo)
  const [nivel, setNivel] = useState(u.nivelAcesso)
  const [qualif, setQualif] = useState(u.qualificacao)
  const [salvando, setSalvando] = useState(false)

  const opcoesNivel = opcoesDeNivel(eu.nivelAcesso, u.nivelAcesso)
  const opcoesQualif = opcoesDeQualificacao(eu.nivelAcesso, eu.qualificacao)

  async function salvar() {
    setSalvando(true)
    try {
      let atual = u
      if (nome !== u.nome || whatsapp !== (u.whatsapp || '') || ativo !== u.ativo) {
        atual = await apiAtualizarUsuario(u.id, { nome, whatsapp: whatsapp || null, ativo })
      }
      if (nivel !== u.nivelAcesso) atual = await apiAtualizarNivel(u.id, nivel)
      if (qualif !== u.qualificacao) atual = await apiAtualizarQualificacao(u.id, qualif)
      onSalvo({ ...u, ...atual, nome, whatsapp, ativo, nivelAcesso: nivel, qualificacao: qualif })
      toast.sucesso('Usuário atualizado.')
      onFechar()
    } catch (e) {
      toast.erro(e?.response?.data?.erro || 'Não foi possível salvar.')
    } finally { setSalvando(false) }
  }

  return (
    <Modal open onClose={onFechar} titulo={`Editar ${u.nome}`} size="md">
      <div className="space-y-4 p-5">
        <Input id="edit-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input id="edit-wpp" label="WhatsApp" value={whatsapp} placeholder="(62) 99999-9999" onChange={(e) => setWhatsapp(e.target.value)} />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Qualificação</label>
            <QualificacaoSelect value={qualif} opcoes={opcoesQualif.length ? opcoesQualif : [qualif]} onChange={setQualif} readOnly={opcoesQualif.length <= 1} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Nível de acesso</label>
            <NivelSelect value={nivel} opcoes={opcoesNivel} onChange={setNivel} readOnly={opcoesNivel.length <= 1 || u.id === eu.id} />
          </div>
        </div>
        <Checkbox id="edit-ativo" label="Conta ativa" checked={ativo} onChange={setAtivo} />
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
        <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface hover:text-text cursor-pointer">Cancelar</button>
        <Button onClick={salvar} loading={salvando} className="w-auto px-6">Salvar</Button>
      </div>
    </Modal>
  )
}

// ── Todos ─────────────────────────────────────────────────────────────────────
function AbaTodos({ eu }) {
  const toast = useToast()
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(false)
  const [busca, setBusca] = useState('')
  const [ocupado, setOcupado] = useState(null)
  const [editando, setEditando] = useState(null)

  async function carregar(q = '') {
    setErro(false)
    try { setLista(await apiListarUsuarios(q)) } catch { setErro(true) }
  }
  useEffect(() => { carregar() }, [])
  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  async function trocarQualificacao(u, qualificacao) {
    setOcupado(u.id)
    try {
      const r = await apiAtualizarQualificacao(u.id, qualificacao)
      setLista((l) => l.map((x) => (x.id === u.id ? { ...x, qualificacao: r.qualificacao } : x)))
      toast.sucesso(`Qualificação alterada para ${ROTULO_QUALIFICACAO[qualificacao]}.`)
    } catch (e) { toast.erro(e?.response?.data?.erro || 'Não foi possível alterar.') }
    finally { setOcupado(null) }
  }
  async function acaoStatus(u) {
    const st = statusDeUsuario(u)
    setOcupado(u.id)
    try {
      if (st === 'PENDENTE') {
        await apiAprovarUsuario(u.id, u.qualificacao || 'MEMBRO')
        setLista((l) => l.map((x) => (x.id === u.id ? { ...x, aprovado: true, ativo: true } : x)))
        toast.sucesso('Usuário aprovado.')
      } else if (st === 'REPROVADO') {
        await apiAprovarUsuario(u.id, 'MEMBRO')
        await apiAtualizarUsuarioAtivo(u.id, true)
        setLista((l) => l.map((x) => (x.id === u.id ? { ...x, aprovado: true, ativo: true, qualificacao: 'MEMBRO' } : x)))
        toast.sucesso('Usuário reativado como membro.')
      } else {
        const r = await apiAtualizarUsuarioAtivo(u.id, !u.ativo)
        setLista((l) => l.map((x) => (x.id === u.id ? { ...x, ativo: r.ativo } : x)))
        toast.sucesso(r.ativo ? 'Usuário reativado.' : 'Usuário desativado.')
      }
    } catch (e) { toast.erro(e?.response?.data?.erro || 'Não foi possível alterar o status.') }
    finally { setOcupado(null) }
  }

  const opcoesQualif = opcoesDeQualificacao(eu?.nivelAcesso, eu?.qualificacao)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar usuário"
          className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm text-text placeholder:text-text-muted focus:border-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      </div>
      {erro ? (
        <ErrorState onRetry={() => carregar(busca)} />
      ) : !lista ? (
        <SkeletonLinhas n={5} />
      ) : lista.length === 0 ? (
        <EmptyState icon={Users} titulo="Nenhum usuário encontrado" subtitulo="Ajuste a busca e tente de novo." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {lista.map((u) => {
            const souEu = u.id === eu?.id
            const admin = ehAdmin(eu?.nivelAcesso)
            const podeEditar = admin || (!!eu?.celulaId && u.celulaId === eu?.celulaId)
            const st = statusDeUsuario(u)
            const podeStatus = admin && !souEu
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-3 border-b border-border p-4 transition-colors last:border-0 hover:bg-surface/50 md:flex-nowrap"
              >
                <Avatar nome={u.nome} src={u.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">
                    {u.nome} {souEu && <span className="text-xs font-normal text-text-muted">(você)</span>}
                  </p>
                  <p className="truncate text-sm text-text-muted">{u.email}</p>
                </div>
                {/* ícone de nível (admin/super) com hover, antes da qualificação */}
                {ehAdmin(u.nivelAcesso) && <NivelBadge nivel={u.nivelAcesso} soIcone />}
                {/* Reprovado não tem qualificação exibida */}
                {st !== 'REPROVADO' && (
                  <div className="shrink-0">
                    <QualificacaoSelect
                      value={u.qualificacao}
                      opcoes={podeEditar && opcoesQualif.length ? opcoesQualif : [u.qualificacao]}
                      readOnly={souEu || !podeEditar || opcoesQualif.length <= 1 || ocupado === u.id}
                      onChange={(q) => trocarQualificacao(u, q)}
                    />
                  </div>
                )}
                {podeStatus ? (
                  <StatusControl status={st} ocupado={ocupado === u.id} onClick={() => acaoStatus(u)} />
                ) : (
                  <StatusBadge status={st} />
                )}
                {admin && !souEu && (
                  <button
                    type="button"
                    onClick={() => setEditando(u)}
                    aria-label={`Editar ${u.nome}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:text-text cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {editando && (
        <EditarUsuarioModal
          u={editando}
          eu={eu}
          onFechar={() => setEditando(null)}
          onSalvo={(nv) => setLista((l) => l.map((x) => (x.id === nv.id ? { ...x, ...nv } : x)))}
        />
      )}
    </div>
  )
}

export default function AdminUsuarios() {
  const { usuario: eu } = useAuth()
  const [aba, setAba] = useState('pendentes')
  const [nPend, setNPend] = useState(null)

  useEffect(() => {
    apiUsuariosPendentes().then((l) => setNPend(l.length)).catch(() => {})
  }, [])

  return (
    <>
      <Cabecalho />
      <Tabs value={aba} onValueChange={setAba} className="space-y-5">
        <TabsList aria-label="Filtro de usuários">
          <TabsTrigger value="pendentes">
            Pendentes{nPend ? ` (${nPend})` : ''}
          </TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">
          <AbaPendentes eu={eu} />
        </TabsContent>
        <TabsContent value="todos">
          <AbaTodos eu={eu} />
        </TabsContent>
      </Tabs>
    </>
  )
}
