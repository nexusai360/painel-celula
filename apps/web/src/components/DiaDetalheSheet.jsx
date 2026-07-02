import { useId } from 'react'
import { Users, Lock, Ban } from 'lucide-react'
import { Sheet } from './ui/Sheet.jsx'
import { AnimatedCheck } from './AnimatedCheck.jsx'
import { usePresenca } from '../hooks/usePresenca.js'
import { formatarHora, nomeDiaSemana } from '../lib/datas.js'
import { StatusTag } from './ui/Tag.jsx'

const MESES_GEN = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/**
 * DiaDetalheSheet
 * ---------------
 * Bottom sheet for a single encontro: shows date/time, status, presence count,
 * and the AnimatedCheck / usePresenca check-in interaction (respects the lock:
 * future → disabled with motivo; past/today-open → markable).
 *
 * Props:
 *   open      — boolean: controls Sheet visibility
 *   encontro  — encontro object | null
 *   onClose   — () => void
 *
 * The Sheet is always rendered so AnimatePresence can animate it out even after
 * the parent sets encontro to null on close.
 */
export function DiaDetalheSheet({ open, encontro, onClose }) {
  const tituloId = useId()

  // Hook called unconditionally — handles null safely (see usePresenca.js)
  const { marcado, salvando, erro, alternar, marcavel, motivo } = usePresenca(encontro)

  const cancelado = encontro?.status === 'CANCELADO'
  const data = encontro ? new Date(encontro.data) : null
  const totalPresencas = encontro?._count?.presencas ?? 0

  return (
    <Sheet open={open} onClose={onClose} tituloId={tituloId}>
      {encontro && data && (
        <div className="px-5 pb-10 pt-2">

          {/* ── Date + time ─────────────────────────────────────── */}
          <h2
            id={tituloId}
            className="font-display font-bold text-xl text-text"
          >
            {nomeDiaSemana(data.getDay())}, {data.getDate()} de{' '}
            {MESES_GEN[data.getMonth()]}
          </h2>
          <p className="mt-0.5 text-sm text-text-muted">
            {formatarHora(encontro.data)}
          </p>

          {/* ── Status badge (only when not plain AGENDADO) ──────── */}
          {encontro.status !== 'AGENDADO' && (
            <div className="mt-3">
              <StatusTag status={encontro.status} />
            </div>
          )}

          {/* ── Presence count ───────────────────────────────────── */}
          <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
            <Users className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              {totalPresencas === 1
                ? '1 presença confirmada'
                : `${totalPresencas} presenças confirmadas`}
            </span>
          </div>

          {/* ── Divider ─────────────────────────────────────────── */}
          <div className="my-5 border-t border-border" aria-hidden="true" />

          {/* ── Check-in area ────────────────────────────────────── */}
          {cancelado ? (
            <div className="flex items-center gap-2 text-sm text-text-muted/70">
              <Ban className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Reunião cancelada — marcação indisponível.</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <AnimatedCheck
                marcado={marcado}
                disabled={salvando || !marcavel}
                onToggle={alternar}
              />

              <p className="text-sm text-center text-text-muted max-w-[220px]">
                {marcado ? (
                  <>
                    Presença confirmada
                    {encontro.marcadaEm
                      ? (
                        <span className="text-text-muted/80">
                          {' '}às {formatarHora(encontro.marcadaEm)}
                        </span>
                      )
                      : null}
                  </>
                ) : marcavel ? (
                  'Toque para confirmar presença'
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    {motivo}
                  </span>
                )}
              </p>

              {/* Inline error — announced via role="alert" */}
              {erro && (
                <p role="alert" className="text-xs text-danger text-center">
                  {erro}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
