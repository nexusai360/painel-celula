import { describe, it, expect } from 'vitest'
import { dataUtcDaString } from './celulas.js'

// Prova a correção de fuso (R2#2): o wall-clock digitado é interpretado em UTC pelos
// seus componentes, então a HORA nunca desloca o DIA da semana (o bug do falso-positivo).
describe('dataUtcDaString (TZ-safe)', () => {
  it('a hora não muda o dia da semana (nem perto da meia-noite)', () => {
    const dia = dataUtcDaString('2026-07-08T00:30').getUTCDay()
    expect(dataUtcDaString('2026-07-08T21:00').getUTCDay()).toBe(dia)
    expect(dataUtcDaString('2026-07-08T23:59').getUTCDay()).toBe(dia)
  })
  it('armazena a hora exatamente como digitada (UTC-pinada)', () => {
    const d = dataUtcDaString('2026-07-08T21:00')
    expect(d.getUTCHours()).toBe(21)
    expect(d.getUTCMinutes()).toBe(0)
    expect(d.getUTCDate()).toBe(8)
  })
})
