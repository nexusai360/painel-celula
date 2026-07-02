import { describe, it, expect } from 'vitest'
import {
  usuarioAdminCreateSchema, usuarioAdminUpdateSchema, senhaResetSchema, normalizarWhatsapp,
} from '@icelula/shared'

describe('usuarioAdminCreateSchema', () => {
  it('aceita um usuário válido com defaults de qualificação/nível', () => {
    const r = usuarioAdminCreateSchema.safeParse({ nome: 'Ana Paula', email: 'ana@ex.com', senha: '123456' })
    expect(r.success).toBe(true)
    expect(r.data.qualificacao).toBe('MEMBRO')
    expect(r.data.nivelAcesso).toBe('USUARIO')
  })
  it('rejeita e-mail inválido e senha curta', () => {
    expect(usuarioAdminCreateSchema.safeParse({ nome: 'Ana', email: 'x', senha: '123456' }).success).toBe(false)
    expect(usuarioAdminCreateSchema.safeParse({ nome: 'Ana', email: 'a@b.com', senha: '123' }).success).toBe(false)
  })
  it('rejeita qualificação/nível fora do enum', () => {
    expect(usuarioAdminCreateSchema.safeParse({ nome: 'Ana', email: 'a@b.com', senha: '123456', qualificacao: 'REI' }).success).toBe(false)
    expect(usuarioAdminCreateSchema.safeParse({ nome: 'Ana', email: 'a@b.com', senha: '123456', nivelAcesso: 'DEUS' }).success).toBe(false)
  })
})

describe('validação de WhatsApp', () => {
  it('rejeita texto sem dígitos suficientes', () => {
    expect(usuarioAdminUpdateSchema.safeParse({ whatsapp: 'rfeqrfeqfeqr' }).success).toBe(false)
    expect(usuarioAdminUpdateSchema.safeParse({ whatsapp: '123' }).success).toBe(false)
  })
  it('aceita número BR e nulo/vazio', () => {
    expect(usuarioAdminUpdateSchema.safeParse({ whatsapp: '(62) 99999-9999' }).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ whatsapp: '' }).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ whatsapp: null }).success).toBe(true)
    expect(normalizarWhatsapp('(62) 99999-9999')).toBe('5562999999999')
  })
})

describe('senhaResetSchema', () => {
  it('exige ao menos 6 caracteres', () => {
    expect(senhaResetSchema.safeParse({ senha: 'abc' }).success).toBe(false)
    expect(senhaResetSchema.safeParse({ senha: 'abcdef' }).success).toBe(true)
  })
})
