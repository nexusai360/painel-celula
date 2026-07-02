import { describe, it, expect } from 'vitest'
import { montarEvento } from './evento.js'

describe('montarEvento', () => {
  it('monta o evento com título, fuso e duração de 90min', () => {
    const ev = montarEvento(
      { data: new Date('2026-07-02T19:30:00Z'), observacao: 'Tema: gratidão' },
      'Célula Esperança'
    )
    expect(ev.summary).toBe('Encontro — Célula Esperança')
    expect(ev.description).toBe('Tema: gratidão')
    expect(ev.start.timeZone).toBe('America/Sao_Paulo')
    expect(new Date(ev.end.dateTime) - new Date(ev.start.dateTime)).toBe(90 * 60 * 1000)
  })
})
