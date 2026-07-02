import { describe, it, expect } from 'vitest'
import { chaveDiaLocal, formatarDataCurta } from '../src/lib/datas.js'

describe('chaveDiaLocal', () => {
  it('retorna AAAA-MM-DD usando componentes locais', () => {
    const d = new Date(2026, 6, 9, 19, 0, 0) // month 6 = julho
    expect(chaveDiaLocal(d)).toBe('2026-07-09')
  })
})

describe('formatarDataCurta', () => {
  it('retorna dd/mm/aaaa a partir de um ISO', () => {
    expect(formatarDataCurta('2026-07-01T10:00:00')).toBe('01/07/2026')
  })
})
