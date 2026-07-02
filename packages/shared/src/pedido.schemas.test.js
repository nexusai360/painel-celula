import { describe, it, expect } from 'vitest'
import { pedidoCreateSchema, pedidoUpdateSchema } from './pedido.schemas.js'

describe('pedidoCreateSchema', () => {
  it('aceita título válido e detalhes opcionais', () => {
    expect(pedidoCreateSchema.safeParse({ titulo: 'Cura' }).success).toBe(true)
    expect(pedidoCreateSchema.safeParse({ titulo: 'Cura', detalhes: 'orar por saúde' }).success).toBe(true)
    expect(pedidoCreateSchema.safeParse({ titulo: 'Cura', testemunhar: true }).success).toBe(true)
  })
  it('rejeita título vazio', () => {
    expect(pedidoCreateSchema.safeParse({ titulo: '' }).success).toBe(false)
  })
  it('rejeita título apenas com espaços em branco', () => {
    expect(pedidoCreateSchema.safeParse({ titulo: '   ' }).success).toBe(false)
  })
  it('rejeita título acima de 100 e detalhes acima de 500', () => {
    expect(pedidoCreateSchema.safeParse({ titulo: 'a'.repeat(101) }).success).toBe(false)
    expect(pedidoCreateSchema.safeParse({ titulo: 'ok', detalhes: 'a'.repeat(501) }).success).toBe(false)
  })
})

describe('pedidoUpdateSchema', () => {
  it('exige título', () => {
    expect(pedidoUpdateSchema.safeParse({ detalhes: 'x' }).success).toBe(false)
    expect(pedidoUpdateSchema.safeParse({ titulo: 'novo' }).success).toBe(true)
  })
})
