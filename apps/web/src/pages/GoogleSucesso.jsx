import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function GoogleSucesso() {
  const navigate = useNavigate()
  const { aplicarToken } = useAuth()

  useEffect(() => {
    const hash = window.location.hash // e.g. "#token=eyJ..."
    const params = new URLSearchParams(hash.slice(1)) // strip leading "#"
    const token = params.get('token')

    if (!token) {
      navigate('/entrar', { replace: true })
      return
    }

    aplicarToken(token)
      .then(() => navigate('/app', { replace: true }))
      .catch(() => navigate('/entrar', { replace: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner />
        <p className="text-sm text-text-muted">Entrando com Google…</p>
      </div>
    </div>
  )
}
