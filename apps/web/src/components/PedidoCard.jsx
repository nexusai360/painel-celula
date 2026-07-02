import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoreVertical, Pencil, Trash2, HandHeart, ChevronDown, ChevronUp } from 'lucide-react'
import { formatarDataCurta } from '../lib/datas.js'

export function PedidoCard({ pedido, onEditar, onExcluir, onTestemunhar }) {
  const [aberto, setAberto] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onClickFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false)
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  const temDetalhes = !!pedido.detalhes

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="min-w-0 truncate font-medium text-text">{pedido.titulo}</h3>
            <span className="shrink-0 text-xs text-text-muted">{formatarDataCurta(pedido.criadoEm)}</span>
            {pedido.status === 'ATENDIDO' && (
              <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">Realizado</span>
            )}
          </div>
          {temDetalhes && (
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
            >
              Ver detalhes {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button" aria-label="Opções" onClick={() => setMenu((v) => !v)}
            className="rounded-lg p-1 text-text-muted hover:bg-surface hover:text-text"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface"
                onClick={() => { setMenu(false); onEditar(pedido) }}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              {!pedido.testemunhado && (
                <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface"
                  onClick={() => { setMenu(false); onTestemunhar(pedido) }}>
                  <HandHeart className="h-4 w-4" /> Dar Testemunho
                </button>
              )}
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface"
                onClick={() => { setMenu(false); onExcluir(pedido) }}>
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {aberto && temDetalhes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-surface"
          >
            <p className="whitespace-pre-wrap px-4 py-3 text-sm text-text-muted">{pedido.detalhes}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
