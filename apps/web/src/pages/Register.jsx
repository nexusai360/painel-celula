import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { registerSchema } from '@icelula/shared'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { BotaoGoogle } from '../components/BotaoGoogle.jsx'

export default function Register() {
  const { cadastrar } = useAuth()
  const [params] = useSearchParams()
  const qrToken = params.get('celula') || undefined
  const [erroApi, setErroApi] = useState('')
  const [pendente, setPendente] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { qrToken } })

  async function onSubmit(dados) {
    setErroApi('')
    try {
      const r = await cadastrar({ ...dados, qrToken })
      setPendente(r?.mensagem || 'Conta criada! Aguarde a aprovação de um administrador.')
    } catch (e) {
      setErroApi(e?.response?.data?.erro || 'Não foi possível criar a conta. Tente novamente.')
    }
  }

  if (pendente) {
    return (
      <AuthLayout>
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <MailCheck className="h-7 w-7 text-success" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-text">Conta criada!</h1>
          <p className="mt-2 text-sm text-text-muted">{pendente}</p>
          <Link
            to="/entrar"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-text transition-colors hover:border-brand hover:text-brand"
          >
            Voltar para o login
          </Link>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card>
        <h1 className="text-xl font-bold text-text">Criar conta</h1>
        <p className="mt-1 text-sm text-text-muted">
          {qrToken
            ? 'Você entrará automaticamente na célula do convite.'
            : 'Preencha seus dados para começar.'}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            id="nome"
            label="Nome completo"
            autoComplete="name"
            placeholder="Seu nome"
            error={errors.nome?.message}
            {...register('nome')}
          />
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
            autoComplete="new-password"
            placeholder="Mínimo de 6 caracteres"
            error={errors.senha?.message}
            {...register('senha')}
          />

          {erroApi && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erroApi}
            </p>
          )}

          <Button type="submit" loading={isSubmitting}>
            Criar conta
          </Button>

          <BotaoGoogle contexto="login" qrToken={qrToken} />
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-text-muted">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
