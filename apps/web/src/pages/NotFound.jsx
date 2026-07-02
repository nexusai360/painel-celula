import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { Card } from '../components/ui/Card.jsx'

export default function NotFound() {
  return (
    <AuthLayout>
      <Card className="text-center">
        <h1 className="text-2xl font-bold text-text">Página não encontrada</h1>
        <p className="mt-2 text-sm text-text-muted">
          O endereço que você acessou não existe.
        </p>
        <Link
          to="/entrar"
          className="mt-5 inline-block font-medium text-brand hover:underline"
        >
          Ir para o início
        </Link>
      </Card>
    </AuthLayout>
  )
}
