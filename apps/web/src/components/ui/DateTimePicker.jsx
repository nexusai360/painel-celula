import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const pad = (n) => String(n).padStart(2, '0')

// value / retorno: "YYYY-MM-DDTHH:mm" (datetime) ou "YYYY-MM-DD" (mode="date").
function parse(value) {
  if (!value) return null
  const [d, t] = String(value).split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = (t || '00:00').split(':').map(Number)
  if (!y || !m || !day) return null
  return { y, m: m - 1, day, h: h || 0, min: min || 0 }
}
function toValue({ y, m, day, h, min }, ehData) {
  const data = `${y}-${pad(m + 1)}-${pad(day)}`
  return ehData ? data : `${data}T${pad(h)}:${pad(min)}`
}
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

// Texto legível a partir do value ("dd/mm/aaaa" ou "dd/mm/aaaa HH:mm").
function formatarTexto(value, ehData) {
  const p = parse(value)
  if (!p) return ''
  const data = `${pad(p.day)}/${pad(p.m + 1)}/${p.y}`
  return ehData ? data : `${data} ${pad(p.h)}:${pad(p.min)}`
}

// Aplica máscara enquanto digita: dd/mm/aaaa [HH:mm].
function mascarar(bruto, ehData) {
  const dig = String(bruto).replace(/\D/g, '').slice(0, ehData ? 8 : 12)
  let out = ''
  for (let i = 0; i < dig.length; i++) {
    if (i === 2 || i === 4) out += '/'
    if (i === 8) out += ' '
    if (i === 10) out += ':'
    out += dig[i]
  }
  return out
}

// Converte o texto digitado em value válido, ou null se incompleto/inválido.
function parseTexto(texto, ehData) {
  const dig = String(texto).replace(/\D/g, '')
  if (ehData ? dig.length < 8 : dig.length < 12) return null
  const day = +dig.slice(0, 2)
  const m = +dig.slice(2, 4)
  const y = +dig.slice(4, 8)
  const h = ehData ? 0 : +dig.slice(8, 10)
  const min = ehData ? 0 : +dig.slice(10, 12)
  if (m < 1 || m > 12 || day < 1 || day > 31 || y < 1900 || h > 23 || min > 59) return null
  // valida dia real do mês
  if (day > new Date(y, m, 0).getDate()) return null
  return toValue({ y, m: m - 1, day, h, min }, ehData)
}

