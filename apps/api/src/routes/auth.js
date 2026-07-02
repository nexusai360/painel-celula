import { registerSchema, loginSchema } from '@icelula/shared'
import { prisma } from '../prisma.js'
import { hashSenha, verificarSenha } from '../lib/password.js'
import { requireRole } from '../lib/roles.js'
import { COM_CELULA, comCelula } from '../lib/usuarios.js'

function assinarToken(app, user) {
  return app.jwt.sign({ id: user.id, papel: user.papel, celulaId: user.celulaId })
}

export async function authRoutes(app) {
  app.post('/auth/register', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }
    const { nome, email, senha, qrToken } = parsed.data

    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) return reply.code(409).send({ erro: 'E-mail já cadastrado' })

    let celulaId = null
    if (qrToken) {
      const celula = await prisma.celula.findUnique({ where: { qrToken } })
      if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
      celulaId = celula.id
    }

    // Cadastro via QR Code da célula = confiança (a pessoa está fisicamente na
    // célula): entra JÁ APROVADO e vinculado à célula. Cadastro pelo site (sem QR)
    // nasce PENDENTE — auto-login, mas travado até um líder/admin aprovar.
    const viaQr = !!qrToken
    const user = await prisma.user.create({
      data: { nome, email, senhaHash: await hashSenha(senha), papel: 'MEMBRO', celulaId, aprovado: viaQr },
      ...COM_CELULA
    })
    return reply.code(201).send({
      token: assinarToken(app, user),
      usuario: comCelula(user),
      pendente: !user.aprovado
    })
  })

  app.post('/auth/login', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { email, senha } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(401).send({ erro: 'Credenciais inválidas' })
    if (!user.senhaHash) {
      return reply.code(401).send({ erro: 'Esta conta usa login com Google. Entre com Google.' })
    }
    // Verifica a senha ANTES de revelar o estado da conta (evita enumeração).
    if (!(await verificarSenha(senha, user.senhaHash))) {
      return reply.code(401).send({ erro: 'Credenciais inválidas' })
    }
    if (!user.ativo) return reply.code(403).send({ erro: 'Usuário desativado' })
    // Pendentes PODEM logar (entram na área travada: seleção de célula / perfil).
    // O bloqueio dos recursos é feito por rota (requireRole sem permitirPendente).

    const atualizado = await prisma.user.update({
      where: { id: user.id }, data: { ultimoAcesso: new Date() }, ...COM_CELULA
    })
    return reply.send({ token: assinarToken(app, atualizado), usuario: comCelula(atualizado) })
  })

  app.get('/auth/me', { preHandler: requireRole('MEMBRO', { permitirPendente: true }) }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.usuario.id }, ...COM_CELULA })
    if (!user) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    return reply.send({ usuario: comCelula(user) })
  })
}
