import { useState, useMemo } from 'react'
import { Check, ChevronLeft, ChevronRight, Ban, X } from 'lucide-react'
import { chaveDiaLocal } from '../lib/datas.js'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_GEN = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS_HDR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const ARIA_ESTADO = {
  presente: 'Presente',
  falta: 'Faltei',
  futuro: 'Próxima reunião',
  cancelado: 'Cancelada',
}

function cmpMes(a, b) {
  return a.ano * 12 + a.mes - (b.ano * 12 + b.mes)
}

/**
 * Determines the attendance state of a meeting day.
 * Returns { tipo, ehHoje } where tipo ∈ 'presente'|'falta'|'futuro'|'cancelado'|null
 */
function obterInfoDia(encontro, chaveHoje) {
  if (!encontro) return { tipo: null, ehHoje: false }
  const chave = chaveDiaLocal(encontro.data)
  const ehHoje = chave === chaveHoje
  const ehPassado = chave < chaveHoje

  let tipo
  if (encontro.status === 'CANCELADO') {
    tipo = 'cancelado'
  } else if ((ehPassado || ehHoje) && encontro.marcadoPorMim) {
    tipo = 'presente'
  } else if (ehPassado && !encontro.marcadoPorMim) {
    tipo = 'falta'
  } else {
    tipo = 'futuro'
  }
  return { tipo, ehHoje }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function AttendanceCalendar({ encontros = [], onSelecionar }) {
  const hoje = useMemo(() => new Date(), [])
  const chaveHoje = useMemo(() => chaveDiaLocal(hoje), [hoje])

  /* ── map: chave-dia-local → encontro ─────────────────────── */
  const porDia = useMemo(() => {
    const m = new Map()
    for (const e of encontros) m.set(chaveDiaLocal(e.data), e)
    return m
  }, [encontros])

  /* ── clamp range from encontros ───────────────────────────── */
  const { mesMin, mesMax } = useMemo(() => {
    const def = { ano: hoje.getFullYear(), mes: hoje.getMonth() }
    if (!encontros.length) return { mesMin: def, mesMax: def }
    const sorted = [...encontros].sort((a, b) => new Date(a.data) - new Date(b.data))
    const first = new Date(sorted[0].data)
    const last = new Date(sorted[sorted.length - 1].data)
    return {
      mesMin: { ano: first.getFullYear(), mes: first.getMonth() },
      mesMax: { ano: last.getFullYear(), mes: last.getMonth() },
    }
  }, [encontros, hoje])

  /* ── initial displayed month: current, clamped ────────────── */
  const [visivel, setVisivel] = useState(() => {
    const def = { ano: hoje.getFullYear(), mes: hoje.getMonth() }
    if (!encontros.length) return def
    const sorted = [...encontros].sort((a, b) => new Date(a.data) - new Date(b.data))
    const first = new Date(sorted[0].data)
    const last = new Date(sorted[sorted.length - 1].data)
    const minM = { ano: first.getFullYear(), mes: first.getMonth() }
    const maxM = { ano: last.getFullYear(), mes: last.getMonth() }
    if (cmpMes(def, minM) < 0) return minM
    if (cmpMes(def, maxM) > 0) return maxM
    return def
  })

  const podePrev = cmpMes(visivel, mesMin) > 0
  const podeNext = cmpMes(visivel, mesMax) < 0

  function irPrev() {
    setVisivel(v =>
      v.mes === 0 ? { ano: v.ano - 1, mes: 11 } : { ...v, mes: v.mes - 1 },
    )
  }
  function irNext() {
    setVisivel(v =>
      v.mes === 11 ? { ano: v.ano + 1, mes: 0 } : { ...v, mes: v.mes + 1 },
    )
  }

  /* ── grid cells for visible month ─────────────────────────── */
  const celulas = useMemo(() => {
    const { ano, mes } = visivel
    const offset = new Date(ano, mes, 1).getDay()
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= diasNoMes; d++) cells.push(d)
    return cells
  }, [visivel])

  function chaveParaDia(dia) {
    return `${visivel.ano}-${pad2(visivel.mes + 1)}-${pad2(dia)}`
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-4 select-none">
      {/* ── Month navigation header ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={irPrev}
          disabled={!podePrev}
          aria-label="Mês anterior"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-text-muted
                     hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-opacity duration-150"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <h3 className="font-display font-semibold text-text">
          {MESES[visivel.mes]} {visivel.ano}
        </h3>

        <button
          type="button"
          onClick={irNext}
          disabled={!podeNext}
          aria-label="Próximo mês"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-text-muted
                     hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-opacity duration-150"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* ── Weekday headers ─────────────────────────────────────── */}
      <div className="grid grid-cols-7 mb-1" aria-hidden="true">
        {DIAS_HDR.map(d => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label={`${MESES[visivel.mes]} ${visivel.ano}`}>
        {celulas.map((dia, i) => {
          if (dia === null) {
            return <div key={`e${i}`} className="min-h-[44px]" aria-hidden="true" role="gridcell" />
          }

          const chave = chaveParaDia(dia)
          const encontro = porDia.get(chave) ?? null
          const { tipo, ehHoje } = obterInfoDia(encontro, chaveHoje)
          const temEncontro = !!encontro
          const podeClicar = temEncontro && tipo !== 'cancelado'

          // aria-label: date + today + state
          const textoData = `${dia} de ${MESES_GEN[visivel.mes]}`
          const textoHoje = ehHoje ? ' (hoje)' : ''
          const textoEstado = tipo ? `, ${ARIA_ESTADO[tipo]}` : ''
          const ariaLabel = `${textoData}${textoHoje}${textoEstado}`

          // State-dependent classes (verde=presente, aviso=falta, marca=próxima)
          let estadoClass = ''
          if (tipo === 'presente') {
            estadoClass =
              'bg-success text-white cursor-pointer hover:opacity-90 motion-safe:active:scale-95'
          } else if (tipo === 'falta') {
            estadoClass =
              'border-2 border-danger/45 bg-danger/5 text-text cursor-pointer hover:border-danger/70 motion-safe:active:scale-95'
          } else if (tipo === 'futuro') {
            estadoClass =
              'border-2 border-brand/50 text-text cursor-pointer hover:bg-brand/5 hover:border-brand/80 motion-safe:active:scale-95'
          } else if (tipo === 'cancelado') {
            estadoClass = 'text-text-muted/40 cursor-default'
          } else {
            // No meeting — plain number
            estadoClass = 'text-text-muted/60'
          }

          // Today extra ring (on top of state)
          const hojeClass = ehHoje
            ? 'ring-2 ring-brand ring-offset-2 ring-offset-card'
            : ''

          return (
            <button
              key={dia}
              type="button"
              role="gridcell"
              disabled={!podeClicar}
              onClick={podeClicar ? () => onSelecionar?.(encontro) : undefined}
              aria-label={ariaLabel}
              className={`relative flex flex-col items-center justify-center min-h-[44px] rounded-xl
                          transition-opacity duration-150 focus:outline-none focus-visible:ring-2
                          focus-visible:ring-brand ${estadoClass} ${hojeClass}`}
            >
              {/* Day number */}
              <span
                className={`text-sm font-medium leading-none ${
                  tipo === 'cancelado' ? 'line-through' : ''
                }`}
              >
                {dia}
              </span>

              {/* State indicator below number (icon/dot — never color alone) */}
              {tipo === 'presente' && (
                <Check
                  className="h-2.5 w-2.5 mt-0.5"
                  aria-hidden="true"
                  strokeWidth={3}
                />
              )}
              {tipo === 'falta' && (
                <X
                  className="h-2.5 w-2.5 mt-0.5 text-danger/80"
                  aria-hidden="true"
                  strokeWidth={3}
                />
              )}
              {tipo === 'cancelado' && (
                <Ban
                  className="h-2 w-2 mt-0.5 opacity-50"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Legend (color + icon + text) ────────────────────────── */}
      <div
        className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-2"
        role="list"
        aria-label="Legenda do calendário"
      >
        <ItemLegenda
          icon={
            <span
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md bg-success"
              aria-hidden="true"
            >
              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </span>
          }
          label="Presente"
        />
        <ItemLegenda
          icon={
            <span
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center
                         rounded-md border-2 border-danger/45 bg-danger/5"
              aria-hidden="true"
            >
              <X className="h-2.5 w-2.5 text-danger/80" strokeWidth={3} />
            </span>
          }
          label="Faltei"
        />
        <ItemLegenda
          icon={
            <span
              className="h-4 w-4 flex-shrink-0 rounded-md border-2 border-brand/60"
              aria-hidden="true"
            />
          }
          label="Próxima"
        />
        <ItemLegenda
          icon={<Ban className="h-4 w-4 flex-shrink-0 text-text-muted/40" aria-hidden="true" />}
          label="Cancelada"
        />
        <ItemLegenda
          icon={
            <span
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-[10px] font-semibold text-text-muted/50"
              aria-hidden="true"
            >
              1
            </span>
          }
          label="Sem reunião"
        />
      </div>
    </div>
  )
}

function ItemLegenda({ icon, label }) {
  return (
    <span role="listitem" className="flex items-center gap-1.5 text-xs text-text-muted">
      {icon}
      <span>{label}</span>
    </span>
  )
}
