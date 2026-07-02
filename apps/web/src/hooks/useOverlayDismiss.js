import { useEffect, useRef } from 'react'

/**
 * Base de overlays (Sheet, Modal): scroll-lock do body, foco inicial no painel,
 * restauração de foco ao fechar, Esc→onClose e focus-trap Tab/Shift+Tab.
 * Agnóstico de props visuais — só recebe o ref do painel.
 */
export function useOverlayDismiss(open, onClose, panelRef) {
  const previousFocusRef = useRef(null)

  // Scroll-lock + foco inicial + restauração
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => panelRef.current?.focus())
    } else {
      document.body.style.overflow = ''
      if (previousFocusRef.current) {
        previousFocusRef.current.focus?.()
        previousFocusRef.current = null
      }
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, panelRef])

  // Esc + focus-trap
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current
        if (!panel) return
        const selector =
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
        const focusable = Array.from(panel.querySelectorAll(selector))
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (e.shiftKey) {
          if (active === first || active === panel) {
            e.preventDefault()
            last.focus()
          }
        } else if (active === last || active === panel) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, panelRef])
}
