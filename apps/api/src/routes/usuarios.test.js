import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()
const emailAdmin = `admin-usr-${sufixo}@ex.com`
const emailMembro = `membro-usr-${sufixo}@ex.com`
let adminToken, membroToken

beforeAll(async () => {
  app = buildApp()
  await app.ready()
  const admin = await prisma.user.create({
    data: { nome: 'Admin Usr', email: emailAdmin, senhaHash: await hashSenha('123456'), papel: 'ADMIN' }
  })
  const membro = await prisma.user.create({
    data: { nome: 'Zaqueu Teste', email: emailMembro, senhaHash: await hashSenha('123456'), papel: 'MEMBRO' }
  })
  adminToken = app.jwt.sign({ id: admin.id, papel: admin.papel, celulaId: null })
  membroToken = app.jwt.sign({ id: membro.id, papel: membro.papel, celulaId: null })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailAdmin, emailMembro] } } })
  await app.close()
  await prisma.$disconnect()
})

describe('GET /usuarios', () => {
  it('admin lista usuários sem expor senhaHash', async () => {
    const res = await app.inject({
      method: 'GET', url: '/usuarios', headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { usuarios } = res.json()
    expect(Array.isArray(usuarios)).toBe(true)
    expect(usuarios.every((u) => u.senhaHash === undefined)).toBe(true)
  })

  it('admin busca por nome', async () => {
    const res = await app.inject({
      method: 'GET', url: '/usuarios?busca=Zaqueu', headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { usuarios } = res.json()
    expect(usuarios.some((u) => u.email === emailMembro)).toBe(true)
  })

  it('membro não pode listar usuários → 403', async () => {
    const res = await app.inject({
      method: 'GET', url: '/usuarios', headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('PUT /usuarios/:id', () => {
  const suf = `put-${Date.now()}`
  const qrCel = `qrput-${suf}`
  const emailsCriados = [`alvo-${suf}@t.com`, `liderput-${suf}@t.com`, `ocupado-${suf}@t.com`]
  let alvoId, adminId, liderId, emailOcupado

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: emailAdmin } })
    adminId = admin.id
    const alvo = await prisma.user.create({ data: { nome: 'Alvo', email: `alvo-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' } })
    alvoId = alvo.id
    const cel = await prisma.celula.create({ data: { nome: `Cel ${suf}`, qrToken: qrCel, diaSemana: 1, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-09-01T19:30:00') } })
    const lider = await prisma.user.create({ data: { nome: 'Lider Put', email: `liderput-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId: cel.id } })
    liderId = lider.id
    await prisma.celula.update({ where: { id: cel.id }, data: { liderId: lider.id } })
    const ocupado = await prisma.user.create({ data: { nome: 'Ocupado', email: `ocupado-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' } })
    emailOcupado = ocupado.email
  })

  afterAll(async () => {
    await prisma.celula.deleteMany({ where: { qrToken: qrCel } })
    await prisma.user.deleteMany({ where: { email: { in: emailsCriados } } })
  })

  it('admin edita nome e whatsapp', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { nome: 'Alvo Novo', whatsapp: '62999998888' } })
    expect(res.statusCode).toBe(200)
    expect(res.json().usuario.nome).toBe('Alvo Novo')
    expect(res.json().usuario.whatsapp).toMatch(/^55/)
  })
  it('e-mail já em uso → 409', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { email: emailOcupado } })
    expect(res.statusCode).toBe(409)
  })
  it('inativa e reativa', async () => {
    const off = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: false } })
    expect(off.statusCode).toBe(200)
    expect(off.json().usuario.ativo).toBe(false)
    const on = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: true } })
    expect(on.json().usuario.ativo).toBe(true)
  })
  it('admin não pode inativar a si mesmo → 400', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${adminId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: false } })
    expect(res.statusCode).toBe(400)
  })
  it('não pode inativar o líder atual de uma célula → 409', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${liderId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: false } })
    expect(res.statusCode).toBe(409)
  })
  it('não-admin → 403', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${membroToken}` }, payload: { nome: 'X' } })
    expect(res.statusCode).toBe(403)
  })
  it('alvo inexistente → 404', async () => {
    const res = await app.inject({ method: 'PUT', url: '/usuarios/nao-existe', headers: { authorization: `Bearer ${adminToken}` }, payload: { nome: 'X' } })
    expect(res.statusCode).toBe(404)
  })
})
