import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiNotificacoes, apiLerNotificacoes } from '../lib/api.js'

function quando(iso) {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

// Sino: SÓ leitura de notificações. O envio vive na área de Administração › Avisos.
export function NotificacoesSino() {
  const { usuario } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState({ notificacoes: [], naoLidas: 0 })
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

  async function abrir() {
    setAberto((v) => !v)
    if (!aberto && dados.naoLidas > 0) {
      await apiLerNotificacoes().catch(() => {})
      setDados((d) => ({ ...d, naoLidas: 0, notificacoes: d.notificacoes.map((n) => ({ ...n, lida: true })) }))
    }
  }

  if (usuario?.aprovado === false) return null

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={abrir} aria-label="Notificações"
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
          <div className="px-2 py-1.5">
            <span className="text-sm font-semibold text-text">Notificações</span>
          </div>
          <div className="max-h-80 overflow-auto">
            {dados.notificacoes.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-text-muted">Nenhuma notificação.</p>
            ) : dados.notificacoes.map((n) => (
              <div key={n.id} className={`rounded-lg px-2.5 py-2 ${n.lida ? '' : 'bg-brand/5'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-text">{n.titulo}</p>
                  {n.escopo === 'GLOBAL' && <span className="shrink-0 rounded-full bg-brand/15 px-1.5 text-[10px] font-semibold text-brand">Geral</span>}
                </div>
                <p className="mt-0.5 text-sm text-text-muted">{n.corpo}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">{n.autorNome ? `${n.autorNome} · ` : ''}{quando(n.criadoEm)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
