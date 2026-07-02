import { Check, MapPin, CalendarDays, Clock, Repeat, UserPlus } from 'lucide-react'
import { corDoNome, iniciais } from '../lib/avatarCor.js'
import { nomeDiaSemana } from '../lib/datas.js'

const FREQ = { 7: 'Semanal', 14: 'Quinzenal', 28: 'Mensal' }

function horaDe(iso) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function LiderAvatar({ lider, size = 40 }) {
  if (lider?.avatar) {
    return <img src={lider.avatar} alt={lider.nome} className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  const { bg, fg } = corDoNome(lider?.nome || '?')
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-xs font-semibold ring-2 ring-card"
      style={{ width: size, height: size, backgroundColor: bg, color: fg }}
      aria-hidden="true"
    >
      {iniciais(lider?.nome)}
    </span>
  )
}

function Metadado({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-text-muted">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  )
}

function CelulaCard({ c, ativa, onClick }) {
  const cor = corDoNome(c.nome)
  const lideres = c.lideres || []
  const destaque = lideres[0]
  const extras = lideres.length - 1

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={`w-full rounded-2xl border p-4 text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        ativa ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-border bg-card hover:border-brand-soft hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Monograma colorido derivado do nome da célula — identidade mesmo sem foto */}
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          style={{ backgroundColor: cor.bg, color: cor.fg }}
          aria-hidden="true"
        >
          {iniciais(c.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text">{c.nome}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <Metadado icon={CalendarDays}>{nomeDiaSemana(c.diaSemana)}</Metadado>
            <Metadado icon={Clock}>{horaDe(c.dataPrimeiroEncontro)}</Metadado>
            <Metadado icon={Repeat}>{FREQ[c.frequenciaDias] || ''}</Metadado>
            {c.bairro && <Metadado icon={MapPin}>{c.bairro}</Metadado>}
          </div>
        </div>
        <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${ativa ? 'border-brand bg-brand text-on-brand' : 'border-border text-transparent'}`}>
          <Check className="h-4 w-4" />
        </span>
      </div>

      {/* Líderes: um em destaque + contador; ou estado "a definir" (caso real hoje) */}
      <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-3">
        {destaque ? (
          <>
            <div className="flex items-center -space-x-2">
              <LiderAvatar lider={destaque} />
              {extras > 0 && (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text-muted ring-2 ring-card">
                  +{extras}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{destaque.nome}</p>
              <p className="text-xs text-text-muted">{extras > 0 ? `e mais ${extras} líder(es)` : 'Líder da célula'}</p>
            </div>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
            <UserPlus className="h-3.5 w-3.5" /> Líder a definir
          </span>
        )}
      </div>
    </button>
  )
}

export function CelulaPicker({ celulas, selecionada, onSelecionar }) {
  return (
    <div className="space-y-3">
      {celulas.map((c) => (
        <CelulaCard key={c.id} c={c} ativa={selecionada === c.id} onClick={() => onSelecionar(c.id)} />
      ))}
    </div>
  )
}
