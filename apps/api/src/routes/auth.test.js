import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()
const email = `teste${sufixo}@ex.com`
const membroEmail = `membro${sufixo}@ex.com`
const inativoEmail = `inativo${sufixo}@ex.com`

let celulaId

beforeAll(async () => {
  app = buildApp()

  // Cria célula para testes de qrToken
  const celula = await prisma.celula.create({
    data: {
      nome: `Célula Teste ${sufixo}`,
      qrToken: `qr-test-${sufixo}`,
      diaSemana: 4,
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2026-07-02T19:30:00')
    }
  })
  celulaId = celula.id

  // Cria usuário inativo (mas aprovado) para testar o bloqueio de "desativado"
  await prisma.user.create({
    data: {
      nome: 'Inativo Teste',
      email: inativoEmail,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO',
      ativo: false,
      aprovado: true
    }
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [email, membroEmail, inativoEmail] } } })
  if (celulaId) await prisma.celula.deleteMany({ where: { id: celulaId } })
  await app.close()
  await prisma.$disconnect()
})

describe('auth', () => {
  it('rejeita cadastro inválido (400)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'X', email: 'nao-email', senha: '123' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('cadastra um membro sem qrToken (201) como PENDENTE, sem token', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Teste', email, senha: '123456' }
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.pendente).toBe(true)
    expect(body.token).toBeUndefined()
    // A conta é criada como MEMBRO e ainda não aprovada.
    const criado = await prisma.user.findUnique({ where: { email } })
    expect(criado.papel).toBe('MEMBRO')
    expect(criado.aprovado).toBe(false)
  })

  it('rejeita e-mail duplicado (409)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Teste', email, senha: '123456' }
    })
    expect(res.statusCode).toBe(409)
  })

  it('cadastra membro com qrToken válido (201) e vincula à célula', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Membro QR', email: membroEmail, senha: 'senha123', qrToken: `qr-test-${sufixo}` }
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().pendente).toBe(true)
    // Vínculo com a célula é gravado mesmo estando pendente de aprovação.
    const criado = await prisma.user.findUnique({ where: { email: membroEmail } })
    expect(criado.celulaId).toBe(celulaId)
    expect(criado.aprovado).toBe(false)
  })

  it('rejeita qrToken desconhecido (404)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Xz', email: `qrinexistente${sufixo}@ex.com`, senha: '123456', qrToken: 'qr-inexistente-xyz' }
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ erro: 'Célula não encontrada' })
  })

  it('bloqueia login de conta ainda não aprovada (403)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email, senha: '123456' }
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().pendente).toBe(true)
  })

  it('faz login (200) após aprovação e acessa /auth/me com o token', async () => {
    // Um admin aprova a conta antes do login.
    await prisma.user.update({ where: { email }, data: { aprovado: true } })
    const login = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email, senha: '123456' }
    })
    expect(login.statusCode).toBe(200)
    expect(login.json().usuario.senhaHash).toBeUndefined()
    const token = login.json().token

    const me = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(me.statusCode).toBe(200)
    expect(me.json().usuario.email).toBe(email)
  })

  it('rejeita login com senha errada (401)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email, senha: 'errada' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('bloqueia login de usuário inativo (403)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: inativoEmail, senha: 'senha123' }
    })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ erro: 'Usuário desativado' })
  })

  it('rejeita e-mail inexistente no login (401)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'naoexiste-xyz@ex.com', senha: '123456' }
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ erro: 'Credenciais inválidas' })
  })

  it('login de conta sem senha (Google) orienta a entrar com Google (401)', async () => {
    const emailG = `google-only-${sufixo}@ex.com`
    await prisma.user.create({
      data: { nome: 'Conta Google', email: emailG, papel: 'MEMBRO', googleConectado: true }
    })
    const res = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email: emailG, senha: 'qualquer' }
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().erro).toMatch(/Google/i)
    await prisma.user.deleteMany({ where: { email: emailG } })
  })

  it('bloqueia /auth/me sem token (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})
