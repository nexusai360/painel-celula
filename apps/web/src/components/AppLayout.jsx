import { Outlet, useLocation } from 'react-router-dom'
import { EncontrosProvider } from '../context/EncontrosContext.jsx'
import { TopBar } from './TopBar.jsx'
import { BannerBar } from './BannerBar.jsx'

export function AppLayout() {
  const { pathname } = useLocation()
  // Área de Administração respira em largura maior (listas densas); participante fica confortável em max-w-3xl.
  const larguraMain = pathname.startsWith('/app/admin') ? 'max-w-6xl' : 'max-w-3xl'
  return (
    <EncontrosProvider>
      <div className="min-h-dvh bg-background">
        <TopBar />
        <BannerBar />
        <main className={`mx-auto w-full ${larguraMain} px-5 py-6`}><Outlet /></main>
      </div>
    </EncontrosProvider>
  )
}
