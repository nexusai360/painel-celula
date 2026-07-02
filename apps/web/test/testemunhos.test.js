import { describe, it, expect } from 'vitest'
import { agruparTestemunhos } from '../src/lib/testemunhos.js'

const lista = [
  { id: 'a', status: 'PENDENTE', criadoEm: '2026-07-03T10:00:00', concluidoEm: null },
  { id: 'b', status: 'PENDENTE', criadoEm: '2026-07-01T10:00:00', concluidoEm: null },
  { id: 'c', status: 'CONCLUIDO', criadoEm: '2026-06-20T10:00:00', concluidoEm: '2026-07-02T10:00:00' },
  { id: 'd', status: 'CONCLUIDO', criadoEm: '2026-06-20T10:00:00', concluidoEm: '2026-07-05T10:00:00' }
]

describe('agruparTestemunhos', () => {
  it('pendentes em fila (mais antigo primeiro)', () => {
    const { pendentes } = agruparTestemunhos(lista)
    expect(pendentes.map((t) => t.id)).toEqual(['b', 'a'])
  })
  it('concluídos por realização mais recente primeiro', () => {
    const { concluidos } = agruparTestemunhos(lista)
    expect(concluidos.map((t) => t.id)).toEqual(['d', 'c'])
  })
})
