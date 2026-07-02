import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastCtx = createContext(null)

const ICONES = { sucesso: CheckCircle2, erro: AlertCircle, info: Info }
const CORES = {
  sucesso: 'text-emerald-600 dark:text-emerald-400',
  erro: 'text-danger',
  info: 'text-brand',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remover = useCallback((id) => setToasts((l) => l.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (tipo, msg) => {
      const id = ++idRef.current
      setToasts((l) => [...l, { id, tipo, msg }])
      setTimeout(() => remover(id), 4000)
    },
    [remover],
  )

  const api = useRef({
    sucesso: (m) => push('sucesso', m),
    erro: (m) => push('erro', m),
    info: (m) => push('info', m),
  }).current

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[1000] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const Icon = ICONES[t.tipo]
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-lg"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${CORES[t.tipo]}`} aria-hidden="true" />
              <p className="flex-1 text-sm text-text">{t.msg}</p>
              <button
                type="button"
                onClick={() => remover(t.id)}
                aria-label="Fechar aviso"
                className="text-text-muted hover:text-text cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) return { sucesso: () => {}, erro: () => {}, info: () => {} }
  return ctx
}
