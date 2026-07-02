import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss.js'

const DRAG_DISMISS_THRESHOLD = 80 // px puxado para baixo para fechar

function usePrefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function Sheet({ open, onClose, tituloId, children }) {
  const sheetRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  // Scroll-lock + focus-trap + Esc + restauração de foco (base compartilhada com Modal)
  useOverlayDismiss(open, onClose, sheetRef)

  // Variantes de animação — sem slide quando reduced-motion
  const sheetVariants = reducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        hidden: { y: '100%', opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
          transition: { type: 'spring', stiffness: 400, damping: 35 },
        },
        exit: {
          y: '100%',
          opacity: 0,
          transition: { duration: 0.2, ease: 'easeIn' },
        },
      }

  const scrimVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  }

  function handleDragEnd(_, info) {
    if (info.offset.y > DRAG_DISMISS_THRESHOLD) onClose?.()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            key="sheet-scrim"
            className="fixed inset-0 z-40 bg-black/50"
            variants={scrimVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet panel */}
          <motion.div
            key="sheet-panel"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            tabIndex={-1}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-card outline-none"
            style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.18)' }}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={reducedMotion ? false : 'y'}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={reducedMotion ? undefined : handleDragEnd}
          >
            {/* Drag handle visual */}
            {!reducedMotion && (
              <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
