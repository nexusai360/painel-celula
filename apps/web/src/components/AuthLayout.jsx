import { Logo } from './ui/Logo.jsx'
import { ThemeToggle } from './ui/ThemeToggle.jsx'

export function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10">
      {/* brilho sutil da marca no topo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-soft/20 to-transparent"
      />
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  )
}
