import { NavLink, Outlet } from 'react-router-dom'
import { UserCheck, Users2, Megaphone } from 'lucide-react'

const ITENS = [
  { to: '/app/admin/usuarios', label: 'Usuários', icon: UserCheck },
  { to: '/app/admin/celulas', label: 'Células', icon: Users2 },
  { to: '/app/admin/avisos', label: 'Avisos', icon: Megaphone },
]

function linkCls({ isActive }) {
  return `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
    isActive ? 'bg-card text-text shadow-sm ring-1 ring-border' : 'text-text-muted hover:text-text hover:bg-surface'
  }`
}

export function AdminLayout() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Sub-nav: rail lateral no desktop, barra rolável no mobile */}
      <div className="lg:flex lg:gap-8">
        <aside className="mb-4 lg:mb-0 lg:w-56 lg:shrink-0">
          <div className="mb-4 hidden items-center gap-2 px-1 lg:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <UserCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-bold text-text">Administração</span>
          </div>
          <nav
            aria-label="Administração"
            className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 lg:flex-col lg:bg-transparent lg:p-0"
          >
            {ITENS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkCls}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
