import { z } from 'zod'
import { prisma } from '../prisma.js'
import { googleHabilitado, googleConfig } from '../lib/google/config.js'
import { getGoogleApi } from '../lib/google/api.js'
import { cifrar, decifrar, chaveDeAmbiente } from '../lib/google/cripto.js'
import { sincronizarMembro, removerMembro } from '../lib/sync/calendarSync.js'
import { requireRole } from '../lib/roles.js'

const contextoSchema = z.enum(['login', 'conectar'])

function assinarToken(app, user) {
  return app.jwt.sign({ id: user.id, nivelAcesso: user.nivelAcesso, celulaId: user.celulaId })
}

export async function googleAuthRoutes(app) {
  // GET /auth/google?contexto=login|conectar&qrToken=...
  app.get('/auth/google', async (request, reply) => {
    if (!googleHabilitado()) {
      return reply.code(503).send({ erro: 'Integração Google não configurada' })
    }

    const parsed = contextoSchema.safeParse(request.query.contexto)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'contexto inválido', detalhes: parsed.error.issues })
    }
    const contexto = parsed.data
    const qrToken = request.query.qrToken || undefined

    let userId
    if (contexto === 'conectar') {
      try {
        await request.jwtVerify()
        userId = request.user.id
      } catch {
        return reply.code(401).send({ erro: 'Não autenticado' })
      }
    }

    const state = app.jwt.sign({ contexto, qrToken, userId }, { expiresIn: '10m' })
    const url = await getGoogleApi().montarAuthUrl({ state })
    return reply.send({ url })
  })

  // GET /auth/google/callback?code&state
  app.get('/auth/google/callback', async (request, reply) => {
    if (!googleHabilitado()) {
      return reply.code(503).send({ erro: 'Integração Google não configurada' })
    }

    const { code, state } = request.query
    if (!code || !state) {
      return reply.code(400).send({ erro: 'Parâmetros ausentes' })
    }

    let stateData
    try {
      stateData = app.jwt.verify(state)
    } catch {
      return reply.code(400).send({ erro: 'State inválido ou expirado' })
    }

    const perfil = await getGoogleApi().trocarCode(code)
    // perfil: { sub, email, nome, refreshToken, emailVerificado }

    // Resolve user:
    // 1. "conectar" flow: bind to the logged-in user (userId embedded in state)
    // 2. Normal login: by googleSub → by email (requires emailVerificado) → create new
    let user = null

    if (stateData.contexto === 'conectar' && stateData.userId) {
      user = await prisma.user.findUnique({ where: { id: stateData.userId } })
      // Exige que o e-mail do Google seja o mesmo da conta logada. Sem isso, um
      // usuário poderia atrelar a identidade Google de outra pessoa à própria
      // conta (ou vice-versa), criando um login-por-Google cruzado.
      if (user && user.email.toLowerCase() !== perfil.email.toLowerCase()) {
        return reply.code(403).send({
          erro: 'O e-mail da conta Google não corresponde ao e-mail do seu perfil'
        })
      }
      // If not found (stale state), fall through to normal resolution below
    }

    if (!user) {
      user = await prisma.user.findFirst({ where: { googleSub: perfil.sub } })
    }

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: perfil.email } })
      if (existingByEmail) {
        if (!perfil.emailVerificado) {
          return reply.code(403).send({ erro: 'E-mail do Google não verificado' })
        }
        user = existingByEmail
      }
    }

    if (!user) {
      // Create new user; resolve celulaId from qrToken if present
      let celulaId = null
      if (stateData.qrToken) {
        const celula = await prisma.celula.findUnique({ where: { qrToken: stateData.qrToken } })
        if (celula) celulaId = celula.id
      }
      user = await prisma.user.create({
        data: {
          nome: perfil.nome,
          email: perfil.email,
          nivelAcesso: 'USUARIO',
          qualificacao: 'MEMBRO',
          celulaId,
          googleSub: perfil.sub
        }
      })
    }

    // Compute refresh token to use: new from Google, or decrypt existing from DB
    // (best-effort: ciphertext corrompido/chave incorreta não pode derrubar o login)
    let refreshParaUsar = perfil.refreshToken || null
    if (!refreshParaUsar && user.googleRefreshTokenEnc) {
      try {
        refreshParaUsar = decifrar(user.googleRefreshTokenEnc, chaveDeAmbiente())
      } catch (e) {
        console.error('decifrar refresh token falhou', e?.message)
      }
    }

    // Best-effort calendar provisioning; login succeeds even if Google calls fail
    let calendarId = user.googleCalendarId
    let conectado = user.googleConectado
    if (refreshParaUsar) {
      try {
        const accessToken = await getGoogleApi().accessTokenDe(refreshParaUsar)
        conectado = true // token confirmado utilizável
        calendarId = await getGoogleApi().garantirCalendario(accessToken, user.googleCalendarId)
      } catch (e) {
        console.error('provisionamento Google falhou', e?.message)
      }
    }

    // Encrypt refresh token; keep existing if new one not provided
    const updateData = {
      googleCalendarId: calendarId,
      googleConectado: conectado,
      googleSub: perfil.sub
    }
    if (perfil.refreshToken) {
      updateData.googleRefreshTokenEnc = cifrar(perfil.refreshToken, chaveDeAmbiente())
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    })

    // Best-effort calendar sync
    sincronizarMembro(user.id).catch(() => {})

    const token = assinarToken(app, user)
    const { webUrl } = googleConfig()
    return reply.code(302).redirect(`${webUrl}/auth/google/sucesso#token=${token}`)
  })

  // DELETE /google — disconnect Google integration
  app.delete('/google', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    if (!googleHabilitado()) {
      return reply.code(503).send({ erro: 'Integração Google não configurada' })
    }

    const userId = request.usuario.id

    // Best-effort: remove calendar events
    removerMembro(userId).catch(() => {})

    // Desconectar também remove a identidade de login por Google (googleSub) quando
    // a conta tem senha própria — assim "desvincular" realmente desfaz o login por
    // Google. Contas google-only (sem senha) preservam o googleSub, pois é a única
    // forma de acesso delas.
    const alvo = await prisma.user.findUnique({
      where: { id: userId },
      select: { senhaHash: true }
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleRefreshTokenEnc: null,
        googleCalendarId: null,
        googleConectado: false,
        ...(alvo?.senhaHash ? { googleSub: null } : {})
      }
    })

    return reply.send({ ok: true })
  })
}
