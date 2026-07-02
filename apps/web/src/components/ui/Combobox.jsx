import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check, Search, Loader2 } from 'lucide-react'

function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Teto de itens renderizados por vez — listas gigantes (ex.: 5.5k municípios do
// IBGE) montariam milhares de nós e travariam o dropdown. Digitar refina.
const MAX_VISIVEIS = 80

/**
 * Combobox com busca. options: [{value,label,description?}] ou string[].
 * allowCustom: commita o texto digitado como valor (ex.: cidade fora da lista).
 * loading: mostra estado de carregamento (ex.: baixando a lista de cidades).
 */
export function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione',
  allowCustom = false,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const opts = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options],
  )
  const selecionado = opts.find((o) => o.value === value)
  const [aberto, setAberto] = useState(false)
  const [query, setQuery] = useState('')
  const [ativo, setAtivo] = useState(0)
  const rootRef = useRef(null)
  const listId = useId()

  const filtradasTodas = useMemo(() => {
    const q = normalizar(query)
    if (!q) return opts
    return opts.filter((o) => normalizar(o.label).includes(q))
  }, [opts, query])
  const filtradas = useMemo(() => filtradasTodas.slice(0, MAX_VISIVEIS), [filtradasTodas])
  const ocultas = filtradasTodas.length - filtradas.length

  useEffect(() => {
    if (!aberto) return
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) fechar()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [aberto])

  function abrir() {
    // Semeia a busca com o valor atual para poder EDITAR/APAGAR (corrige o bug de travar).
    setQuery(selecionado?.label ?? (allowCustom ? value ?? '' : ''))
    setAberto(true)
  }
  function fechar() {
    setAberto(false)
    setQuery('')
  }
  function escolher(o) {
    onChange?.(o.value)
    fechar()
  }
  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAberto(true)
      setAtivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtradas[ativo]) escolher(filtradas[ativo])
      else if (allowCustom && query) escolher({ value: query, label: query })
    } else if (e.key === 'Escape') {
      fechar()
    }
  }

  const textoTrigger = aberto ? query : selecionado?.label ?? (allowCustom ? value ?? '' : '')

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <input
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listId}
          aria-label={ariaLabel}
          autoComplete="off"
          value={textoTrigger}
          placeholder={selecionado ? selecionado.label : placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setAberto(true)
            setAtivo(0)
            if (allowCustom) onChange?.(e.target.value)
          }}
          onFocus={abrir}
          onKeyDown={onKeyDown}
          className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-9 text-sm text-text placeholder:text-text-muted transition-colors focus:border-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </div>
      {aberto && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          {loading && filtradas.length === 0 && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando cidades…
            </li>
          )}
          {!loading && filtradas.length === 0 && (
            <li className="px-3 py-2 text-sm text-text-muted">
              {allowCustom && query ? `Usar “${query}”` : 'Nada encontrado'}
            </li>
          )}
          {filtradas.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => escolher(o)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm cursor-pointer ${
                  i === ativo ? 'bg-surface' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-text">{o.label}</span>
                  {o.description && <span className="block truncate text-xs text-text-muted">{o.description}</span>}
                </span>
                {o.value === value && <Check className="h-4 w-4 shrink-0 text-brand" />}
              </button>
            </li>
          ))}
          {ocultas > 0 && (
            <li className="px-3 py-2 text-center text-xs text-text-muted">
              +{ocultas} cidade(s) — digite para refinar
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
