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
  const celula = { id: 'c1', lideres: [{ id: 'u1' }] }

  it('ADMIN+ sempre pode, independente dos líderes', () => {
    expect(podeGerenciarCelula({ id: 'qualquer', nivelAcesso: 'ADMIN' }, celula)).toBe(true)
    expect(podeGerenciarCelula({ id: 'outro', nivelAcesso: 'SUPER_ADMIN' }, { lideres: [] })).toBe(true)
  })

  it('líder pode se estiver entre os líderes da célula', () => {
    expect(podeGerenciarCelula({ id: 'u1', nivelAcesso: 'USUARIO' }, celula)).toBe(true)
  })

  it('não pode se não for líder da célula', () => {
    expect(podeGerenciarCelula({ id: 'u2', nivelAcesso: 'USUARIO' }, celula)).toBe(false)
  })

  it('não pode quando a célula não tem líderes', () => {
    expect(podeGerenciarCelula({ id: 'u1', nivelAcesso: 'USUARIO' }, { lideres: [] })).toBe(false)
  })
})
