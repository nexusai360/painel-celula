import { describe, it, expect } from 'vitest'
import { montarPayloadCelula } from './celulaPayload.js'

describe('montarPayloadCelula', () => {
  it('coage números e NÃO usa toISOString (preserva wall-clock)', () => {
    const p = montarPayloadCelula({
      nome: 'Célula X', diaSemana: '3', frequenciaDias: '7',
      dataPrimeiroEncontro: '2026-07-08T21:00', numero: '10',
    })
    expect(p.diaSemana).toBe(3)
    expect(p.frequenciaDias).toBe(7)
    // 21:00 de uma quarta NÃO pode virar o dia seguinte (nada de toISOString/UTC shift)
    expect(p.dataPrimeiroEncontro).toBe('2026-07-08T21:00')
    expect(p.numero).toBe('10')
  })
  it('sem número grava S/N', () => {
    const p = montarPayloadCelula({ nome: 'X', diaSemana: 1, frequenciaDias: 7, dataPrimeiroEncontro: '2026-01-05T20:00', semNumero: true, numero: '' })
    expect(p.numero).toBe('S/N')
  })
  it('campos vazios viram undefined (omitidos)', () => {
    const p = montarPayloadCelula({ nome: 'X', diaSemana: 1, frequenciaDias: 7, dataPrimeiroEncontro: '2026-01-05T20:00', descricao: '', cep: '' })
    expect(p.descricao).toBeUndefined()
    expect(p.cep).toBeUndefined()
  })
})
