import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiBanner } from '../lib/api.js'

/**
 * BannerBar — exibe o aviso ativo abaixo do cabeçalho para todos os aprovados.
 * A publicação/edição do aviso vive na área de Administração (/app/admin/avisos).
 */
export function BannerBar() {
  const { usuario } = useAuth()
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (usuario?.aprovado === false) return
    apiBanner().then((b) => setMensagem(b?.mensagem || '')).catch(() => {})
  }, [usuario])

  if (usuario?.aprovado === false || !mensagem) return null

  return (
    <div className="border-b border-brand/20 bg-brand/10">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-2 text-sm text-text">
        <Megaphone className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <p className="min-w-0 flex-1">{mensagem}</p>
      </div>
    </div>
  )
}
