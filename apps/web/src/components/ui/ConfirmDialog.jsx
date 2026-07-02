import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './Button.jsx'

export function ConfirmDialog({
  open,
  titulo = 'Confirmar',
  mensagem,
  confirmarLabel = 'Confirmar',
  onConfirmar,
  onCancelar,
  carregando = false
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancelar} aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <motion.div
              role="dialog" aria-modal="true"
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            >
              <h2 className="text-lg font-semibold text-text">{titulo}</h2>
              {mensagem && <p className="mt-2 text-sm text-text-muted">{mensagem}</p>}
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
                <Button variant="primary" loading={carregando} onClick={onConfirmar}>{confirmarLabel}</Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