export function DateTimePicker({ value, onChange, label, id, placeholder, required = false, className = '', mode = 'datetime' }) {
  const ehData = mode === 'date'
  const autoId = useId()
  const campoId = id || autoId
  const raiz = useRef(null)
  const campoRef = useRef(null)
  const painelRef = useRef(null)
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState(() => formatarTexto(value, ehData))
  const [focado, setFocado] = useState(false)
  const [pos, setPos] = useState(null)
  // Jornada de navegação: 'dias' | 'meses' | 'anos'.
  const [vista, setVista] = useState('dias')

  const parsed = parse(value)
  const hoje = new Date()
  const ph = placeholder ?? (ehData ? 'dd/mm/aaaa' : 'dd/mm/aaaa --:--')

  // Sincroniza o texto quando o value muda por fora (calendário, reset, prop).
  useEffect(() => {
    if (!focado) setTexto(formatarTexto(value, ehData))
  }, [value, ehData, focado])

  const [mesVisivel, setMesVisivel] = useState(() => (parsed ? { y: parsed.y, m: parsed.m } : { y: hoje.getFullYear(), m: hoje.getMonth() }))
  const [rascunho, setRascunho] = useState(() => parsed)

  function abrir() {
    const p = parse(value)
    setRascunho(p)
    setMesVisivel(p ? { y: p.y, m: p.m } : { y: hoje.getFullYear(), m: hoje.getMonth() })
    // Aniversário sem data: começa pelo ANO (evita rolar setas por décadas).
    setVista(ehData && !p ? 'anos' : 'dias')
    setAberto(true)
  }

  // Posiciona o painel em portal (fixed), ancorado ao campo — nunca é cortado.
  useLayoutEffect(() => {
    if (!aberto || !campoRef.current) return
    const el = campoRef.current
    function place() {
      const r = el.getBoundingClientRect()
      const largura = 320
      const left = Math.min(r.left, window.innerWidth - largura - 8)
      setPos({ top: r.bottom + 8, left: Math.max(8, left) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    function onDoc(e) {
      if (raiz.current?.contains(e.target)) return
      if (painelRef.current?.contains(e.target)) return
      setAberto(false)
    }
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

  // Anos: do ano atual até 1920 (decrescente) — bom para aniversários antigos.
  const anos = useMemo(() => {
    const atual = hoje.getFullYear()
    const arr = []
    for (let y = atual; y >= 1920; y--) arr.push(y)
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function digitar(bruto) {
    const mascarado = mascarar(bruto, ehData)
    setTexto(mascarado)
    const v = parseTexto(mascarado, ehData)
    if (v) onChange?.(v)
    else if (mascarado === '') onChange?.('')
  }
  function aoSair() {
    setFocado(false)
    setTexto(formatarTexto(value, ehData))
  }

  function mudarMes(delta) {
    setMesVisivel(({ y, m }) => {
      const nd = new Date(y, m + delta, 1)
      return { y: nd.getFullYear(), m: nd.getMonth() }
    })
  }
  function mudarAno(delta) {
    setMesVisivel(({ y, m }) => ({ y: y + delta, m }))
  }
  function escolherAno(y) {
    setMesVisivel((mv) => ({ y, m: mv.m }))
    setVista('meses')
  }
  function escolherMes(m) {
    setMesVisivel((mv) => ({ y: mv.y, m }))
    setVista('dias')
  }
  function escolherDia(day) {
    const novo = { y: mesVisivel.y, m: mesVisivel.m, day, h: rascunho?.h ?? (ehData ? 0 : 19), min: rascunho?.min ?? 0 }
    setRascunho(novo)
    if (ehData) { onChange?.(toValue(novo, true)); setAberto(false) } // data: seleciona e fecha
  }
  function mudarHora(campo, v) {
    setRascunho((r) => ({
      y: r?.y ?? mesVisivel.y, m: r?.m ?? mesVisivel.m, day: r?.day ?? new Date().getDate(),
      h: campo === 'h' ? v : (r?.h ?? 19), min: campo === 'min' ? v : (r?.min ?? 0)
    }))
  }
  function aplicar() {
    if (!rascunho?.day) return
    onChange?.(toValue(rascunho, ehData))
    setAberto(false)
  }

  const hojeStr = ymd(hoje)

  return (
    <div className={`relative ${className}`} ref={raiz}>
      {label && <label htmlFor={campoId} className="mb-1.5 block text-sm font-medium text-text">{label}</label>}
      <div className="relative" ref={campoRef}>
        <input
          id={campoId}
          value={texto}
          inputMode="numeric"
          autoComplete="off"
          placeholder={ph}
          aria-label={label}
          onFocus={() => { setFocado(true); if (!aberto) abrir() }}
          onClick={() => { if (!aberto) abrir() }}
          onBlur={aoSair}
          onChange={(e) => digitar(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background pl-4 pr-12 text-sm text-text placeholder:text-text-muted transition-colors hover:border-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        />
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-label="Abrir calendário"
          onClick={() => (aberto ? setAberto(false) : abrir())}
          className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {/* input escondido para validação nativa de required */}
      {required && (
        <input tabIndex={-1} aria-hidden="true" className="sr-only" required value={value || ''} onChange={() => {}} />
      )}

      {aberto && pos && createPortal(
        <AnimatePresence>
          <motion.div
            ref={painelRef}
            role="dialog" aria-label="Selecionar data"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 320 }}
            className="z-[200] max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-card p-4 shadow-lg"
          >
            {/* ── Cabeçalho por vista ── */}
            {vista === 'dias' && (
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text cursor-pointer">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setVista('meses')}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-text hover:bg-surface cursor-pointer">
                  {MESES[mesVisivel.m]} {mesVisivel.y}
                </button>
                <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text cursor-pointer">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            {vista === 'meses' && (
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => mudarAno(-1)} aria-label="Ano anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text cursor-pointer">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setVista('anos')}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-text hover:bg-surface cursor-pointer">
                  {mesVisivel.y}
                </button>
                <button type="button" onClick={() => mudarAno(1)} aria-label="Próximo ano"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text cursor-pointer">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            {vista === 'anos' && (
              <div className="mb-3 flex items-center justify-center">
                <span className="text-sm font-semibold text-text">Selecione o ano</span>
              </div>
            )}

            {/* ── Corpo por vista ── */}
            {vista === 'dias' && (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-text-muted">
                  {DIAS_SEMANA.map((d) => <div key={d} className="py-1">{d}</div>)}
                </div>
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
              </>
            )}

            {vista === 'meses' && (
              <div className="grid grid-cols-3 gap-2">
                {MESES_CURTO.map((rotulo, m) => {
                  const selecionado = m === mesVisivel.m
                  return (
                    <button
                      key={rotulo} type="button" onClick={() => escolherMes(m)}
                      className={`h-11 rounded-lg text-sm capitalize transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        selecionado ? 'brand-grad bg-brand font-semibold text-on-brand' : 'text-text hover:bg-surface'
                      }`}
                    >
                      {rotulo}
                    </button>
                  )
                })}
              </div>
            )}

            {vista === 'anos' && (
              <div className="max-h-[220px] overflow-y-auto pr-1">
                <div className="grid grid-cols-4 gap-2">
                  {anos.map((y) => {
                    const selecionado = y === mesVisivel.y
                    return (
                      <button
                        key={y} type="button" onClick={() => escolherAno(y)}
                        className={`h-10 rounded-lg text-sm tabular-nums transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          selecionado ? 'brand-grad bg-brand font-semibold text-on-brand' : 'text-text hover:bg-surface'
                        }`}
                      >
                        {y}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hora — só no modo datetime e na vista de dias */}
            {!ehData && vista === 'dias' && (
              <>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <Clock className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  <span className="text-sm text-text-muted">Horário</span>
                  <div className="ml-auto flex items-center gap-1">
                    <TimeSpin value={rascunho?.h ?? 19} max={23} onChange={(v) => mudarHora('h', v)} aria-label="Hora" />
                    <span className="text-text-muted">:</span>
                    <TimeSpin value={rascunho?.min ?? 0} max={59} step={5} onChange={(v) => mudarHora('min', v)} aria-label="Minuto" />
                  </div>
                </div>
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
              </>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
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
