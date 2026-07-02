import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { setGoogleApiParaTestes, limparGoogleApiParaTestes } from '../lib/google/api.js'
import { cifrar } from '../lib/google/cripto.js'

let app
const sufixo = Date.now()
const subGoogle = `sub-${sufixo}`
const emailGoogle = `novo-${sufixo}@gmail.com`
const emailDelete = `del-${sufixo}@gmail.com`
const subDelete = `sub-del-${sufixo}`
const emailReAuth = `reauth-${sufixo}@gmail.com`
const subReAuth = `sub-reauth-${sufixo}`
const emailUnverified = `unver-${sufixo}@test.com`
const subUnverified = `sub-unver-${sufixo}`
const emailConectar = `conectar-${sufixo}@test.com`
const subConectar = `sub-conectar-${sufixo}`
const emailGoogleConectar = `google-conectar-${sufixo}@gmail.com`
const emailDeleteGoogleOnly = `del-google-only-${sufixo}@gmail.com`
const subDeleteGoogleOnly = `sub-del-google-only-${sufixo}`
const emailConectarMismatch = `conectar-mismatch-${sufixo}@test.com`
const subConectarMismatch = `sub-conectar-mismatch-${sufixo}`

beforeAll(async () => {
  process.env.GOOGLE_OAUTH_ENABLED = 'true'
  process.env.GOOGLE_CLIENT_ID = 'cid'
  process.env.GOOGLE_CLIENT_SECRET = 'sec'
  process.env.TOKEN_ENC_KEY = '0'.repeat(64)
  process.env.WEB_URL = 'http://localhost:5173'
  app = buildApp(); await app.ready()
})
beforeEach(() => {
  setGoogleApiParaTestes({
    async montarAuthUrl({ state }) { return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` },
    async trocarCode() { return { sub: subGoogle, email: emailGoogle, nome: 'Novo Usuário', refreshToken: 'rt', emailVerificado: true } },
    async accessTokenDe() { return 'at' },
    async garantirCalendario() { return 'cal-icelula' },
    async criarEvento() { return 'gev' },
    async atualizarEvento() {}, async removerEvento() {}
  })
})
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailGoogle, emailDelete, emailReAuth, emailUnverified, emailConectar, emailGoogleConectar, emailDeleteGoogleOnly, emailConectarMismatch] } } })
  await app.close(); limparGoogleApiParaTestes()
  delete process.env.GOOGLE_OAUTH_ENABLED
})

describe('OAuth Google', () => {
  it('GET /auth/google retorna a url de consentimento', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
    expect(res.statusCode).toBe(200)
    expect(res.json().url).toContain('accounts.google.com')
  })

  it('callback cria usuário novo e redireciona com token no fragmento', async () => {
    const inicio = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
    const state = new URL(inicio.json().url).searchParams.get('state')
    const res = await app.inject({ method: 'GET', url: `/auth/google/callback?code=abc&state=${state}` })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toMatch(/\/auth\/google\/sucesso#token=/)
    const user = await prisma.user.findUnique({ where: { email: emailGoogle } })
    expect(user.googleConectado).toBe(true)
    expect(user.googleCalendarId).toBe('cal-icelula')
    expect(user.googleRefreshTokenEnc).not.toContain('rt') // cifrado
  })

  it('com a flag desligada retorna 503', async () => {
    process.env.GOOGLE_OAUTH_ENABLED = 'false'
    const res = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
    expect(res.statusCode).toBe(503)
    process.env.GOOGLE_OAUTH_ENABLED = 'true'
  })

  describe('DELETE /google — desconectar integração', () => {
    it('conta com senha: limpa campos Google e remove googleSub (identidade de login)', async () => {
      const enc = cifrar('rt', '0'.repeat(64))
      const user = await prisma.user.create({
        data: {
          nome: 'Del User',
          email: emailDelete,
          papel: 'MEMBRO',
          googleConectado: true,
          googleCalendarId: 'cal',
          googleRefreshTokenEnc: enc,
          googleSub: subDelete,
          senhaHash: 'x'
        }
      })
      const token = app.jwt.sign({ id: user.id, papel: 'MEMBRO', celulaId: null })
      const res = await app.inject({
        method: 'DELETE',
        url: '/google',
        headers: { authorization: `Bearer ${token}` }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ ok: true })

      const atualizado = await prisma.user.findUnique({ where: { id: user.id } })
      expect(atualizado.googleConectado).toBe(false)
      expect(atualizado.googleCalendarId).toBeNull()
      expect(atualizado.googleRefreshTokenEnc).toBeNull()
      expect(atualizado.googleSub).toBeNull()
    })

    it('conta google-only (sem senha): preserva googleSub para não travar o login', async () => {
      const user = await prisma.user.create({
        data: {
          nome: 'Del User Google-only',
          email: emailDeleteGoogleOnly,
          papel: 'MEMBRO',
          googleConectado: true,
          googleCalendarId: 'cal',
          googleSub: subDeleteGoogleOnly
        }
      })
      const token = app.jwt.sign({ id: user.id, papel: 'MEMBRO', celulaId: null })
      const res = await app.inject({
        method: 'DELETE',
        url: '/google',
        headers: { authorization: `Bearer ${token}` }
      })
      expect(res.statusCode).toBe(200)

      const atualizado = await prisma.user.findUnique({ where: { id: user.id } })
      expect(atualizado.googleConectado).toBe(false)
      expect(atualizado.googleCalendarId).toBeNull()
      expect(atualizado.googleSub).toBe(subDeleteGoogleOnly)
    })
  })

  describe('GET /auth/google?contexto=conectar', () => {
    it('sem JWT retorna 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/auth/google?contexto=conectar' })
      expect(res.statusCode).toBe(401)
    })

    it('com JWT de membro retorna URL de consentimento', async () => {
      const token = app.jwt.sign({ id: 'fake-id', papel: 'MEMBRO', celulaId: null })
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google?contexto=conectar',
        headers: { authorization: `Bearer ${token}` }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().url).toContain('accounts.google.com')
    })
  })

  describe('e-mail do Google não verificado', () => {
    it('retorna 403 e não vincula quando e-mail já existe mas não é verificado', async () => {
      const existente = await prisma.user.create({
        data: {
          nome: 'Existente',
          email: emailUnverified,
          papel: 'MEMBRO',
          senhaHash: 'x'
        }
      })

      setGoogleApiParaTestes({
        async montarAuthUrl({ state }) { return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` },
        async trocarCode() { return { sub: subUnverified, email: emailUnverified, nome: 'Existente', emailVerificado: false } },
        async accessTokenDe() { return 'at' },
        async garantirCalendario() { return 'cal' },
        async criarEvento() { return 'gev' },
        async atualizarEvento() {}, async removerEvento() {}
      })

      const inicio = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
      const state = new URL(inicio.json().url).searchParams.get('state')
      const res = await app.inject({ method: 'GET', url: `/auth/google/callback?code=abc&state=${state}` })

      expect(res.statusCode).toBe(403)
      expect(res.json()).toEqual({ erro: 'E-mail do Google não verificado' })

      const inalterado = await prisma.user.findUnique({ where: { id: existente.id } })
      expect(inalterado.googleSub).toBeNull()

      await prisma.user.delete({ where: { id: existente.id } })
    })
  })

  describe('conectar vincula ao usuário logado', () => {
    it('vincula quando o e-mail do Google é igual ao e-mail da conta logada', async () => {
      const userConectar = await prisma.user.create({
        data: {
          nome: 'Conectar User',
          email: emailConectar,
          papel: 'MEMBRO',
          senhaHash: 'hash'
        }
      })

      const jwtToken = app.jwt.sign({ id: userConectar.id, papel: 'MEMBRO', celulaId: null })

      const inicioRes = await app.inject({
        method: 'GET',
        url: '/auth/google?contexto=conectar',
        headers: { authorization: `Bearer ${jwtToken}` }
      })
      expect(inicioRes.statusCode).toBe(200)
      const state = new URL(inicioRes.json().url).searchParams.get('state')

      setGoogleApiParaTestes({
        async montarAuthUrl({ state }) { return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` },
        async trocarCode() { return { sub: subConectar, email: emailConectar, nome: 'Google User', emailVerificado: true, refreshToken: 'rt-conectar' } },
        async accessTokenDe() { return 'at' },
        async garantirCalendario() { return 'cal-conectar' },
        async criarEvento() { return 'gev' },
        async atualizarEvento() {}, async removerEvento() {}
      })

      const res = await app.inject({ method: 'GET', url: `/auth/google/callback?code=abc&state=${state}` })
      expect(res.statusCode).toBe(302)

      const atualizado = await prisma.user.findUnique({ where: { id: userConectar.id } })
      expect(atualizado.googleSub).toBe(subConectar)
      expect(atualizado.googleConectado).toBe(true)

      await prisma.user.delete({ where: { id: userConectar.id } })
    })

    it('recusa conectar quando o e-mail do Google difere do e-mail da conta → 403', async () => {
      const userConectar = await prisma.user.create({
        data: {
          nome: 'Conectar Mismatch',
          email: emailConectarMismatch,
          papel: 'MEMBRO',
          senhaHash: 'hash'
        }
      })

      const jwtToken = app.jwt.sign({ id: userConectar.id, papel: 'MEMBRO', celulaId: null })

      const inicioRes = await app.inject({
        method: 'GET',
        url: '/auth/google?contexto=conectar',
        headers: { authorization: `Bearer ${jwtToken}` }
      })
      expect(inicioRes.statusCode).toBe(200)
      const state = new URL(inicioRes.json().url).searchParams.get('state')

      // Google devolve um e-mail (emailGoogleConectar) diferente do da conta logada
      setGoogleApiParaTestes({
        async montarAuthUrl({ state }) { return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` },
        async trocarCode() { return { sub: subConectarMismatch, email: emailGoogleConectar, nome: 'Outro Google', emailVerificado: true, refreshToken: 'rt' } },
        async accessTokenDe() { return 'at' },
        async garantirCalendario() { return 'cal' },
        async criarEvento() { return 'gev' },
        async atualizarEvento() {}, async removerEvento() {}
      })

      const res = await app.inject({ method: 'GET', url: `/auth/google/callback?code=abc&state=${state}` })
      expect(res.statusCode).toBe(403)

      // A conta logada não deve ter sido vinculada
      const inalterado = await prisma.user.findUnique({ where: { id: userConectar.id } })
      expect(inalterado.googleSub).toBeNull()
      expect(inalterado.googleConectado).toBe(false)

      // E nenhuma conta nova deve ter sido criada com o e-mail do Google
      const naoDeveCriar = await prisma.user.findUnique({ where: { email: emailGoogleConectar } })
      expect(naoDeveCriar).toBeNull()

      await prisma.user.delete({ where: { id: userConectar.id } })
    })
  })

  describe('re-auth sem novo refreshToken (Fix 1)', () => {
    it('usa token armazenado como fallback e redireciona sem 500', async () => {
      const enc = cifrar('existing-rt', '0'.repeat(64))
      await prisma.user.create({
        data: {
          nome: 'Re-Auth User',
          email: emailReAuth,
          papel: 'MEMBRO',
          googleSub: subReAuth,
          googleRefreshTokenEnc: enc,
          googleConectado: true,
          googleCalendarId: 'cal-existing'
        }
      })

      // Override: trocarCode returns no refreshToken (re-consent without offline)
      setGoogleApiParaTestes({
        async montarAuthUrl({ state }) { return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` },
        async trocarCode() { return { sub: subReAuth, email: emailReAuth, nome: 'Re-Auth User', emailVerificado: true } },
        async accessTokenDe() { return 'at' },
        async garantirCalendario() { return 'cal-icelula' },
        async criarEvento() { return 'gev' },
        async atualizarEvento() {}, async removerEvento() {}
      })

      const inicio = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
      const state = new URL(inicio.json().url).searchParams.get('state')
      const res = await app.inject({ method: 'GET', url: `/auth/google/callback?code=abc&state=${state}` })

      expect(res.statusCode).toBe(302)

      const atualizado = await prisma.user.findUnique({ where: { email: emailReAuth } })
      expect(atualizado?.googleRefreshTokenEnc).toBe(enc)
      expect(atualizado?.googleConectado).toBe(true)
    })
  })

  describe('e-mail do Google verificado vincula conta existente', () => {
    it('faz login e grava googleSub quando o e-mail já existe e é verificado', async () => {
      const emailVerif = `verif-${sufixo}@gmail.com`
      const existente = await prisma.user.create({
        data: { nome: 'Já Existe', email: emailVerif, papel: 'MEMBRO', senhaHash: 'x' }
      })

      setGoogleApiParaTestes({
        async montarAuthUrl({ state }) { return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` },
        async trocarCode() { return { sub: `sub-verif-${sufixo}`, email: emailVerif, nome: 'Já Existe', emailVerificado: true, refreshToken: 'rt' } },
        async accessTokenDe() { return 'at' },
        async garantirCalendario() { return 'cal-icelula' },
        async criarEvento() { return 'gev' },
        async atualizarEvento() {}, async removerEvento() {}
      })

      const inicio = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
      const state = new URL(inicio.json().url).searchParams.get('state')
      const res = await app.inject({ method: 'GET', url: `/auth/google/callback?code=abc&state=${state}` })

      expect(res.statusCode).toBe(302)
      const atualizado = await prisma.user.findUnique({ where: { id: existente.id } })
      expect(atualizado.googleSub).toBe(`sub-verif-${sufixo}`)
      expect(atualizado.googleConectado).toBe(true)

      // nenhuma conta duplicada criada
      const total = await prisma.user.count({ where: { email: emailVerif } })
      expect(total).toBe(1)

      await prisma.user.delete({ where: { id: existente.id } })
    })
  })
})
