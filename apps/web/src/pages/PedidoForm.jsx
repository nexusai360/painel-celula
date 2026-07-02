import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { pedidoCreateSchema } from '@icelula/shared'
import { apiCriarPedido, apiAtualizarPedido, apiTestemunhar, apiListarPedidos } from '../lib/api.js'
import { formatarDataCurta } from '../lib/datas.js'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'

const CITACAO = '"Entregue o seu caminho ao Senhor; confie nele, e ele agirá." – Salmos 37:5'

export default function PedidoForm() {
  const { id } = useParams()
  const editando = !!id
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const [erro, setErro] = useState('')
  const {
    register, handleSubmit, watch, reset, formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(pedidoCreateSchema), defaultValues: { titulo: '', detalhes: '' } })

  useEffect(() => {
    if (!editando) return
    apiListarPedidos().then((lista) => {
      const p = lista.find((x) => x.id === id)
      if (p) { setPedido(p); reset({ titulo: p.titulo, detalhes: p.detalhes || '' }) }
    })
  }, [id, editando, reset])

  const titulo = watch('titulo') || ''
  const detalhes = watch('detalhes') || ''

  async function salvar(dados, testemunhar) {
    setErro('')
    const payload = { titulo: dados.titulo, detalhes: dados.detalhes || undefined }
    try {
      if (editando) {
        await apiAtualizarPedido(id, payload)
        if (testemunhar) await apiTestemunhar(id)
      } else {
        await apiCriarPedido({ ...payload, testemunhar })
      }
      navigate('/app/pedidos')
    } catch {
      setErro('Não foi possível salvar o pedido. Tente novamente.')
    }
  }

  const dataExibida = pedido ? formatarDataCurta(pedido.criadoEm) : formatarDataCurta(new Date().toISOString())
  const jaTestemunhado = !!pedido?.testemunhado

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold text-text">{editando ? 'Editar pedido de oração' : 'Novo pedido de oração'}</h1>
      <p className="mt-1 text-sm italic text-text-muted">{CITACAO}</p>

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit((d) => salvar(d, false))}>
        <div>
          <div className="relative">
            <Input id="titulo" placeholder="Título..." maxLength={100} {...register('titulo')} error={errors.titulo?.message} />
            <span className="pointer-events-none absolute right-3 top-3.5 text-xs text-text-muted">{titulo.length}/100</span>
          </div>
        </div>

        <div className="relative">
          <textarea
            id="detalhes" placeholder="Detalhes..." maxLength={500} rows={8}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...register('detalhes')}
          />
          <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-text-muted">{detalhes.length}/500</span>
        </div>

        {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" loading={isSubmitting} className="!w-auto px-6">Salvar</Button>
          {!jaTestemunhado && (
            <Button type="button" variant="primary" className="!w-auto px-6"
              onClick={handleSubmit((d) => salvar(d, true))}>Dar Testemunho</Button>
          )}
          <span className="ml-auto text-sm text-text-muted">{dataExibida}</span>
        </div>
      </form>
    </div>
  )
}
