import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'

export function cifrar(texto, chaveHex) {
  const chave = Buffer.from(chaveHex, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, chave, iv)
  const enc = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decifrar(blob, chaveHex) {
  const chave = Buffer.from(chaveHex, 'hex')
  const [ivHex, tagHex, encHex] = blob.split(':')
  const decipher = createDecipheriv(ALGO, chave, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8')
}

export function chaveDeAmbiente() {
  const k = process.env.TOKEN_ENC_KEY || ''
  if (k.length < 64) throw new Error('TOKEN_ENC_KEY ausente ou curta (esperado 32 bytes em hex)')
  return k
}
