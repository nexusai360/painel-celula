import { describe, it, expect } from 'vitest'
import { temNivel, PAPEL_RANK } from './roles.js'

describe('temNivel', () => {
  it('ADMIN satisfaz qualquer nível', () => {
    expect(temNivel('ADMIN', 'MEMBRO')).toBe(true)
    expect(temNivel('ADMIN', 'LIDER')).toBe(true)
    expect(temNivel('ADMIN', 'ADMIN')).toBe(true)
  })
  it('LIDER satisfaz MEMBRO e LIDER, mas não ADMIN', () => {
    expect(temNivel('LIDER', 'MEMBRO')).toBe(true)
    expect(temNivel('LIDER', 'LIDER')).toBe(true)
    expect(temNivel('LIDER', 'ADMIN')).toBe(false)
  })
  it('MEMBRO só satisfaz MEMBRO', () => {
    expect(temNivel('MEMBRO', 'MEMBRO')).toBe(true)
    expect(temNivel('MEMBRO', 'LIDER')).toBe(false)
  })
  it('expõe ranking', () => {
    expect(PAPEL_RANK).toEqual({ MEMBRO: 1, LIDER: 2, ADMIN: 3, SUPER_ADMIN: 4 })
  })
})
