import { useEffect, useState } from 'react'
import { Megaphone, Pencil, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ehAdmin } from '../lib/papeis.js'
import { apiBanner, apiBannerAdmin, apiSalvarBanner } from '../lib/api.js'

/**
 * BannerBar — aviso administrativo fixo abaixo do cabeçalho.
 * Todos os aprovados veem o aviso ativo. ADMIN+ tem o editor inline.
 */
export function BannerBar() {
  const { usuario } = useAuth()
  const admin = ehAdmin(usuario?.papel)
  const [mensagem, setMensagem] = useState('')
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState({ mensagem: '', ativo: false })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (usuario?.aprovado === false) return
    apiBanner().then((b) => setMensagem(b?.mensagem || '')).catch(() => {})
  }, [usuario])

  async function abrirEditor() {
    try { setRascunho(await apiBannerAdmin()) } catch { /* ignore */ }
    setEditando(true)
  }
  async function salvar() {
    setSalvando(true)
    try {
      const b = await apiSalvarBanner(rascunho.mensagem, rascunho.ativo)
      setMensagem(b.ativo ? b.mensagem : '')
      setEditando(false)
    } finally { setSalvando(false) }
  }

  if (usuario?.aprovado === false) return null
  if (!mensagem && !admin) return null

  return (
    <>
      {mensagem && (
        <div className="border-b border-brand/20 bg-brand/10">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-2 text-sm text-text">
            <Megaphone className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <p className="min-w-0 flex-1">{mensagem}</p>
            {admin && (
              <button onClick={abrirEditor} aria-label="Editar aviso" className="shrink-0 text-text-muted hover:text-brand cursor-pointer">
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {admin && !mensagem && (
        <div className="mx-auto max-w-3xl px-5 pt-3">
          <button onClick={abrirEditor} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:border-brand hover:text-brand cursor-pointer">
            <Megaphone className="h-3.5 w-3.5" /> Publicar um aviso
          </button>
        </div>
      )}

      {editando && admin && (
        <div className="mx-auto max-w-3xl px-5 pt-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-text">Aviso da plataforma</span>
              <button onClick={() => setEditando(false)} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <textarea
              value={rascunho.mensagem}
              onChange={(e) => setRascunho((r) => ({ ...r, mensagem: e.target.value }))}
              rows={2}
              placeholder="Ex.: Neste sábado teremos culto especial às 19h."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <div className="mt-3 flex items-center justify-between">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={rascunho.ativo} onChange={(e) => setRascunho((r) => ({ ...r, ativo: e.target.checked }))} />
                Exibir para todos
              </label>
              <button onClick={salvar} disabled={salvando} className="brand-grad rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50 cursor-pointer">
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
