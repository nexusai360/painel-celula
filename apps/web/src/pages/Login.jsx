import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { loginSchema } from '@icelula/shared'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { BotaoGoogle } from '../components/BotaoGoogle.jsx'

export default function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [erroApi, setErroApi] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(loginSchema) })

  async function onSubmit(dados) {
    setErroApi('')
    try {
      await entrar(dados)
      navigate('/app', { replace: true })
    } catch (e) {
      setErroApi(e?.response?.data?.erro || 'Não foi possível entrar. Tente novamente.')
    }
  }

  return (
    <AuthLayout>
      <Card>
        <h1 className="text-xl font-bold text-text">Entrar</h1>
        <p className="mt-1 text-sm text-text-muted">Que bom te ver de novo.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            id="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="senha"
            label="Senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.senha?.message}
            {...register('senha')}
          />

          {erroApi && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erroApi}
            </p>
          )}

          <Button type="submit" loading={isSubmitting}>
            Entrar
          </Button>

          <BotaoGoogle contexto="login" />
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-text-muted">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  )
}
