import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'

export function ProtectedRoute({ children }) {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  if (!usuario) return <Navigate to="/entrar" replace />

  return children
}
