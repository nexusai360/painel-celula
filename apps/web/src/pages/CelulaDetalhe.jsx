import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { CalendarPlus, QrCode, Save, TrendingUp } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { StatusTag, Tag } from '../components/ui/Tag.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { MembrosPanel } from '../components/MembrosPanel.jsx'
import { QrFocusOverlay } from '../components/QrFocusOverlay.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  apiObterCelula,
  apiAtualizarCelula,
  apiListarEncontros,
  apiAtualizarEncontro,
  apiEstenderCronograma,
  apiFrequencia
} from '../lib/api.js'
import { formatarDataHora, nomeDiaSemana, paraInputDateTime } from '../lib/datas.js'

const DIAS = [0, 1, 2, 3, 4, 5, 6]
const FREQUENCIAS = [
  { v: 7, label: 'Semanal' },
  { v: 14, label: 'Quinzenal (semana sim, semana não)' },
  { v: 21, label: 'A cada 3 semanas' },
  { v: 28, label: 'Mensal (a cada 4 semanas)' }
]

function CronogramaForm({ celula, onSalvo }) {
  const [form, setForm] = useState({
    nome: celula.nome,
    descricao: celula.descricao || '',
    diaSemana: celula.diaSemana,
    frequenciaDias: celula.frequenciaDias,
    dataPrimeiroEncontro: paraInputDateTime(celula.dataPrimeiroEncontro)
  })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setMsg('')
    try {
      await apiAtualizarCelula(celula.id, {
        nome: form.nome,
        descricao: form.descricao,
        diaSemana: Number(form.diaSemana),
        frequenciaDias: Number(form.frequenciaDias),
        dataPrimeiroEncontro: new Date(form.dataPrimeiroEncontro).toISOString()
      })
      setMsg('Cronograma salvo. Os encontros foram atualizados.')
      onSalvo()
    } catch (e2) {
      setMsg(e2?.response?.data?.erro || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const rotuloSelect =
    'h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'

  return (
    <Card>
      <h2 className="font-semibold text-text">Cronograma da célula</h2>
      <p className="mt-1 text-sm text-text-muted">
        Defina o dia, a frequência e a data do primeiro encontro. O sistema gera os próximos
        automaticamente.
      </p>
      <form className="mt-5 space-y-4" onSubmit={salvar}>
        <Input id="nome" label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
        <Input
          id="descricao"
          label="Descrição (opcional)"
          value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Dia da semana</label>
            <select
              className={rotuloSelect}
              value={form.diaSemana}
              onChange={(e) => set('diaSemana', e.target.value)}
            >
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  {nomeDiaSemana(d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Frequência</label>
            <select
              className={rotuloSelect}
              value={form.frequenciaDias}
              onChange={(e) => set('frequenciaDias', e.target.value)}
            >
              {FREQUENCIAS.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Primeiro encontro</label>
          <input
            type="datetime-local"
            className={rotuloSelect}
            value={form.dataPrimeiroEncontro}
            onChange={(e) => set('dataPrimeiroEncontro', e.target.value)}
          />
        </div>
        <Button type="submit" loading={salvando} className="w-auto px-5">
          <Save className="h-4 w-4" /> Salvar cronograma
        </Button>
        {msg && <p className="text-sm text-text-muted">{msg}</p>}
      </form>
    </Card>
  )
}

function QrCard({ celula }) {
  const url = `${window.location.origin}/c/${celula.qrToken}`
  const [foco, setFoco] = useState(false)
  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2 self-start text-text-muted">
        <QrCode className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">QR Code da célula</h2>
      </div>
      <button
        type="button"
        onClick={() => setFoco(true)}
        aria-label="Ampliar QR Code para apresentação"
        className="rounded-2xl bg-white p-4 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
      >
        <QRCodeCanvas value={url} size={180} fgColor="#1A1A1A" bgColor="#FFFFFF" />
      </button>
      <p className="break-all text-xs text-text-muted">{url}</p>
      <Button variant="secondary" className="w-auto px-5" onClick={() => navigator.clipboard?.writeText(url)}>
        Copiar link
      </Button>
      <QrFocusOverlay open={foco} valorQr={url} nomeCelula={celula.nome} onClose={() => setFoco(false)} />
    </Card>
  )
}

function EncontrosCard({ celulaId }) {
  const [encontros, setEncontros] = useState(null)
  const [estendendo, setEstendendo] = useState(false)

  async function carregar() {
    setEncontros(await apiListarEncontros(celulaId))
  }
  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celulaId])

  async function mudarStatus(id, status) {
    await apiAtualizarEncontro(id, { status })
    carregar()
  }

  async function estender() {
    setEstendendo(true)
    try {
      await apiEstenderCronograma(celulaId, 90)
      await carregar()
    } finally {
      setEstendendo(false)
    }
  }

  if (!encontros) return <Card><Spinner className="py-6" /></Card>

  const ordenados = [...encontros].sort((a, b) => new Date(a.data) - new Date(b.data))

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text">Encontros</h2>
        <Button variant="secondary" className="h-9 w-auto px-3 text-xs" loading={estendendo} onClick={estender}>
          <CalendarPlus className="h-4 w-4" /> Estender
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {ordenados.slice(0, 12).map((e) => (
          <div
            key={e.id}
            className="rounded-xl border border-border px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize text-text">
                  {formatarDataHora(e.data)}
                </p>
                <p className="text-xs text-text-muted">{e._count?.presencas ?? 0} presença(s)</p>
              </div>
              <StatusTag status={e.status} />
            </div>
            {e.status === 'AGENDADO' && (
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => mudarStatus(e.id, 'REALIZADO')}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-success cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Realizado
                </button>
                <button
                  onClick={() => mudarStatus(e.id, 'CANCELADO')}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-danger cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function FrequenciaCard({ celulaId }) {
  const [dados, setDados] = useState(null)
  useEffect(() => {
    apiFrequencia(celulaId).then(setDados).catch(() => setDados({ erro: true }))
  }, [celulaId])

  if (!dados) return <Card><Spinner className="py-6" /></Card>
  if (dados.erro) return null

  return (
    <Card>
      <div className="flex items-center gap-2 text-text-muted">
        <TrendingUp className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">Frequência</h2>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        {dados.totalEncontrosRealizados} encontro(s) realizado(s)
      </p>

      <div className="mt-4 space-y-2">
        {dados.ranking.length === 0 && (
          <p className="text-sm text-text-muted">Ainda sem presenças registradas.</p>
        )}
        {dados.ranking.map((p, i) => (
          <div key={p.userId} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-text">
              <span className="text-text-muted">{i + 1}.</span> {p.nome}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{p.presencas}×</span>
              <Tag variant={p.percentual >= 50 ? 'sucesso' : 'neutro'}>{p.percentual}%</Tag>
            </span>
          </div>
        ))}
      </div>

      {dados.ausentes.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Ausentes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dados.ausentes.map((a) => (
              <Tag key={a.userId} variant="perigo">{a.nome}</Tag>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function CelulaDetalhe() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()
  const [celula, setCelula] = useState(null)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)

  async function carregar() {
    try {
      setCelula(await apiObterCelula(id))
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível carregar a célula.')
    }
  }
  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (erro)
    return <Card className="text-center text-danger">{erro}</Card>

  if (!celula)
    return <Spinner className="py-16" />

  const aba = params.get('tab') === 'membros' ? 'membros' : 'informacoes'
  const ehAdmin = usuario?.papel === 'ADMIN'

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">{celula.nome}</h1>
        {celula.descricao && <p className="mt-1 text-sm text-text-muted">{celula.descricao}</p>}
        <p className="mt-1 text-sm text-text-muted">
          {nomeDiaSemana(celula.diaSemana)} · {celula._count?.membros ?? 0} membro(s)
        </p>
      </div>

      <div className="mb-5 flex gap-1 border-b border-border">
        {[
          { id: 'informacoes', label: 'Informações' },
          { id: 'membros', label: 'Membros' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams(t.id === 'membros' ? { tab: 'membros' } : {})}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.id ? 'border-brand text-text' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'informacoes' ? (
        <div className="space-y-5">
          <CronogramaForm celula={celula} onSalvo={() => { carregar(); setVersao((v) => v + 1) }} />
          <QrCard celula={celula} />
          <EncontrosCard key={`enc-${versao}`} celulaId={celula.id} />
          <FrequenciaCard key={`freq-${versao}`} celulaId={celula.id} />
        </div>
      ) : (
        <MembrosPanel celulaId={celula.id} liderId={celula.liderId} podeGerenciar={ehAdmin} />
      )}
    </>
  )
}
