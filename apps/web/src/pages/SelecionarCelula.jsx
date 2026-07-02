import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, MapPin } from 'lucide-react'
import { Card } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { Avatar } from '../components/ui/Avatar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiCelulasPublicas, apiSelecionarCelula } from '../lib/api.js'
import { nomeDiaSemana } from '../lib/datas.js'

const FREQ = { 7: 'Semanal', 14: 'Quinzenal', 28: 'Mensal' }

function horaDe(iso) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function SelecionarCelula() {
  const { aplicarUsuario } = useAuth()
  const navigate = useNavigate()
  const [celulas, setCelulas] = useState(null)
  const [erro, setErro] = useState('')
  const [selecionada, setSelecionada] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    apiCelulasPublicas().then(setCelulas).catch(() => setErro('Não foi possível carregar as células.'))
  }, [])

  async function confirmar() {
    if (!selecionada) return
    setSalvando(true); setErro('')
    try {
      const u = await apiSelecionarCelula(selecionada)
      aplicarUsuario(u)
      navigate('/app/aguardando', { replace: true })
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível selecionar a célula.')
    } finally { setSalvando(false) }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-text">Qual célula você participa?</h1>
        <p className="mt-1 text-sm text-text-muted">Escolha a sua célula para pedir acesso. Um líder vai confirmar você.</p>
      </div>

      {erro && <p className="mb-3 text-center text-sm text-danger" role="alert">{erro}</p>}

      {!celulas ? (
        <Spinner className="py-16" />
      ) : celulas.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-muted">Nenhuma célula disponível no momento.</Card>
      ) : (
        <div className="space-y-3">
          {celulas.map((c) => {
            const ativa = selecionada === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelecionada(c.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  ativa ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-border bg-card hover:border-brand-soft'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{c.nome}</p>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {nomeDiaSemana(c.diaSemana)} às {horaDe(c.dataPrimeiroEncontro)} · {FREQ[c.frequenciaDias] || ''}
                    </p>
                    {c.bairro && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-text-muted">
                        <MapPin className="h-3.5 w-3.5" /> {c.bairro}
                      </p>
                    )}
                  </div>
                  <span className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${ativa ? 'border-brand bg-brand text-on-brand' : 'border-border text-transparent'}`}>
                    <Check className="h-4 w-4" />
                  </span>
                </div>

                {c.lideres?.length > 0 && (
                  <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
                    {c.lideres.map((l, i) => (
                      <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                        <Avatar src={l.avatar} nome={l.nome} size={44} />
                        <span className="w-full truncate text-xs text-text-muted">{l.nome?.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6">
        <Button onClick={confirmar} loading={salvando} disabled={!selecionada}>Confirmar célula</Button>
      </div>
    </div>
  )
}
