import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { CalendarDays, Home, Users2, HandHeart, Sparkles, Heart, Menu } from 'lucide-react'
import { Logo } from './ui/Logo.jsx'
import { AvatarMenu } from './AvatarMenu.jsx'
import { NavDrawer } from './NavDrawer.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Fonte única dos itens de navegação por papel (consumida pela TopBar e pelo NavDrawer).
export function linksPorPapel(usuario) {
  const { papel, celulaId } = usuario || {}
  if (papel === 'ADMIN') return [{ to: '/app/celulas', label: 'Células', icon: Users2 }]
  if (!celulaId) return []
  const links = [
    { to: '/app', label: 'Início', icon: Home, end: true },
    { to: '/app/calendario', label: 'Calendário', icon: CalendarDays },
    { to: '/app/pedidos', label: 'Pedidos', icon: HandHeart },
  ]
  if (papel === 'LIDER') {
    links.push({ to: `/app/celula/${celulaId}`, label: 'Minha Célula', icon: Users2 })
    links.push({ to: '/app/testemunhos', label: 'Testemunhos', icon: Sparkles })
    links.push({ to: '/app/vidas', label: 'Vidas', icon: Heart })
  }
  return links
}

export function TopBar() {
  const { usuario } = useAuth()
  const links = linksPorPapel(usuario)
  const [drawerAberto, setDrawerAberto] = useState(false)

  return (
    <>
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-between px-5 py-2 md:px-[25px]">
        <div className="flex items-center gap-1.5">
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
        </div>

        <div className="flex items-center gap-1">
          {links.length > 0 && (
            <nav className="mr-2 hidden items-center gap-1 md:flex" aria-label="Navegação principal">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isActive ? 'bg-brand text-on-brand' : 'text-text-muted hover:bg-surface hover:text-text'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
          <AvatarMenu />
        </div>
      </div>
    </header>
    <NavDrawer open={drawerAberto} onClose={() => setDrawerAberto(false)} links={links} />
    </>
  )
}
