import { describe, it, expect } from 'vitest'
import { cifrar, decifrar } from './cripto.js'

const CHAVE = '0'.repeat(64) // 32 bytes em hex

describe('cripto AES-256-GCM', () => {
  it('cifra e decifra de volta (round-trip)', () => {
    const blob = cifrar('refresh-token-secreto', CHAVE)
    expect(blob).not.toContain('refresh-token-secreto')
    expect(blob.split(':')).toHaveLength(3)
    expect(decifrar(blob, CHAVE)).toBe('refresh-token-secreto')
  })

  it('produz saídas diferentes a cada chamada (IV aleatório)', () => {
    expect(cifrar('x', CHAVE)).not.toBe(cifrar('x', CHAVE))
  })

  it('falha ao decifrar com chave errada', () => {
    const blob = cifrar('x', CHAVE)
    expect(() => decifrar(blob, '1'.repeat(64))).toThrow()
  })
})
