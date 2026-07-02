import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from './auth.schemas.js'

describe('registerSchema', () => {
  it('aceita cadastro válido com qrToken', () => {
    const r = registerSchema.safeParse({
      nome: 'Maria', email: 'maria@ex.com', senha: '123456', qrToken: 'celula-alfa'
    })
    expect(r.success).toBe(true)
  })

  it('aceita cadastro válido sem qrToken', () => {
    const r = registerSchema.safeParse({ nome: 'Ana', email: 'ana@ex.com', senha: '123456' })
    expect(r.success).toBe(true)
  })

  it('rejeita senha curta', () => {
    const r = registerSchema.safeParse({ nome: 'Jo', email: 'jo@ex.com', senha: '123' })
    expect(r.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const r = registerSchema.safeParse({ nome: 'Jo', email: 'nao-email', senha: '123456' })
    expect(r.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('aceita login válido', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', senha: 'x' })
    expect(r.success).toBe(true)
  })
})
