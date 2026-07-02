import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Trash2, UserCog, Users2, X, Check, Clock } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { Avatar } from '../components/ui/Avatar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Combobox } from '../components/ui/Combobox.jsx'
import { Checkbox } from '../components/ui/Checkbox.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs.jsx'
import { EmptyState } from '../components/ui/Estados.jsx'
import { DateTimePicker } from '../components/ui/DateTimePicker.jsx'
import { Tag } from '../components/ui/Tag.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import {
  apiListarCelulas,
  apiCriarCelula,
  apiExcluirCelula,
  apiAdicionarLider,
  apiRemoverLider,
  apiCelulasPendentes,
  apiAprovarCelula,
  apiListarUsuarios
} from '../lib/api.js'
import { nomeDiaSemana } from '../lib/datas.js'
import { montarPayloadCelula, weekdayDaData } from '../lib/celulaPayload.js'
import { mascaraCep } from '../lib/mascaras.js'
import { carregarCidadesBrasil, CIDADES_OPCOES_FALLBACK } from '../lib/cidades.js'

// Carrega as cidades do Brasil (IBGE, com cache/fallback) de forma lazy.
function useCidadesBrasil() {
  const [opcoes, setOpcoes] = useState(CIDADES_OPCOES_FALLBACK)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    let vivo = true
    carregarCidadesBrasil()
      .then((o) => { if (vivo) setOpcoes(o) })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])
  return { opcoes, carregando }
}

const DIAS = [0, 1, 2, 3, 4, 5, 6]
const FREQUENCIAS = [
  { v: 7, label: 'Semanal' },
  { v: 14, label: 'Quinzenal' },
  { v: 28, label: 'Mensal' }
]
const OPCOES_DIA = DIAS.map((d) => ({ value: d, label: nomeDiaSemana(d) }))
const OPCOES_FREQ = FREQUENCIAS.map((f) => ({ value: f.v, label: f.label }))

export function NovaCelula({ onCriada }) {
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({
    nome: '', descricao: '', diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: '',
    cidade: '', bairro: '', endereco: '', numero: '', complemento: '', pontoReferencia: '',
    cep: '', semNumero: false
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const toast = useToast()
  const { opcoes: cidades, carregando: carregandoCidades } = useCidadesBrasil()
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }))

  // O dia da semana é DERIVADO da data (nunca deixa o usuário criar mismatch).
  function setData(v) {
    setForm((f) => ({ ...f, dataPrimeiroEncontro: v, diaSemana: weekdayDaData(v) ?? f.diaSemana }))
  }

  // CEP com autofill (ViaCEP, best-effort, com timeout).
  async function buscarCep(cepMascarado) {
    setForm((f) => ({ ...f, cep: cepMascarado }))
    const d = cepMascarado.replace(/\D/g, '')
    if (d.length !== 8) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: ctrl.signal })
      const j = await r.json()
      if (!j.erro) {
        setForm((f) => ({
          ...f,
          cidade: j.localidade || f.cidade,
          bairro: j.bairro || f.bairro,
          endereco: j.logradouro || f.endereco,
        }))
      }
    } catch { /* best-effort — mantém o que o usuário digitou */ } finally {
      clearTimeout(timer)
    }
  }

  async function criar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await apiCriarCelula(montarPayloadCelula(form))
      setForm({
        nome: '', descricao: '', diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: '',
        cidade: '', bairro: '', endereco: '', numero: '', complemento: '', pontoReferencia: '',
        cep: '', semNumero: false
      })
      onCriada()
      toast.sucesso('Célula criada.')
    } catch (e2) {
      setErro(e2?.response?.data?.erro || 'Erro ao criar célula.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-bold text-text">Nova célula</h2>
      <form className="mt-5 space-y-6" onSubmit={criar}>
        {/* Identificação */}
        <div className="space-y-4">
          <Input id="nome" label="Nome" placeholder="Ex.: Célula Esperança" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
          <Input id="descricao" label="Descrição (opcional)" placeholder="Ex.: Jovens do bairro, foco em discipulado" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
        </div>

        {/* Encontro */}
        <div className="space-y-4 border-t border-border pt-5">
          <p className="text-sm font-semibold text-text">Encontro</p>
          <DateTimePicker
            label="Data e horário do primeiro encontro"
            value={form.dataPrimeiroEncontro}
            onChange={setData}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Dia da semana</label>
              <div className="flex h-12 items-center rounded-xl border border-border bg-surface px-4 text-sm text-text-muted">
                {form.dataPrimeiroEncontro ? nomeDiaSemana(form.diaSemana) : 'Definido pela data acima'}
              </div>
            </div>
            <Select label="Frequência" options={OPCOES_FREQ} value={form.frequenciaDias} onChange={(v) => set('frequenciaDias', v)} />
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-4 border-t border-border pt-5">
          <p className="text-sm font-semibold text-text">Endereço da célula</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="cep" label="CEP" placeholder="00000-000" inputMode="numeric" value={form.cep} onChange={(e) => buscarCep(mascaraCep(e.target.value))} />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-text">Cidade</label>
              <Combobox value={form.cidade} onChange={(v) => set('cidade', v)} options={cidades} loading={carregandoCidades} placeholder="Comece a digitar…" allowCustom aria-label="Cidade" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="bairro" label="Bairro" placeholder="Ex.: Centro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
            <Input id="endereco" label="Rua / Endereço" placeholder="Ex.: Rua 7" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input id="numero" label="Número" placeholder="Ex.: 123" value={form.semNumero ? 'S/N' : form.numero} disabled={form.semNumero} onChange={(e) => set('numero', e.target.value)} />
              <div className="mt-2">
                <Checkbox id="semNumero" label="Sem número" checked={form.semNumero} onChange={(v) => set('semNumero', v)} />
              </div>
            </div>
            <Input id="complemento" label="Complemento (opcional)" placeholder="Ex.: Fundos, ap. 2" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} />
          </div>
          <Input id="pontoReferencia" label="Ponto de referência (opcional)" placeholder="Ex.: Próximo à praça" value={form.pontoReferencia} onChange={(e) => set('pontoReferencia', e.target.value)} />
        </div>

        {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
        <Button type="submit" loading={salvando} className="w-auto px-6">Criar célula</Button>
      </form>
    </Card>
  )
}

