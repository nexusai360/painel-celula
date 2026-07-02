import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const CHAVE = 'icelula:tema'

// modo ∈ 'light' | 'dark' | 'sistema'
function modoInicial() {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'light' || salvo === 'dark' || salvo === 'sistema') return salvo
  return 'sistema'
}

function sistemaEscuro() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function calcularEfetivo(modo) {
  if (modo === 'sistema') return sistemaEscuro() ? 'dark' : 'light'
  return modo
}

export function ThemeProvider({ children }) {
  const [modo, setModo] = useState(modoInicial)
  const [efetivo, setEfetivo] = useState(() => calcularEfetivo(modoInicial()))

  useEffect(() => {
    const aplicar = () => {
      const ef = calcularEfetivo(modo)
      setEfetivo(ef)
      document.documentElement.classList.toggle('dark', ef === 'dark')
    }
    aplicar()
    localStorage.setItem(CHAVE, modo)

    // No modo 'sistema', acompanha mudanças da preferência do SO em tempo real.
    if (modo === 'sistema') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', aplicar)
      return () => mq.removeEventListener('change', aplicar)
    }
  }, [modo])

  const definirModo = (m) => setModo(m)

  return (
    <ThemeContext.Provider value={{ modo, efetivo, definirModo }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}
