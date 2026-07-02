import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Sun, Moon, Monitor, ChevronRight } from 'lucide-react'
import { Avatar } from './ui/Avatar.jsx'
import { NivelBadge, QualificacaoBadge } from './ui/RoleBadge.jsx'
import { ehAdmin } from '../lib/papeis.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

const TEMAS = [
  { valor: 'light', label: 'Claro', icon: Sun },
  { valor: 'dark', label: 'Escuro', icon: Moon },
  { valor: 'sistema', label: 'Sistema', icon: Monitor },
]

/**
 * AvatarMenu — botão de avatar que abre um menu da conta:
 *   Perfil · Tema (Claro/Escuro/Sistema) · Sair.
 * Fecha ao clicar fora ou pressionar Esc.
 */
export function AvatarMenu() {
  const { usuario, sair } = useAuth()
  const { modo, definirModo } = useTheme()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false)
    }
    function onEsc(e) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [aberto])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Abrir menu da conta"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-opacity hover:opacity-80 cursor-pointer"
      >
        <Avatar src={usuario?.avatar} nome={usuario?.nome} size={36} />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-card p-2 shadow-lg z-30"
        >
          {/* Cabeçalho da conta */}
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar src={usuario?.avatar} nome={usuario?.nome} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{usuario?.nome}</p>
              <p className="truncate text-xs text-text-muted">{usuario?.email}</p>
              {usuario?.qualificacao && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  {ehAdmin(usuario?.nivelAcesso) && <NivelBadge nivel={usuario.nivelAcesso} soIcone />}
                  <QualificacaoBadge qualificacao={usuario.qualificacao} />
                </div>
              )}
            </div>
          </div>

          <div className="my-1 border-t border-border" />

          {/* Perfil — item destacado */}
          <button
            role="menuitem"
            type="button"
            onClick={() => { setAberto(false); navigate('/app/perfil') }}
            className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-text transition-colors hover:border-brand hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand"><User className="h-4 w-4" /></span>
            <span className="flex-1 text-left">Meu perfil</span>
            <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </button>

          {/* Tema */}
          <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Tema
          </div>
          <div role="group" aria-label="Tema" className="grid grid-cols-3 gap-1 px-1 pb-1">
            {TEMAS.map(({ valor, label, icon: Icon }) => {
              const ativo = modo === valor
              return (
                <button
                  key={valor}
                  role="menuitemradio"
                  aria-checked={ativo}
                  type="button"
                  onClick={() => definirModo(valor)}
                  className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
                    ativo
                      ? 'bg-brand text-on-brand'
                      : 'text-text-muted hover:bg-surface hover:text-text'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>

          <div className="my-1 border-t border-border" />

          {/* Sair */}
          <button
            role="menuitem"
            type="button"
            onClick={() => { setAberto(false); sair() }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-danger hover:bg-danger/10 focus:outline-none focus-visible:bg-danger/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
