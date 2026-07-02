import { describe, it, expect } from 'vitest'
import { mascaraCep, mascaraTelefone, soDigitos } from './mascaras.js'

describe('mascaras', () => {
  it('CEP formata e tolera parcial/sujo', () => {
    expect(mascaraCep('74000000')).toBe('74000-000')
    expect(mascaraCep('7400')).toBe('7400')
    expect(mascaraCep('74.000-000')).toBe('74000-000')
    expect(mascaraCep('740000009999')).toBe('74000-000')
  })
  it('telefone celular e fixo', () => {
    expect(mascaraTelefone('62999998888')).toBe('(62) 99999-8888')
    expect(mascaraTelefone('6233334444')).toBe('(62) 3333-4444')
    expect(mascaraTelefone('')).toBe('')
  })
  it('soDigitos limpa', () => {
    expect(soDigitos('(62) 9 9999-8888')).toBe('62999998888')
  })
})
