import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

/**
 * Select — dropdown acessível que substitui o <select> nativo.
 * Props:
 *   value    — valor selecionado
 *   onChange — (novoValor) => void
 *   options  — [{ value, label }]
 *   label, id, placeholder, disabled, className
 * Teclado: Enter/Espaço/↓ abre; ↑/↓ navega; Enter seleciona; Esc fecha.
 */
export function Select({
  value,
  onChange,
  options = [],
  label,
  id,
  placeholder = 'Selecione',
  disabled = false,
  className = ''
}) {
  const autoId = useId()
  const campoId = id || autoId
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(-1)
  const raiz = useRef(null)
  const listaRef = useRef(null)

  const selecionadoIdx = options.findIndex((o) => String(o.value) === String(value))
  const selecionado = selecionadoIdx >= 0 ? options[selecionadoIdx] : null

  useEffect(() => {
    if (!aberto) return
    function onDoc(e) {
      if (raiz.current && !raiz.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [aberto])

  useEffect(() => {
    if (aberto) setAtivo(selecionadoIdx >= 0 ? selecionadoIdx : 0)
  }, [aberto, selecionadoIdx])

  useEffect(() => {
    if (!aberto || ativo < 0 || !listaRef.current) return
    const el = listaRef.current.children[ativo]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [ativo, aberto])

  function escolher(idx) {
    const opt = options[idx]
    if (!opt) return
    onChange?.(opt.value)
    setAberto(false)
  }

  function onKeyDown(e) {
    if (disabled) return
    if (!aberto) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault()
        setAberto(true)
      }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setAberto(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setAtivo(0) }
    else if (e.key === 'End') { e.preventDefault(); setAtivo(options.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(ativo) }
    else if (e.key === 'Tab') setAberto(false)
  }

  return (
    <div className={`relative ${className}`} ref={raiz}>
      {label && (
        <label htmlFor={campoId} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <button
        type="button"
        id={campoId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => !disabled && setAberto((v) => !v)}
        onKeyDown={onKeyDown}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 text-sm text-text transition-colors hover:border-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <span className={selecionado ? 'text-text' : 'text-text-muted'}>
          {selecionado ? selecionado.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.ul
            ref={listaRef}
            role="listbox"
            aria-activedescendant={ativo >= 0 ? `${campoId}-opt-${ativo}` : undefined}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-lg"
          >
            {options.map((o, i) => {
              const sel = String(o.value) === String(value)
              return (
                <li
                  key={o.value}
                  id={`${campoId}-opt-${i}`}
                  role="option"
                  aria-selected={sel}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => escolher(i)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    i === ativo ? 'bg-surface' : ''
                  } ${sel ? 'font-semibold text-brand' : 'text-text'}`}
                >
                  <span>{o.label}</span>
                  {sel && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
