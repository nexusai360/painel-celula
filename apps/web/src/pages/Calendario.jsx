import { useRef, useState } from 'react'
import { AttendanceCalendar } from '../components/AttendanceCalendar.jsx'
import { DiaDetalheSheet } from '../components/DiaDetalheSheet.jsx'
import { CartaoGoogleCalendar } from '../components/CartaoGoogleCalendar.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useEncontros } from '../context/EncontrosContext.jsx'

export default function Calendario() {
  const { usuario } = useAuth()
  const { encontros, carregando, erro } = useEncontros()

  // Selected encontro for the detail sheet (null = closed).
  // sel stores the encontro object; selecionado re-resolves it from the live
  // encontros array by id so DiaDetalheSheet always reflects the latest state
  // (e.g. updated marcadoPorMim/_count after marking presence).
  const [sel, setSel] = useState(null)
  const selecionado = sel ? (encontros?.find((e) => e.id === sel.id) ?? sel) : null
  // Keep last non-null selection so content stays visible during exit animation
  const lastSel = useRef(null)
  if (selecionado) lastSel.current = selecionado

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Calendário</h1>
        <p className="mt-1 text-sm text-text-muted">
          Veja suas presenças e marque retroativamente.
        </p>
      </div>

      {!usuario?.celulaId ? (
        <Card className="py-8 text-center text-sm text-text-muted">
          Você ainda não está em uma célula.
        </Card>
      ) : erro ? (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      ) : carregando ? (
        <Spinner className="py-16" />
      ) : (
        <div className="space-y-5">
          <AttendanceCalendar
            encontros={encontros ?? []}
            onSelecionar={setSel}
          />
          <CartaoGoogleCalendar />
        </div>
      )}

      {/*
        DiaDetalheSheet is always rendered (outside the conditional above) so
        framer-motion AnimatePresence can animate the panel out even after the
        parent sets sel → null on close.
      */}
      <DiaDetalheSheet
        open={!!selecionado}
        encontro={lastSel.current}
        onClose={() => setSel(null)}
      />
    </>
  )
}
