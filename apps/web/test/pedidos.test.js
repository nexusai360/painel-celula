import { describe, it, expect } from 'vitest'
import { agruparPedidos } from '../src/lib/pedidos.js'

const lista = [
  { id: 'a', status: 'ATENDIDO' },
  { id: 'b', status: 'ATIVO' },
  { id: 'c', status: 'ATENDIDO' },
  { id: 'd', status: 'ATIVO' }
]

describe('agruparPedidos', () => {
  it('separa ativos e atendidos preservando a ordem', () => {
    const { ativos, atendidos } = agruparPedidos(lista)
    expect(ativos.map((p) => p.id)).toEqual(['b', 'd'])
    expect(atendidos.map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('renderização em fila coloca ativos antes dos atendidos', () => {
    const { ativos, atendidos } = agruparPedidos(lista)
    expect([...ativos, ...atendidos].map((p) => p.id)).toEqual(['b', 'd', 'a', 'c'])
  })
})
