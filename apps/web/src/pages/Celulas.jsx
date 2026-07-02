import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Trash2, UserCog, Users2 } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { DateTimePicker } from '../components/ui/DateTimePicker.jsx'
import { Tag } from '../components/ui/Tag.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import {
  apiListarCelulas,
  apiCriarCelula,
  apiExcluirCelula,
  apiDefinirLider,
  apiListarUsuarios
} from '../lib/api.js'
import { nomeDiaSemana } from '../lib/datas.js'

const DIAS = [0, 1, 2, 3, 4, 5, 6]
const FREQUENCIAS = [
  { v: 7, label: 'Semanal' },
  { v: 14, label: 'Quinzenal' },
  { v: 28, label: 'Mensal' }
]
const OPCOES_DIA = DIAS.map((d) => ({ value: d, label: nomeDiaSemana(d) }))
const OPCOES_FREQ = FREQUENCIAS.map((f) => ({ value: f.v, label: f.label }))

function NovaCelula({ onCriada }) {
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({
    nome: '', descricao: '', diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: '',
    cidade: '', bairro: '', endereco: '', numero: '', complemento: '', pontoReferencia: ''
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }))

  async function criar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await apiCriarCelula({
        nome: form.nome,
        descricao: form.descricao || undefined,
        diaSemana: Number(form.diaSemana),
        frequenciaDias: Number(form.frequenciaDias),
        dataPrimeiroEncontro: new Date(form.dataPrimeiroEncontro).toISOString(),
        cidade: form.cidade || undefined,
        bairro: form.bairro || undefined,
        endereco: form.endereco || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        pontoReferencia: form.pontoReferencia || undefined
      })
      setForm({
        nome: '', descricao: '', diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: '',
        cidade: '', bairro: '', endereco: '', numero: '', complemento: '', pontoReferencia: ''
      })
      setAberto(false)
      onCriada()
    } catch (e2) {
      setErro(e2?.response?.data?.erro || 'Erro ao criar célula.')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) {
    return (
      <Button className="w-auto px-5" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" /> Nova célula
      </Button>
    )
  }

  return (
    <Card>
      <h2 className="font-semibold text-text">Nova célula</h2>
      <form className="mt-4 space-y-4" onSubmit={criar}>
        <Input id="nome" label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
        <Input id="descricao" label="Descrição (opcional)" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Dia da semana"
            options={OPCOES_DIA}
            value={form.diaSemana}
            onChange={(v) => set('diaSemana', v)}
          />
          <Select
            label="Frequência"
            options={OPCOES_FREQ}
            value={form.frequenciaDias}
            onChange={(v) => set('frequenciaDias', v)}
          />
        </div>
        <DateTimePicker
          label="Primeiro encontro"
          value={form.dataPrimeiroEncontro}
          onChange={(v) => set('dataPrimeiroEncontro', v)}
          required
        />

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-semibold text-text">Endereço da célula</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="cidade" label="Cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
            <Input id="bairro" label="Bairro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Input id="endereco" label="Endereço" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
            </div>
            <Input id="numero" label="Número" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input id="complemento" label="Complemento (opcional)" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} />
            <Input id="pontoReferencia" label="Ponto de referência (opcional)" value={form.pontoReferencia} onChange={(e) => set('pontoReferencia', e.target.value)} />
          </div>
        </div>

        {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={salvando} className="w-auto px-5">Criar</Button>
          <Button type="button" variant="ghost" className="w-auto px-5" onClick={() => setAberto(false)}>Cancelar</Button>
        </div>
      </form>
    </Card>
  )
}

function DefinirLider({ celula, onDefinido }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function definir(userId) {
    setErro('')
    try {
      await apiDefinirLider(celula.id, userId)
      setAberto(false)
      onDefinido()
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível definir o líder.')
    }
  }

  useEffect(() => {
    if (!aberto) return
    setCarregando(true)
    const t = setTimeout(() => {
      apiListarUsuarios(busca)
        .then(setResultados)
        .finally(() => setCarregando(false))
    }, 300)
    return () => clearTimeout(t)
  }, [busca, aberto])

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 rounded text-xs font-medium text-brand hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <UserCog className="h-3.5 w-3.5" /> Definir líder
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <Input
        id={`busca-${celula.id}`}
        aria-label="Buscar usuário por nome ou e-mail"
        placeholder="Buscar por nome ou e-mail"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      {erro && <p role="alert" className="mt-2 text-xs text-danger">{erro}</p>}
      <div className="mt-2 max-h-44 space-y-1 overflow-auto">
        {carregando && <Spinner className="py-3" />}
        {!carregando && resultados.map((u) => (
          <button
            key={u.id}
            onClick={() => definir(u.id)}
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
  )
}

export default function Celulas() {
  const [celulas, setCelulas] = useState(null)
  const [erro, setErro] = useState('')

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

      <div className="mb-5">
        <NovaCelula onCriada={carregar} />
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}
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
                  <div className="mt-2">
                    {c.lider ? (
                      <Tag variant="brand">Líder: {c.lider.nome}</Tag>
                    ) : (
                      <Tag variant="neutro">Sem líder</Tag>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setAExcluir(c)}
                  aria-label="Excluir célula"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-muted hover:text-danger cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <DefinirLider celula={c} onDefinido={carregar} />
            </Card>
          ))}
        </div>
      )}

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
