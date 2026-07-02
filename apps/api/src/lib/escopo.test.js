import { describe, it, expect } from 'vitest'
import { slugify, gerarQrToken, podeGerenciarCelula } from './escopo.js'

describe('slugify', () => {
  it('converte para minúsculas', () => {
    expect(slugify('HELLO')).toBe('hello')
    expect(slugify('ABC')).toBe('abc')
  })

  it('remove acentos', () => {
    expect(slugify('célula')).toBe('celula')
    expect(slugify('ação')).toBe('acao')
    expect(slugify('João')).toBe('joao')
    expect(slugify('ênfase')).toBe('enfase')
  })

  it('substitui espaços por hífens', () => {
    expect(slugify('Célula da Fé')).toBe('celula-da-fe')
  })

  it('colapsa múltiplos separadores em um único hífen', () => {
    expect(slugify('olá   mundo')).toBe('ola-mundo')
    expect(slugify('a--b')).toBe('a-b')
  })

  it('remove hífens nas bordas', () => {
    expect(slugify('  celula  ')).toBe('celula')
    expect(slugify(' ação ')).toBe('acao')
  })

  it('mantém números', () => {
    expect(slugify('celula 1')).toBe('celula-1')
    expect(slugify('Grupo 3A')).toBe('grupo-3a')
  })

  it('substitui caracteres especiais por hífens', () => {
    expect(slugify('a&b')).toBe('a-b')
    expect(slugify('hello_world')).toBe('hello-world')
  })
})

describe('gerarQrToken', () => {
  it('concatena slug do nome com o sufixo via hífen', () => {
    expect(gerarQrToken('Célula da Fé', 'abc123')).toBe('celula-da-fe-abc123')
  })

  it('funciona com nome simples', () => {
    expect(gerarQrToken('Alpha', '1')).toBe('alpha-1')
  })

  it('funciona com sufixo numérico', () => {
    expect(gerarQrToken('Jovens', '42')).toBe('jovens-42')
  })
})

describe('podeGerenciarCelula', () => {
  const celula = { id: 'c1', liderId: 'u1' }

  it('ADMIN sempre pode, independente do liderId', () => {
    expect(podeGerenciarCelula({ id: 'qualquer', papel: 'ADMIN' }, celula)).toBe(true)
    expect(podeGerenciarCelula({ id: 'outro', papel: 'ADMIN' }, { liderId: null })).toBe(true)
  })

  it('LIDER pode se for o líder da célula', () => {
    expect(podeGerenciarCelula({ id: 'u1', papel: 'LIDER' }, celula)).toBe(true)
  })

  it('LIDER não pode se não for o líder', () => {
    expect(podeGerenciarCelula({ id: 'u2', papel: 'LIDER' }, celula)).toBe(false)
  })

  it('LIDER não pode quando celula.liderId é null', () => {
    expect(podeGerenciarCelula({ id: 'u1', papel: 'LIDER' }, { liderId: null })).toBe(false)
  })

  it('MEMBRO nunca pode, mesmo tendo o mesmo id que o lider', () => {
    expect(podeGerenciarCelula({ id: 'u1', papel: 'MEMBRO' }, celula)).toBe(false)
  })
})
