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

  it('cadastra um membro sem qrToken (201) com AUTO-LOGIN e pendente', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Teste', email, senha: '123456' }
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toBeTypeOf('string')   // auto-login
    expect(body.pendente).toBe(true)
    expect(body.usuario.papel).toBe('MEMBRO')
    expect(body.usuario.senhaHash).toBeUndefined()
    const criado = await prisma.user.findUnique({ where: { email } })
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
    // Via QR válido = confiança: já aprovado e vinculado (sem aprovação de líder).
    expect(res.json().pendente).toBe(false)
    const criado = await prisma.user.findUnique({ where: { email: membroEmail } })
    expect(criado.celulaId).toBe(celulaId)
    expect(criado.aprovado).toBe(true)
  })

  it('rejeita qrToken desconhecido (404)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Xz', email: `qrinexistente${sufixo}@ex.com`, senha: '123456', qrToken: 'qr-inexistente-xyz' }
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ erro: 'Célula não encontrada' })
  })

  it('login de conta pendente é permitido (200) — entra na área travada', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email, senha: '123456' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBeTypeOf('string')
    expect(res.json().usuario.aprovado).toBe(false)
  })

  it('pendente é bloqueado em rota protegida sem permitirPendente (403)', async () => {
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha: '123456' } })
    const token = login.json().token
    // /usuarios exige ADMIN e não permite pendente → 403
    const res = await app.inject({ method: 'GET', url: '/usuarios', headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(403)
    // mas /auth/me (permitirPendente) funciona
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${token}` } })
    expect(me.statusCode).toBe(200)
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
