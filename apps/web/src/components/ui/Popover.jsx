import { useEffect, useRef } from 'react'

/**
 * Popover ancorado simples: outside-click + Esc fecham. Posiciona abaixo do trigger
 * (align 'start'|'end'). Para colisão de borda em telas estreitas, o consumidor pode
 * usar Sheet no mobile (ex.: RoleSelect).
 */
export function Popover({ trigger, children, open, onOpenChange, align = 'start', className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onOpenChange?.(false)
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
    <div ref={ref} className="relative inline-flex">
      {trigger}
      {open && (
        <div
          role="dialog"
          className={`absolute top-full z-50 mt-2 min-w-[12rem] rounded-xl border border-border bg-card p-1.5 shadow-lg ${
            align === 'end' ? 'right-0' : 'left-0'
          } ${className}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
