import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const pad = (n) => String(n).padStart(2, '0')

// value / retorno no formato local "YYYY-MM-DDTHH:mm" (igual ao datetime-local)
function parse(value) {
  if (!value) return null
  const [d, t] = value.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = (t || '00:00').split(':').map(Number)
  if (!y || !m || !day) return null
  return { y, m: m - 1, day, h: h || 0, min: min || 0 }
}
function toValue({ y, m, day, h, min }) {
  return `${y}-${pad(m + 1)}-${pad(day)}T${pad(h)}:${pad(min)}`
}
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export function DateTimePicker({ value, onChange, label, id, placeholder = 'dd/mm/aaaa, --:--', required = false, className = '' }) {
  const autoId = useId()
  const campoId = id || autoId
  const raiz = useRef(null)
  const [aberto, setAberto] = useState(false)

  const parsed = parse(value)
  const hoje = new Date()

  // Estado interno do popover (só aplica no "Aplicar")
  const [mesVisivel, setMesVisivel] = useState(() => (parsed ? { y: parsed.y, m: parsed.m } : { y: hoje.getFullYear(), m: hoje.getMonth() }))
  const [rascunho, setRascunho] = useState(() => parsed)

  useEffect(() => {
    if (aberto) {
      const p = parse(value)
      setRascunho(p)
      setMesVisivel(p ? { y: p.y, m: p.m } : { y: hoje.getFullYear(), m: hoje.getMonth() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    function onDoc(e) { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false) }
    function onEsc(e) { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [aberto])

  const grade = useMemo(() => {
    const { y, m } = mesVisivel
    const primeiro = new Date(y, m, 1)
    const offset = (primeiro.getDay() + 6) % 7 // segunda = 0
    const diasNoMes = new Date(y, m + 1, 0).getDate()
    const celulas = []
    for (let i = 0; i < offset; i++) celulas.push(null)
    for (let d = 1; d <= diasNoMes; d++) celulas.push(d)
    return celulas
  }, [mesVisivel])

  const rotulo = parsed
    ? `${pad(parsed.day)}/${pad(parsed.m + 1)}/${parsed.y}, ${pad(parsed.h)}:${pad(parsed.min)}`
    : ''

  function mudarMes(delta) {
    setMesVisivel(({ y, m }) => {
      const nd = new Date(y, m + delta, 1)
      return { y: nd.getFullYear(), m: nd.getMonth() }
    })
  }
  function escolherDia(day) {
    setRascunho((r) => ({ y: mesVisivel.y, m: mesVisivel.m, day, h: r?.h ?? 19, min: r?.min ?? 0 }))
  }
  function mudarHora(campo, v) {
    setRascunho((r) => ({
      y: r?.y ?? mesVisivel.y, m: r?.m ?? mesVisivel.m, day: r?.day ?? new Date().getDate(),
      h: campo === 'h' ? v : (r?.h ?? 19), min: campo === 'min' ? v : (r?.min ?? 0)
    }))
  }
  function aplicar() {
    if (!rascunho?.day) return
    onChange?.(toValue(rascunho))
    setAberto(false)
  }

  const hojeStr = ymd(hoje)

  return (
    <div className={`relative ${className}`} ref={raiz}>
      {label && <label htmlFor={campoId} className="mb-1.5 block text-sm font-medium text-text">{label}</label>}
      <button
        type="button" id={campoId} aria-haspopup="dialog" aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 text-sm transition-colors hover:border-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-background cursor-pointer"
      >
        <span className={rotulo ? 'text-text' : 'text-text-muted'}>{rotulo || placeholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
      </button>
      {/* input escondido para validação nativa de required */}
      {required && (
        <input tabIndex={-1} aria-hidden="true" className="sr-only" required value={value || ''} onChange={() => {}} />
      )}

      <AnimatePresence>
        {aberto && (
          <motion.div
            role="dialog" aria-label="Selecionar data e hora"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-4 shadow-lg"
          >
            {/* Cabeçalho: mês/ano + navegação */}
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text cursor-pointer">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-text">
                {MESES[mesVisivel.m]} {mesVisivel.y}
              </span>
              <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text cursor-pointer">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-text-muted">
              {DIAS_SEMANA.map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>

            {/* Grade de dias */}
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grade.map((day, i) => {
                if (!day) return <div key={`e${i}`} />
                const desteDia = `${mesVisivel.y}-${pad(mesVisivel.m + 1)}-${pad(day)}`
                const selecionado = rascunho?.day === day && rascunho?.m === mesVisivel.m && rascunho?.y === mesVisivel.y
                const ehHoje = desteDia === hojeStr
                return (
                  <button
                    key={day} type="button" onClick={() => escolherDia(day)}
                    className={`inline-flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      selecionado
                        ? 'brand-grad bg-brand font-semibold text-on-brand'
                        : ehHoje
                          ? 'font-semibold text-brand ring-1 ring-inset ring-brand-soft/50 hover:bg-surface'
                          : 'text-text hover:bg-surface'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Hora */}
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <Clock className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <span className="text-sm text-text-muted">Horário</span>
              <div className="ml-auto flex items-center gap-1">
                <TimeSpin value={rascunho?.h ?? 19} max={23} onChange={(v) => mudarHora('h', v)} aria-label="Hora" />
                <span className="text-text-muted">:</span>
                <TimeSpin value={rascunho?.min ?? 0} max={59} step={5} onChange={(v) => mudarHora('min', v)} aria-label="Minuto" />
              </div>
            </div>

            {/* Ações */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setAberto(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface hover:text-text cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={aplicar} disabled={!rascunho?.day}
                className="brand-grad rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-sm disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                Aplicar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Campo numérico com incremento/decremento (hora/minuto)
function TimeSpin({ value, max, step = 1, onChange, 'aria-label': ariaLabel }) {
  function ajustar(delta) {
    let v = value + delta * step
    if (v > max) v = 0
    if (v < 0) v = Math.floor(max / step) * step
    onChange(v)
  }
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-background">
      <input
        aria-label={ariaLabel}
        inputMode="numeric"
        value={String(value).padStart(2, '0')}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          if (!Number.isNaN(n) && n <= max) onChange(n)
          else if (e.target.value === '') onChange(0)
        }}
        className="w-9 bg-transparent py-1.5 text-center text-sm font-semibold tabular-nums text-text focus:outline-none"
      />
      <div className="flex flex-col border-l border-border">
        <button type="button" aria-label={`Aumentar ${ariaLabel}`} onClick={() => ajustar(1)}
          className="px-1.5 text-text-muted hover:text-text cursor-pointer leading-none text-[10px]">▲</button>
        <button type="button" aria-label={`Diminuir ${ariaLabel}`} onClick={() => ajustar(-1)}
          className="px-1.5 text-text-muted hover:text-text cursor-pointer leading-none text-[10px]">▼</button>
      </div>
    </div>
  )
}
