import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'

let app, token, userId
const jpeg = 'data:image/jpeg;base64,' + Buffer.from([0xFF,0xD8,0xFF,0x00]).toString('base64')

beforeAll(async () => {
  app = buildApp(); await app.ready()
  const u = await prisma.user.create({ data: { nome:'Teste', email:`p${Date.now()}@x.com`, senhaHash:'h', papel:'MEMBRO' } })
  userId = u.id
  token = app.jwt.sign({ id:u.id, papel:'MEMBRO', celulaId:null })
})
afterAll(async () => { await prisma.user.delete({ where:{ id:userId } }).catch(()=>{}); await app.close(); await prisma.$disconnect() })

function put(body) {
  return app.inject({ method:'PUT', url:'/perfil', headers:{ authorization:`Bearer ${token}` }, payload: body })
}

describe('PUT /perfil', () => {
  it('atualiza nome e normaliza whatsapp para E.164', async () => {
    const r = await put({ nome:'Ana Maria', whatsapp:'(62) 99999-9999' })
    expect(r.statusCode).toBe(200)
    const { usuario } = r.json()
    expect(usuario.nome).toBe('Ana Maria')
    expect(usuario.whatsapp).toBe('5562999999999')
    expect('celulaNome' in usuario).toBe(true)
    expect(usuario.senhaHash).toBeUndefined()
  })
  it('aceita avatar JPEG válido e limpa com null', async () => {
    expect((await put({ avatar: jpeg })).statusCode).toBe(200)
    const r = await put({ avatar: null }); expect(r.statusCode).toBe(200)
    expect(r.json().usuario.avatar).toBeNull()
  })
  it('rejeita avatar não-JPEG (prefixo) com 400', async () => {
    const png = 'data:image/png;base64,' + Buffer.from([0x89,0x50]).toString('base64')
    expect((await put({ avatar: png })).statusCode).toBe(400)
  })
  it('rejeita avatar com magic-bytes inválido (prefixo JPEG mas bytes errados)', async () => {
    const fake = 'data:image/jpeg;base64,' + Buffer.from([0x00,0x01,0x02]).toString('base64')
    const r = await put({ avatar: fake }); expect(r.statusCode).toBe(400)
    expect(r.json().erro).toBe('Imagem inválida')
  })
  it('exige autenticação', async () => {
    const r = await app.inject({ method:'PUT', url:'/perfil', payload:{ nome:'X' } })
    expect(r.statusCode).toBe(401)
  })
})
