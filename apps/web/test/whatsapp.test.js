import { describe, it, expect } from 'vitest'
import { formatarWhatsapp, paraWhatsappLink } from '../src/lib/whatsapp.js'
describe('whatsapp', () => {
  it('formata E.164 BR para exibição', () => {
    expect(formatarWhatsapp('5562999999999')).toBe('(62) 99999-9999')
  })
  it('gera link wa.me', () => {
    expect(paraWhatsappLink('5562999999999')).toBe('https://wa.me/5562999999999')
  })
})
