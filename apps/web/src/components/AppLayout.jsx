import { Outlet } from 'react-router-dom'
import { EncontrosProvider } from '../context/EncontrosContext.jsx'
import { TopBar } from './TopBar.jsx'

export function AppLayout() {
  return (
    <EncontrosProvider>
      <div className="min-h-dvh bg-background">
        <TopBar />
        <main className="mx-auto w-full max-w-3xl px-5 py-6"><Outlet /></main>
      </div>
    </EncontrosProvider>
  )
}
