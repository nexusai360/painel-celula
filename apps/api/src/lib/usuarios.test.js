import { describe, it, expect } from 'vitest'
import { publico, publicoLeve } from './usuarios.js'

const base = { id:'u1', nome:'Ana', email:'a@x.com', senhaHash:'h', googleRefreshTokenEnc:'e', googleSub:'g', avatar:'data:image/jpeg;base64,AAAA', whatsapp:'5562999999999' }

describe('projeções de usuário', () => {
  it('publico remove segredos e mantém avatar/whatsapp', () => {
    const p = publico(base)
    expect(p.senhaHash).toBeUndefined()
    expect(p.googleRefreshTokenEnc).toBeUndefined()
    expect(p.avatar).toBe(base.avatar)
    expect(p.whatsapp).toBe(base.whatsapp)
  })
  it('publicoLeve remove avatar (anti-inflação em listas)', () => {
    const p = publicoLeve(base)
    expect(p.avatar).toBeUndefined()
    expect(p.senhaHash).toBeUndefined()
    expect(p.nome).toBe('Ana')
    expect(p.whatsapp).toBe('5562999999999')
  })
})
