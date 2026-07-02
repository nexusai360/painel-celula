import { createContext, useContext, useEffect, useState } from 'react'
import { apiConfig } from '../lib/api.js'

const ConfigContext = createContext({ googleHabilitado: false })

export function ConfigProvider({ children }) {
  const [googleHabilitado, setGoogleHabilitado] = useState(false)

  useEffect(() => {
    apiConfig()
      .then((cfg) => setGoogleHabilitado(!!cfg.googleHabilitado))
      .catch(() => setGoogleHabilitado(false))
  }, [])

  return (
    <ConfigContext.Provider value={{ googleHabilitado }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}