// Gerência de MÚLTIPLOS líderes por célula: chips removíveis + busca para adicionar.
function GerenciarLideres({ celula, onMudou }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const lideres = celula.lideres || []

  async function adicionar(userId) {
    setErro('')
    try { await apiAdicionarLider(celula.id, userId); setBusca(''); onMudou() }
    catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível adicionar o líder.') }
  }
  async function remover(userId) {
    setErro('')
    try { await apiRemoverLider(celula.id, userId); onMudou() }
    catch (e) { setErro(e?.response?.data?.erro || 'Não foi possível remover o líder.') }
  }

  useEffect(() => {
    if (!aberto) return
    setCarregando(true)
    const t = setTimeout(() => {
      apiListarUsuarios(busca).then(setResultados).finally(() => setCarregando(false))
    }, 300)
    return () => clearTimeout(t)
  }, [busca, aberto])

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {lideres.length === 0 && <Tag variant="neutro">Sem líder</Tag>}
        {lideres.map((l) => (
          <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2 text-xs text-text">
            <Avatar nome={l.nome} src={l.avatar} size={20} />
            {l.nome}
            <button onClick={() => remover(l.id)} aria-label={`Remover ${l.nome}`} className="ml-0.5 text-text-muted hover:text-danger cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded-full">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <button
          onClick={() => setAberto((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-brand hover:bg-surface cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <UserCog className="h-3.5 w-3.5" /> Adicionar líder
        </button>
      </div>
      {erro && <p role="alert" className="mt-1.5 text-xs text-danger">{erro}</p>}
      {aberto && (
        <div className="mt-2 rounded-xl border border-border p-3">
          <Input
            id={`busca-${celula.id}`}
            aria-label="Buscar usuário por nome ou e-mail"
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="mt-2 max-h-44 space-y-1 overflow-auto">
            {carregando && <Spinner className="py-3" />}
            {!carregando && resultados.filter((u) => !lideres.some((l) => l.id === u.id)).map((u) => (
              <button
                key={u.id}
                onClick={() => adicionar(u.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="text-text">{u.nome}</span>
                <span className="text-xs text-text-muted">{u.email}</span>
              </button>
            ))}
            {!carregando && resultados.length === 0 && (
              <p className="py-2 text-center text-xs text-text-muted">Nenhum usuário encontrado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Fila de aprovação de células criadas por líderes/pastores.
function PendentesCelulas({ onMudou }) {
  const toast = useToast()
  const [lista, setLista] = useState(null)
  const [ocupado, setOcupado] = useState(null)

  async function carregar() {
    try { setLista(await apiCelulasPendentes()) } catch { setLista([]) }
  }
  useEffect(() => { carregar() }, [])

  async function aprovar(id) {
    setOcupado(id)
    try {
      await apiAprovarCelula(id)
      setLista((l) => l.filter((c) => c.id !== id))
      onMudou?.()
      toast.sucesso('Célula aprovada.')
    } catch (e) { toast.erro(e?.response?.data?.erro || 'Não foi possível aprovar.') }
    finally { setOcupado(null) }
  }

  if (!lista) return <Spinner className="py-16" />
  if (lista.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <Clock className="h-8 w-8 text-text-muted" />
        <p className="font-medium text-text">Nenhuma célula aguardando aprovação</p>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      {lista.map((c) => (
        <Card key={c.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold text-text">{c.nome}</h2>
              <p className="mt-0.5 text-sm text-text-muted">
                {nomeDiaSemana(c.diaSemana)} · criada por {c.criadaPor?.nome ?? '—'}
                {c.lideres?.length ? ` · líder(es): ${c.lideres.map((l) => l.nome).join(', ')}` : ''}
              </p>
            </div>
            <button
              onClick={() => aprovar(c.id)}
              disabled={ocupado === c.id}
              className="brand-grad inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" /> Aprovar célula
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function Celulas() {
  const [celulas, setCelulas] = useState(null)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState('nova')

  async function carregar() {
    try {
      setCelulas(await apiListarCelulas())
    } catch {
      setErro('Não foi possível carregar as células.')
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar() }, [])

  const [aExcluir, setAExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function confirmarExclusao() {
    setExcluindo(true)
    try {
      await apiExcluirCelula(aExcluir.id)
      setAExcluir(null)
      carregar()
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível excluir a célula.')
      setAExcluir(null)
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Células</h1>
          <p className="mt-1 text-sm text-text-muted">Gerencie as células, líderes e cronogramas.</p>
        </div>
      </div>

      <Tabs value={aba} onValueChange={setAba} className="space-y-5">
        <TabsList aria-label="Células">
          <TabsTrigger value="nova">Nova célula</TabsTrigger>
          <TabsTrigger value="todas">Todas as células{celulas?.length ? ` (${celulas.length})` : ''}</TabsTrigger>
          <TabsTrigger value="pendentes">Aprovações</TabsTrigger>
        </TabsList>

        <TabsContent value="nova">
          <NovaCelula onCriada={() => { carregar(); setAba('todas') }} />
        </TabsContent>

        <TabsContent value="pendentes">
          <PendentesCelulas onMudou={carregar} />
        </TabsContent>

        <TabsContent value="todas">
      {erro && <p className="mb-3 text-sm text-danger">{erro}</p>}
      {!celulas ? (
        <Spinner className="py-16" />
      ) : celulas.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Users2 className="h-8 w-8 text-text-muted" />
          <p className="font-medium text-text">Nenhuma célula cadastrada</p>
          <p className="text-sm text-text-muted">Crie a primeira célula para começar.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {celulas.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/app/celula/${c.id}`} className="group inline-flex items-center gap-1">
                    <h2 className="font-semibold text-text group-hover:text-brand">{c.nome}</h2>
                    <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-brand" />
                  </Link>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {nomeDiaSemana(c.diaSemana)} · {c._count?.membros ?? 0} membro(s) · {c._count?.encontros ?? 0} encontro(s)
                  </p>
                  {c.status === 'PENDENTE' && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" /> Aguardando aprovação
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setAExcluir(c)}
                  aria-label="Excluir célula"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-muted hover:text-danger cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <GerenciarLideres celula={c} onMudou={carregar} />
            </Card>
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!aExcluir}
        titulo="Excluir célula"
        mensagem="Excluir esta célula? Os encontros e presenças serão removidos. Não dá para desfazer."
        confirmarLabel="Excluir"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setAExcluir(null)}
      />
    </>
  )
}
