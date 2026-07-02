import { useState, useEffect } from 'react'
import { Lock, Users, CalendarX } from 'lucide-react'
import { AnimatedCheck } from './AnimatedCheck.jsx'
import { usePresenca } from '../hooks/usePresenca.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatarHora, diaRelativo, dataPorExtenso } from '../lib/datas.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Contagem regressiva (somente quando diff < 24h):
 * "Abre em {h}h {m}min" ou "Abre em {m}min" se <1h.
 */
function contagemRegressiva(dataISO, agora) {
  const ms = new Date(dataISO) - agora
  if (ms <= 0) return null
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 1) return `Abre em ${h}h ${m}min`
  return `Abre em ${Math.max(1, m)}min`
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * CheckInHero — card imersivo para a próxima reunião.
 *
 * Props:
 *   encontro — objeto do encontro (ou null para estado vazio).
 *
 * Deve ser keyed pelo pai: <CheckInHero key={encontro?.id ?? 'none'} .../>
 * Effects internos dependem apenas de primitivos, nunca do objeto inteiro.
 */
export function CheckInHero({ encontro }) {
  // Clock: atualiza a cada 30s para atualizar contagem regressiva
  const [agora, setAgora] = useState(() => new Date())
  const { usuario } = useAuth()
  // usePresenca(null) é seguro — guards internos tratam encontro nulo
  const { marcado, salvando, erro, alternar } = usePresenca(encontro)

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(t)
  }, []) // sem deps de encontro — apenas relógio

  const celulaNome = usuario?.celulaNome || 'Sua célula'

  // ── Estado vazio ───────────────────────────────────────────────────────────
  if (!encontro) {
    return (
      <article
        className="check-in-hero check-in-hero--vazio"
        aria-label="Sem reuniões agendadas"
      >
        <CalendarX className="h-10 w-10 text-text-muted" aria-hidden="true" />
        <p className="text-lg font-semibold text-text mt-3">
          Nenhuma reunião agendada
        </p>
        <p className="text-sm text-text-muted mt-1 max-w-xs mx-auto">
          Quando o líder publicar o cronograma, ela aparece aqui.
        </p>
      </article>
    )
  }

  // ── Máquina de estados ─────────────────────────────────────────────────────
  const dataReuniao = new Date(encontro.data)
  const isCancelled = encontro.status === 'CANCELADO'
  const isLocked = !isCancelled && agora < dataReuniao
  const menos24h = isLocked && dataReuniao - agora < 86_400_000
  const isConfirmed = !isCancelled && marcado
  // isOpen: não cancelado, não travado, não marcado
  const isOpen = !isCancelled && !isLocked && !marcado

  const label = diaRelativo(encontro.data, agora)
  const dataExt = dataPorExtenso(encontro.data)
  const mostrarData = label !== dataExt // evita duplicar quando o rótulo já é a data
  const hora = formatarHora(encontro.data)
  const presentes = encontro._count?.presencas ?? 0

  const stateClass = isConfirmed
    ? 'check-in-hero--confirmed'
    : isOpen
    ? 'check-in-hero--open'
    : isCancelled
    ? 'check-in-hero--cancelled'
    : '' // LOCKED — class base

  return (
    <article
      className={`check-in-hero ${stateClass}`}
      aria-label="Próxima reunião"
    >
      {/* ── Cabeçalho: célula + contagem de presentes ─────────────────── */}
      <div className="check-in-hero__header">
        <div>
          <p className="check-in-hero__celula">{celulaNome}</p>
          <p className="check-in-hero__label">{label}</p>
          {mostrarData && (
            <p className="check-in-hero__data">{dataExt}</p>
          )}
        </div>

        {presentes > 0 && (
          <div
            className="check-in-hero__presentes"
            aria-label={`${presentes} ${presentes === 1 ? 'presente' : 'presentes'}`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">{presentes}</span>
          </div>
        )}
      </div>

      {/* ── Horário em destaque ─────────────────────────────────────────── */}
      <p className="check-in-hero__time" aria-label={`Horário: ${hora}`}>
        {hora}
      </p>

      {/* ── Área de ação (depende do estado) ───────────────────────────── */}
      <div className="check-in-hero__action">
        {isCancelled ? (
          <span className="check-in-hero__badge check-in-hero__badge--cancelled">
            Reunião cancelada
          </span>
        ) : isLocked ? (
          <>
            <div className="check-in-hero__lock">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Abre {label} às {hora}</span>
            </div>

            {menos24h && (
              <p className="check-in-hero__countdown" aria-live="polite">
                {contagemRegressiva(encontro.data, agora)}
              </p>
            )}
          </>
        ) : (
          <>
            <AnimatedCheck
              marcado={marcado}
              disabled={salvando}
              onToggle={alternar}
            />

            {/* Texto de status — sr-only dentro do AnimatedCheck já anuncia */}
            <div className="check-in-hero__status" aria-hidden={salvando}>
              {isConfirmed ? (
                <>
                  <p className="font-semibold text-success">
                    Presença confirmada
                  </p>
                  {encontro.marcadaEm && (
                    <p className="text-sm text-text-muted">
                      às {formatarHora(encontro.marcadaEm)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  Toque para confirmar presença
                </p>
              )}
            </div>
          </>
        )}

        {/* Erro de rede/regra de negócio */}
        {erro && (
          <p role="alert" className="text-sm text-danger mt-1 text-center">
            {erro}
          </p>
        )}
      </div>
    </article>
  )
}
