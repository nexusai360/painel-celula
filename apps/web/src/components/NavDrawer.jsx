import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

export function NavDrawer({ open, onClose, links }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} aria-hidden="true"
          />
          <motion.nav
            aria-label="Navegação principal"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80%] border-r border-border bg-card p-4 md:hidden"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
          >
            <div className="flex flex-col gap-1 pt-2">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to} to={to} end={end} onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand text-on-brand' : 'text-text-muted hover:bg-surface hover:text-text'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}
