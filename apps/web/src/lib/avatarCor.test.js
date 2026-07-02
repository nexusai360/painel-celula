import { describe, it, expect } from 'vitest'
import { corDoNome, iniciais } from './avatarCor.js'

describe('avatarCor', () => {
  it('é determinístico e retorna hsl', () => {
    const a = corDoNome('Maria Laura')
    const b = corDoNome('Maria Laura')
    expect(a.bg).toBe(b.bg)
    expect(a.bg).toMatch(/^hsl\(\d+, 22%, 42%\)$/)
  })
  it('nomes diferentes → hues diferentes (na maioria)', () => {
    expect(corDoNome('Ana').bg).not.toBe(corDoNome('Bruno Silva Oliveira').bg)
  })
  it('iniciais', () => {
    expect(iniciais('Maria Laura Zanini')).toBe('MZ')
    expect(iniciais('Ana')).toBe('AN')
    expect(iniciais('')).toBe('?')
  })
})
