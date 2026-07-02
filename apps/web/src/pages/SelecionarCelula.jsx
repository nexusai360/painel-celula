import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users2 } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { SkeletonLinhas, EmptyState, ErrorState } from '../components/ui/Estados.jsx'
import { CelulaPicker } from '../components/CelulaPicker.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiCelulasPublicas, apiSelecionarCelula } from '../lib/api.js'

export default function SelecionarCelula() {
  const { aplicarUsuario } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [celulas, setCelulas] = useState(null)
  const [erro, setErro] = useState(false)
  const [selecionada, setSelecionada] = useState(null)
  const [salvando, setSalvando] = useState(false)

  function carregar() {
    setErro(false)
    apiCelulasPublicas().then(setCelulas).catch(() => setErro(true))
  }
  useEffect(() => { carregar() }, [])

  async function confirmar() {
    if (!selecionada) return
    setSalvando(true)
    try {
      const u = await apiSelecionarCelula(selecionada)
      aplicarUsuario(u)
      navigate('/app/aguardando', { replace: true })
    } catch (e) {
      toast.erro(e?.response?.data?.erro || 'Não foi possível selecionar a célula.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-text">Qual célula você participa?</h1>
        <p className="mt-1 text-sm text-text-muted">Escolha a sua célula para pedir acesso. Um líder vai confirmar você.</p>
      </div>

      {erro ? (
        <ErrorState onRetry={carregar} />
      ) : !celulas ? (
        <SkeletonLinhas n={3} />
      ) : celulas.length === 0 ? (
        <EmptyState
          icon={Users2}
          titulo="Nenhuma célula disponível"
          subtitulo="Fale com a liderança para cadastrar a sua célula."
        />
      ) : (
        <CelulaPicker celulas={celulas} selecionada={selecionada} onSelecionar={setSelecionada} />
      )}

      <div className="mt-6">
        <Button onClick={confirmar} loading={salvando} disabled={!selecionada}>
          Confirmar célula
        </Button>
      </div>
    </div>
  )
}
