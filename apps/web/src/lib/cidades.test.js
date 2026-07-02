import { describe, it, expect } from 'vitest'
import { CIDADES, filtrarCidades } from './cidades.js'

describe('cidades', () => {
  it('lista não vazia', () => {
    expect(CIDADES.length).toBeGreaterThan(20)
  })
  it('filtra por prefixo, ignorando acento/caixa', () => {
    expect(filtrarCidades('goi')).toContain('Goiânia')
    expect(filtrarCidades('GOIA')).toContain('Goiânia')
    expect(filtrarCidades('anap')).toContain('Anápolis')
  })
  it('sem query retorna tudo', () => {
    expect(filtrarCidades('')).toHaveLength(CIDADES.length)
  })
})
