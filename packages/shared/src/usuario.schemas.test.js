import { describe, it, expect } from 'vitest'
import { usuarioAdminUpdateSchema } from './usuario.schemas.js'

describe('usuarioAdminUpdateSchema', () => {
  it('aceita campos parciais válidos', () => {
    expect(usuarioAdminUpdateSchema.safeParse({}).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ nome: 'Ana' }).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ ativo: false }).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ email: 'a@b.com', whatsapp: '62999999999' }).success).toBe(true)
  })
  it('rejeita e-mail inválido e nome vazio', () => {
    expect(usuarioAdminUpdateSchema.safeParse({ email: 'nao-email' }).success).toBe(false)
    expect(usuarioAdminUpdateSchema.safeParse({ nome: '   ' }).success).toBe(false)
  })
})
