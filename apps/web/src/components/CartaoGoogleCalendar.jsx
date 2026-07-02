import { useState } from 'react'
import { Check, Link as LinkIcon, Unlink } from 'lucide-react'
import { Card } from './ui/Card.jsx'
import { Button } from './ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useConfig } from '../context/ConfigContext.jsx'
import { apiGoogleAuthUrl, apiDesconectarGoogle, getToken } from '../lib/api.js'

export function CartaoGoogleCalendar() {
  const { usuario, aplicarToken } = useAuth()
  const { googleHabilitado } = useConfig()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  if (!googleHabilitado) return null

  async function conectar() {
    setSalvando(true)
    setErro('')
    try {
      const { url } = await apiGoogleAuthUrl('conectar')
      window.location.href = url
    } catch {
      setErro('Não foi possível iniciar a conexão com o Google.')
      setSalvando(false)
    }
  }

  async function desconectar() {
    setSalvando(true)
    setErro('')
    try {
      await apiDesconectarGoogle()
      await aplicarToken(getToken())
    } catch {
      setErro('Não foi possível desconectar o Google Calendar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Google Calendar</p>
          <p className="mt-1 text-sm text-text-muted">
            {usuario?.googleConectado
              ? 'Seus encontros são sincronizados automaticamente.'
              : 'Sincronize os encontros da sua célula com o Google Calendar.'}
          </p>
        </div>
        {usuario?.googleConectado && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
            <Check className="h-3.5 w-3.5" /> Vinculado
          </span>
        )}
      </div>

      {usuario?.googleConectado ? (
        <Button variant="secondary" loading={salvando} onClick={desconectar}>
          <Unlink className="h-4 w-4" /> Desvincular Google Calendar
        </Button>
      ) : (
        <Button variant="secondary" loading={salvando} onClick={conectar}>
          <LinkIcon className="h-4 w-4" /> Vincular Google Calendar
        </Button>
      )}

      {erro && <p role="alert" className="text-xs text-danger">{erro}</p>}
    </Card>
  )
}
