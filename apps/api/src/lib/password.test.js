import { describe, it, expect } from 'vitest'
import { hashSenha, verificarSenha } from './password.js'

describe('password', () => {
  it('gera hash diferente do texto e valida corretamente', async () => {
    const hash = await hashSenha('segredo123')
    expect(hash).not.toBe('segredo123')
    expect(await verificarSenha('segredo123', hash)).toBe(true)
    expect(await verificarSenha('errada', hash)).toBe(false)
  })
})
