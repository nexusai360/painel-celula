import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Popover ancorado. O painel é renderizado em portal (document.body) com
 * posição `fixed` calculada a partir do trigger — assim NUNCA é cortado por
 * containers com overflow (ex.: dentro de um Modal). Fecha em outside-click/Esc.
 * `align` 'start'|'end'; `matchWidth` faz o painel ter a largura do trigger.
 */
export function Popover({ trigger, children, open, onOpenChange, align = 'start', matchWidth = false, className = '' }) {
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const el = triggerRef.current
    function place() {
      const r = el.getBoundingClientRect()
      setPos({ top: r.bottom + 8, left: r.left, right: window.innerWidth - r.right, width: r.width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (triggerRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      onOpenChange?.(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') onOpenChange?.(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  return (
    <div ref={triggerRef} className="relative inline-flex">
      {trigger}
      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          style={{
            position: 'fixed',
            top: pos.top,
            ...(align === 'end' ? { right: pos.right } : { left: pos.left }),
            ...(matchWidth ? { width: pos.width } : {}),
          }}
          className={`z-[200] min-w-[12rem] rounded-xl border border-border bg-card p-1.5 shadow-lg ${className}`}
        >
          {children}
        </div>,
        document.body,
      )}
    </div>
  )
}
