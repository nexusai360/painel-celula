import { createContext, useContext, useEffect, useState } from 'react'
import { apiLogin, apiMe, apiRegister, getToken, setToken } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Ao montar, se houver token, recupera o usuário
  useEffect(() => {
    let ativo = true
    async function carregar() {
      if (!getToken()) {
        setCarregando(false)
        return
      }
      try {
        const u = await apiMe()
        if (ativo) setUsuario(u)
      } catch {
        setToken(null)
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  async function entrar(credenciais) {
    const { token, usuario: u } = await apiLogin(credenciais)
    setToken(token)
    setUsuario(u)
    return u
  }

  async function cadastrar(dados) {
    // O cadastro nasce pendente de aprovação: a API não devolve token.
    // Retornamos a resposta para a tela exibir a mensagem de "aguarde aprovação".
    return apiRegister(dados)
  }

  function sair() {
    setToken(null)
    setUsuario(null)
  }

  async function aplicarToken(token) {
    setToken(token)
    try {
      const u = await apiMe()
      setUsuario(u)
    } catch (err) {
      // Token inválido/expirado: não deixa estado de auth sujo
      setToken(null)
      setUsuario(null)
      throw err
    }
  }

  const aplicarUsuario = (u) => setUsuario(u)

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, cadastrar, sair, aplicarToken, aplicarUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
