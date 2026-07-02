import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usuarioAdminUpdateSchema } from '@icelula/shared'
import { apiAtualizarMembro } from '../lib/api.js'
import { Input } from './ui/Input.jsx'
import { Button } from './ui/Button.jsx'

export function MembroEditModal({ membro, open, onSalvo, onCancelar }) {
  const [erro, setErro] = useState(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(usuarioAdminUpdateSchema) })

  useEffect(() => {
    if (membro) reset({ nome: membro.nome || '', email: membro.email || '', whatsapp: membro.whatsapp || '' })
  }, [membro, reset])

  async function salvar(dados) {
    setErro(null)
    try {
      const atualizado = await apiAtualizarMembro(membro.id, {
        nome: dados.nome, email: dados.email, whatsapp: dados.whatsapp || ''
      })
      onSalvo(atualizado)
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível salvar. Tente novamente.')
    }
  }

  return (
    <AnimatePresence>
      {open && membro && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancelar} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <motion.div role="dialog" aria-modal="true"
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <h2 className="mb-4 text-lg font-semibold text-text">Editar membro</h2>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit(salvar)}>
                <Input id="nome" label="Nome" {...register('nome')} error={errors.nome?.message} />
                <Input id="whatsapp" label="WhatsApp" placeholder="(62) 99999-9999" {...register('whatsapp')} error={errors.whatsapp?.message} />
                <Input id="email" label="E-mail" {...register('email')} error={errors.email?.message} />
                {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
                <div className="mt-3 flex gap-3">
                  <Button variant="secondary" type="button" onClick={onCancelar}>Cancelar</Button>
                  <Button variant="primary" type="submit" loading={isSubmitting}>Salvar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
