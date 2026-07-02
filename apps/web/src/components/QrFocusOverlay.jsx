import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'

export function QrFocusOverlay({ open, valorQr, nomeCelula, onClose }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} role="dialog" aria-modal="true"
        >
          <motion.div
            className="rounded-3xl bg-white p-6 shadow-2xl"
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeCanvas value={valorQr} size={280} fgColor="#1A1A1A" bgColor="#FFFFFF" />
          </motion.div>
          {nomeCelula && <p className="text-lg font-semibold text-white">{nomeCelula}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
