import { describe, it, expect } from 'vitest'
import { agruparMembros } from '../src/lib/membros.js'

const lista = [
  { id: 'a', nome: 'Ana', ativo: true },
  { id: 'b', nome: 'Bia', ativo: false },
  { id: 'c', nome: 'Caio', ativo: true }
]

describe('agruparMembros', () => {
  it('separa ativos e inativos', () => {
    const { ativos, inativos } = agruparMembros(lista)
    expect(ativos.map((m) => m.id)).toEqual(['a', 'c'])
    expect(inativos.map((m) => m.id)).toEqual(['b'])
  })
  it('renderização coloca ativos antes dos inativos', () => {
    const { ativos, inativos } = agruparMembros(lista)
    expect([...ativos, ...inativos].map((m) => m.id)).toEqual(['a', 'c', 'b'])
  })
})
