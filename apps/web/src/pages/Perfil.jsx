import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LogOut, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiAtualizarPerfil } from '../lib/api.js'
import { formatarWhatsapp } from '../lib/whatsapp.js'
import { mapearErroCampos } from '../lib/erros.js'
import { ROTULO_PAPEL } from '../lib/papeis.js'
import { AvatarUpload } from '../components/AvatarUpload.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card } from '../components/ui/Card.jsx'

export default function Perfil() {
  const { usuario, aplicarUsuario, sair } = useAuth()

  // Avatar is managed outside react-hook-form (it's a data URL, not a text field)
  const [avatarUrl, setAvatarUrl] = useState(usuario?.avatar ?? null)
  const [sucesso, setSucesso] = useState(false)
  const [erroGeral, setErroGeral] = useState(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      nome: usuario?.nome ?? '',
      // Pre-fill with the formatted display value; we strip to digits on submit
      whatsapp: formatarWhatsapp(usuario?.whatsapp ?? ''),
    },
  })

  async function onSubmit(valores) {
    setSucesso(false)
    setErroGeral(null)

    // Strip formatting — send raw digits (or null to clear)
    const whatsappRaw = valores.whatsapp.replace(/\D/g, '') || null

    try {
      const usuarioAtualizado = await apiAtualizarPerfil({
        nome: valores.nome,
        whatsapp: whatsappRaw,
        avatar: avatarUrl,
      })
      aplicarUsuario(usuarioAtualizado)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch (e) {
      const campos = mapearErroCampos(e.response?.data?.detalhes)
      const temCampo = Object.keys(campos).length > 0
      if (temCampo) {
        for (const [campo, msg] of Object.entries(campos)) {
          setError(campo, { message: msg })
        }
      } else {
        setErroGeral(e.response?.data?.erro ?? 'Erro ao salvar. Tente novamente.')
      }
    }
  }

  const papelLabel = ROTULO_PAPEL[usuario?.papel] ?? usuario?.papel ?? ''

  return (
    <div className="px-4 pt-6">
      <div className="mx-auto max-w-md space-y-5">

        {/* Page title */}
        <h1 className="font-display text-2xl font-bold text-text text-center">
          Perfil
        </h1>

        {/* ── Profile form card ── */}
        <Card className="space-y-0">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Avatar upload — centred at the top of the card */}
            <div className="flex justify-center pb-6 pt-2">
              <AvatarUpload
                value={avatarUrl}
                nome={usuario?.nome}
                onChange={setAvatarUrl}
              />
            </div>

            <div className="space-y-4">
              {/* Name */}
              <Input
                id="nome"
                label="Nome"
                autoComplete="name"
                error={errors.nome?.message}
                {...register('nome', { required: 'Nome é obrigatório' })}
              />

              {/* WhatsApp */}
              <Input
                id="whatsapp"
                label="WhatsApp"
                type="tel"
                placeholder="(62) 99999-9999"
                autoComplete="tel"
                inputMode="tel"
                error={errors.whatsapp?.message}
                {...register('whatsapp')}
              />

              {/* Email — read-only */}
              <div className="w-full">
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-text"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={usuario?.email ?? ''}
                  readOnly
                  aria-readonly="true"
                  className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text-muted cursor-default select-all focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-text-muted">
                  O e-mail não pode ser alterado aqui.
                </p>
              </div>

              {/* Papel badge */}
              <div className="flex items-center gap-2 py-1">
                <span className="text-sm font-medium text-text">Perfil:</span>
                <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/20">
                  {papelLabel}
                </span>
              </div>

              {/* General error */}
              {erroGeral && (
                <p role="alert" aria-live="assertive" className="text-sm text-danger">
                  {erroGeral}
                </p>
              )}

              {/* Success feedback */}
              {sucesso && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success"
                >
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Salvo!
                </div>
              )}

              {/* Save */}
              <Button type="submit" loading={isSubmitting}>
                Salvar
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Logout — visually separated from the rest ── */}
        <div className="pt-2">
          <button
            type="button"
            onClick={sair}
            aria-label="Sair da conta"
            className="inline-flex h-12 w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Sair
          </button>
        </div>

      </div>
    </div>
  )
}
