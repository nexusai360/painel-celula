import { Fragment, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Home, Users2, HandHeart, Sparkles, Heart, Menu, UserCheck, PlusCircle } from 'lucide-react'
import { Logo } from './ui/Logo.jsx'
import { AvatarMenu } from './AvatarMenu.jsx'
import { NotificacoesSino } from './NotificacoesSino.jsx'
import { NavDrawer } from './NavDrawer.jsx'
import { ContextSwitcher } from './ui/ContextSwitcher.jsx'
import { ehAdmin, ehGestorQualificacao } from '../lib/papeis.js'
import { useAuth } from '../context/AuthContext.jsx'

// Links da área de PARTICIPANTE (membro/líder). A área de Administração tem sua
// própria sub-nav (rail) no AdminLayout, então em contexto admin o TopBar mostra
// só o ContextSwitcher.
export function linksPorPapel(usuario) {
  const { qualificacao, celulaId } = usuario || {}
  if (usuario?.aprovado === false) return []
  if (usuario?.ativo === false) return [] // conta inativa não navega
  if (!celulaId) return []
  const links = [
    { to: '/app', label: 'Início', icon: Home, end: true },
    { to: '/app/calendario', label: 'Calendário', icon: CalendarDays },
    { to: '/app/pedidos', label: 'Pedidos', icon: HandHeart },
  ]
  if (ehGestorQualificacao(qualificacao)) {
    links.push({ to: `/app/celula/${celulaId}`, label: 'Minha Célula', icon: Users2 })
    links.push({ to: '/app/nova-celula', label: 'Criar célula', icon: PlusCircle })
    links.push({ to: '/app/aprovacoes', label: 'Aprovações', icon: UserCheck })
    links.push({ to: '/app/testemunhos', label: 'Testemunhos', icon: Sparkles })
    links.push({ to: '/app/vidas', label: 'Vidas', icon: Heart })
  }
  return links
}

export function TopBar() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [drawerAberto, setDrawerAberto] = useState(false)

  const podeAdmin = ehAdmin(usuario?.nivelAcesso)
  // Perfil é neutro (acessado pelo menu do avatar) — não acende nenhum contexto.
  const contexto = pathname.startsWith('/app/admin')
    ? 'admin'
    : pathname === '/app/perfil'
      ? null
      : 'membro'
  // No contexto admin o rail cuida da navegação; no membro, os links de participante.
  const links = contexto === 'membro' ? linksPorPapel(usuario) : []

  function trocarContexto(id) {
    if (id === 'admin') navigate('/app/admin/usuarios')
    else navigate('/app')
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-2.5">
          <div className="flex items-center gap-2">
            {links.length > 0 && (
              <button
                type="button" aria-label="Abrir menu" onClick={() => setDrawerAberto(true)}
                className="-ml-1 rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Link to="/app" aria-label="Ir para o início" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <Logo />
            </Link>
            {podeAdmin && (
              <div className="ml-1">
                <ContextSwitcher
                  contexto={contexto}
                  onChange={trocarContexto}
                  podeAdmin={podeAdmin}
                  temCelula={!!usuario?.celulaId}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {links.length > 0 && (
              <nav className="mr-2 hidden items-center gap-1 md:flex" aria-label="Navegação principal">
                {links.map(({ to, label, icon: Icon, end }) => (
                  <Fragment key={to}>
                    <NavLink
                      to={to} end={end}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          isActive ? 'bg-brand text-on-brand' : 'text-text-muted hover:bg-surface hover:text-text'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </NavLink>
                  </Fragment>
                ))}
              </nav>
            )}
            <NotificacoesSino />
            <AvatarMenu />
          </div>
        </div>
      </header>
      <NavDrawer open={drawerAberto} onClose={() => setDrawerAberto(false)} links={links} />
    </>
  )
}
