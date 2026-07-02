import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card } from '../components/ui/Card.jsx'
import { apiCelulaPublica, apiCheckinQr } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { BotaoGoogle } from '../components/BotaoGoogle.jsx'

export default function QrLanding() {
  const { qrToken } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const toast = useToast()
  const [celula, setCelula] = useState(null)
  const [estado, setEstado] = useState('carregando') // carregando | ok | erro

  useEffect(() => {
    if (!usuario) return
    // Já logado (ramo "com conta"): marca presença e mostra o resultado antes de seguir.
    apiCheckinQr(qrToken)
      .then((r) => {
        if (r?.presenca) toast.sucesso('Presença registrada!')
        else if (r?.motivo) toast.info(r.motivo)
      })
      .catch((e) => {
        const msg = e?.response?.data?.erro
        if (msg) toast.info(msg)
      })
      .finally(() => navigate('/app', { replace: true }))
  }, [usuario, qrToken, navigate, toast])

  useEffect(() => {
    let ativo = true
    apiCelulaPublica(qrToken)
      .then((c) => ativo && (setCelula(c), setEstado('ok')))
      .catch(() => ativo && setEstado('erro'))
    return () => {
      ativo = false
    }
  }, [qrToken])

  return (
    <AuthLayout>
      <Card>
        {estado === 'carregando' && (
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-surface" />
            <div className="h-6 w-40 animate-pulse rounded bg-surface" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-surface" />
          </div>
        )}

        {estado === 'erro' && (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-text">Célula não encontrada</h1>
            <p className="mt-2 text-sm text-text-muted">
              Este QR Code não corresponde a uma célula ativa. Confira com seu líder.
            </p>
          </div>
        )}

        {estado === 'ok' && (
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-brand">
              Bem-vindo(a) à célula
            </p>
            <h1 className="mt-1 text-2xl font-bold text-text">{celula.nome}</h1>
            <p className="mt-2 text-sm text-text-muted">
              Entre ou crie sua conta para marcar presença, enviar pedidos de oração e
              acompanhar a vida da célula.
            </p>

            <div className="mt-6 space-y-3">
              <Button onClick={() => navigate(`/cadastro?celula=${qrToken}`)}>
                <UserPlus className="h-4 w-4" /> Criar minha conta
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/entrar?celula=${qrToken}`)}>
                <LogIn className="h-4 w-4" /> Já tenho conta
              </Button>
              <BotaoGoogle contexto="login" qrToken={qrToken} />
            </div>
          </div>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-text-muted">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
