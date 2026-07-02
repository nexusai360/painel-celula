import { describe, it, expect } from 'vitest'
import { ehCasadoInicial, mapBackEstadoCivil } from './estadoCivil.js'

describe('estadoCivil', () => {
  it('ehCasadoInicial cobre casado e união estável', () => {
    expect(ehCasadoInicial('CASADO')).toBe(true)
    expect(ehCasadoInicial('UNIAO_ESTAVEL')).toBe(true)
    expect(ehCasadoInicial('SOLTEIRO')).toBe(false)
    expect(ehCasadoInicial(null)).toBe(false)
  })
  it('sem transição não envia (preserva legado)', () => {
    expect(mapBackEstadoCivil(true, true)).toBeUndefined()
    expect(mapBackEstadoCivil(false, false)).toBeUndefined()
  })
  it('transições gravam o enum certo', () => {
    expect(mapBackEstadoCivil(false, true)).toBe('CASADO')
    expect(mapBackEstadoCivil(true, false)).toBe('SOLTEIRO')
  })
})
