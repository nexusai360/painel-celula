import { describe, it, expect } from 'vitest'
import { gerarDatasEncontros } from './cronograma.js'

describe('gerarDatasEncontros', () => {
  it('gera semanal (7 dias) preservando o horário', () => {
    const datas = gerarDatasEncontros({
      dataPrimeiroEncontro: new Date('2026-07-02T19:30:00'),
      frequenciaDias: 7,
      ateData: new Date('2026-07-23T23:59:59')
    })
    expect(datas.map((d) => d.toISOString())).toEqual([
      new Date('2026-07-02T19:30:00').toISOString(),
      new Date('2026-07-09T19:30:00').toISOString(),
      new Date('2026-07-16T19:30:00').toISOString(),
      new Date('2026-07-23T19:30:00').toISOString()
    ])
  })

  it('gera quinzenal (14 dias)', () => {
    const datas = gerarDatasEncontros({
      dataPrimeiroEncontro: new Date('2026-07-02T19:30:00'),
      frequenciaDias: 14,
      ateData: new Date('2026-08-01T00:00:00')
    })
    expect(datas).toHaveLength(3) // 02/07, 16/07, 30/07
  })

  it('retorna vazio se a primeira data já passou do limite', () => {
    expect(
      gerarDatasEncontros({
        dataPrimeiroEncontro: new Date('2026-09-01T19:30:00'),
        frequenciaDias: 7,
        ateData: new Date('2026-08-01T00:00:00')
      })
    ).toEqual([])
  })

  it('rejeita frequência inválida', () => {
    expect(() =>
      gerarDatasEncontros({
        dataPrimeiroEncontro: new Date('2026-07-02T19:30:00'),
        frequenciaDias: 0,
        ateData: new Date('2026-08-01T00:00:00')
      })
    ).toThrow('frequenciaDias deve ser > 0')
  })
})
