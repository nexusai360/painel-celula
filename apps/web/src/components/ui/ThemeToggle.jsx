import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'

// Toggle simples claro/escuro — usado nas telas de autenticação (login/cadastro).
// Na área logada, o tema (com opção "sistema") fica no menu do avatar.
export function ThemeToggle() {
  const { efetivo, definirModo } = useTheme()
  const escuro = efetivo === 'dark'
  return (
    <button
      type="button"
      onClick={() => definirModo(escuro ? 'light' : 'dark')}
      aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-text-muted transition-colors hover:text-brand cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {escuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
