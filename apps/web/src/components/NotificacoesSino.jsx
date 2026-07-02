import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiNotificacoes, apiLerNotificacao, apiLerTodasNotificacoes } from '../lib/api.js'
import { Modal } from './ui/Modal.jsx'

function quando(iso) {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

// Sino: leitura de notificações POR ITEM + "marcar tudo como lido" + modal de leitura.
export function NotificacoesSino() {
  const { usuario } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState({ notificacoes: [], naoLidas: 0 })
  const [lendo, setLendo] = useState(null)
  const ref = useRef(null)

  async function carregar() {
    try { setDados(await apiNotificacoes()) } catch { /* ignore */ }
  }
  useEffect(() => {
    if (usuario?.aprovado === false) return
    carregar()
    const t = setInterval(carregar, 60000)
    return () => clearInterval(t)
  }, [usuario])

  useEffect(() => {
    if (!aberto) return
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [aberto])

  function marcarLidaLocal(id) {
    setDados((d) => ({
      ...d,
      naoLidas: d.notificacoes.filter((n) => !n.lida && n.id !== id).length,
      notificacoes: d.notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)),
    }))
  }

  async function abrirNotificacao(n) {
    setLendo(n)
    setAberto(false)
    if (!n.lida) {
      await apiLerNotificacao(n.id).catch(() => {})
      marcarLidaLocal(n.id)
    }
  }

  async function marcarTudo() {
    await apiLerTodasNotificacoes().catch(() => {})
    setDados((d) => ({ ...d, naoLidas: 0, notificacoes: d.notificacoes.map((n) => ({ ...n, lida: true })) }))
  }

  if (usuario?.aprovado === false) return null

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setAberto((v) => !v)} aria-label="Notificações"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer">
        <Bell className="h-5 w-5" />
        {dados.naoLidas > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-on-brand">
            {dados.naoLidas > 9 ? '9+' : dados.naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-border bg-card p-2 shadow-lg z-30">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold text-text">Notificações</span>
            {dados.naoLidas > 0 && (
              <button type="button" onClick={marcarTudo}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-brand hover:bg-surface cursor-pointer">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar tudo
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {dados.notificacoes.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-text-muted">Nenhuma notificação.</p>
            ) : dados.notificacoes.map((n) => (
              <button key={n.id} type="button" onClick={() => abrirNotificacao(n)}
                className={`block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface cursor-pointer ${n.lida ? '' : 'bg-brand/5'}`}>
                <div className="flex items-center gap-2">
                  {!n.lida && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />}
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{n.titulo}</p>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{n.corpo}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">{n.autorNome ? `${n.autorNome} · ` : ''}{quando(n.criadoEm)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal open={!!lendo} onClose={() => setLendo(null)} titulo={lendo?.titulo} size="sm">
        <div className="space-y-3 p-5">
          <p className="whitespace-pre-wrap text-sm text-text">{lendo?.corpo}</p>
          <p className="text-xs text-text-muted">
            {lendo?.autorNome ? `Enviado por ${lendo.autorNome} · ` : ''}{quando(lendo?.criadoEm)}
          </p>
        </div>
      </Modal>
    </div>
  )
}
