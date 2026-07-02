import { Check, X, Ban } from 'lucide-react'

const ESTADO_LABEL = {
  presente: 'presente',
  falta: 'faltei',
  futuro: 'ainda vai acontecer',
  cancelado: 'cancelada',
}

/**
 * MinhaFrequencia — timeline do MÊS vigente (estilo habit-tracker).
 *
 * Uma "bolinha" por reunião do mês, em ordem cronológica:
 *   presente → preenchido com check · falta → contorno com × ·
 *   futuro → contorno tênue · cancelado → riscado.
 *
 * Props: { mesLabel, ano, itens:[{id,dia,estado}], presentes, total }.
 * Renderiza null quando não há reuniões contáveis no mês.
 */
export function MinhaFrequencia({ mesLabel, itens = [], presentes, total }) {
  if (total === 0) return null

  return (
    <section className="minha-frequencia" aria-label={`Frequência de ${mesLabel}`}>
      <div className="minha-frequencia__head">
        <p className="minha-frequencia__titulo">{mesLabel}</p>
        <p className="minha-frequencia__resumo">
          <strong className="text-text">{presentes}</strong> de{' '}
          <strong className="text-text">{total}</strong>{' '}
          {total === 1 ? 'reunião' : 'reuniões'}
        </p>
      </div>

      <ol className="minha-frequencia__timeline" role="list">
        {itens.map((it) => (
          <li key={it.id} className={`mf-dot mf-dot--${it.estado}`}>
            <span className="mf-dot__circulo" aria-hidden="true">
              {it.estado === 'presente' && <Check className="h-4 w-4" strokeWidth={3} />}
              {it.estado === 'falta' && <X className="h-3.5 w-3.5" strokeWidth={3} />}
              {it.estado === 'cancelado' && <Ban className="h-3 w-3" strokeWidth={2.5} />}
            </span>
            <span className="mf-dot__dia">{it.dia}</span>
            <span className="sr-only">
              Dia {it.dia}: {ESTADO_LABEL[it.estado]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
