import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { apiListarEncontros } from '../lib/api.js'

const Ctx = createContext(null)
export const useEncontros = () => useContext(Ctx)

export function EncontrosProvider({ children }) {
  const { usuario } = useAuth()
  // Contexto de encontros: célula onde é membro OU, se só lidera/criou, a principal.
  const celulaId = usuario?.celulaId ?? usuario?.minhasCelulas?.[0]?.id ?? null
  const [encontros, setEncontros] = useState(null)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    if (!celulaId) { setEncontros([]); return }
    try { setEncontros(await apiListarEncontros(celulaId)) }
    catch { setErro('Não foi possível carregar as reuniões.') }
  }, [celulaId])

  useEffect(() => { setEncontros(null); setErro(''); recarregar() }, [recarregar])

  const atualizarPresenca = useCallback((encontroId, marcado, totalPresencas) => {
    setEncontros(prev => (prev ?? []).map(e => e.id === encontroId
      ? { ...e, marcadoPorMim: marcado, marcadaEm: marcado ? (e.marcadaEm ?? new Date().toISOString()) : null,
          _count: { ...e._count, presencas: totalPresencas ?? e._count?.presencas } }
      : e))
  }, [])

  return <Ctx.Provider value={{ encontros, carregando: encontros === null && !!celulaId, erro, recarregar, atualizarPresenca }}>{children}</Ctx.Provider>
}
