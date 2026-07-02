import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useEncontros } from '../context/EncontrosContext.jsx'
import { proximaReuniao, frequenciaDoMes } from '../lib/proximaReuniao.js'
import { CheckInHero } from '../components/CheckInHero.jsx'
import { MinhaFrequencia } from '../components/MinhaFrequencia.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'

function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || 'amigo(a)'
}

/**
 * AppHome — tela inicial imersiva para membros e líderes.
 *
 * Consome EncontrosProvider (via useEncontros); não faz fetch próprio.
 * Admin já é redirecionado para /app/celulas em App.jsx (InicioOuCelulas).
 */
export default function AppHome() {
  const { usuario } = useAuth()
  const { encontros, carregando, erro } = useEncontros()

  // Tick de minuto: garante que a "próxima reunião" seja recalculada quando o
  // dia vira (à meia-noite), evitando um hero preso na reunião de ontem.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  // ── Sem célula: estado vazio (membro/líder sem vínculo) ─────────────────
  if (!usuario?.celulaId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3 px-4">
        <p className="text-xl font-semibold text-text">
          Você ainda não está em uma célula
        </p>
        <p className="text-sm text-text-muted max-w-xs">
          Escaneie o QR Code da sua célula para participar.
        </p>
      </div>
    )
  }

  // ── Dados derivados do contexto compartilhado ────────────────────────────
  const featured = encontros ? proximaReuniao(encontros) : null
  const freq = encontros ? frequenciaDoMes(encontros) : null

  return (
    <div className="flex flex-col gap-6">
      {/* ── Saudação ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-text" style={{ fontFamily: 'var(--font-display)' }}>
          Olá, {primeiroNome(usuario?.nome)} 👋
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Marque sua presença na {usuario.celulaNome || 'sua célula'}!
        </p>
      </div>

      {/* ── Carregando ────────────────────────────────────────────────── */}
      {carregando && <Spinner className="py-12" />}

      {/* ── Erro de rede ──────────────────────────────────────────────── */}
      {!carregando && erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}

      {/* ── Conteúdo principal ────────────────────────────────────────── */}
      {!carregando && !erro && (
        <>
          {/* Hero de check-in — keyed por id para garantir remontagem ao
              trocar de encontro, preservando estabilidade das animações */}
          <CheckInHero
            key={featured?.id ?? 'none'}
            encontro={featured}
          />

          {/* Frequência — só aparece se houver histórico */}
          {freq && <MinhaFrequencia {...freq} />}

          {/* Atalho para o calendário completo */}
          <Link
            to="/app/calendario"
            className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-border bg-card px-5 py-4 text-sm font-medium text-text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Ver todas as reuniões
          </Link>
        </>
      )}
    </div>
  )
}
