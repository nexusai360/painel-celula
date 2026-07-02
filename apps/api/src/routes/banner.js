import { prisma } from '../prisma.js'
import { requireRole, requireAuth } from '../lib/roles.js'
import { montarWhereAlvo, normalizarAlvo, alvoInvalido } from '../lib/alvo.js'

async function celulasLideradasIds(userId) {
  const cels = await prisma.celula.findMany({ where: { lideres: { some: { id: userId } } }, select: { id: true } })
  return cels.map((c) => c.id)
}

const CAMPOS_ALVO = ['celulasTodas', 'celulasAlvo', 'qualificacoesTodas', 'qualificacoesAlvo', 'niveisTodas', 'niveisAlvo']

export async function bannerRoutes(app) {
  // Banners que atingem o usuário, ativos e não expirados (mais recentes primeiro).
  app.get('/banner', { preHandler: requireAuth() }, async (request, reply) => {
    const u = request.usuario
    const ledIds = await celulasLideradasIds(u.id)
    const banners = await prisma.banner.findMany({
      where: { AND: [{ ativo: true }, { expiraEm: { gt: new Date() } }, montarWhereAlvo(u, ledIds)] },
      orderBy: { criadoEm: 'desc' },
      select: { id: true, mensagem: true },
    })
    return reply.send({ banners })
  })

  // Lista todos (admin) para gerência.
  app.get('/banner/admin', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const banners = await prisma.banner.findMany({ orderBy: { criadoEm: 'desc' } })
    return reply.send({ banners })
  })

  // Cria banner (ADMIN). expiraEm obrigatória e futura.
  app.post('/banner', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const mensagem = String(request.body?.mensagem || '').trim()
    if (!mensagem) return reply.code(400).send({ erro: 'Escreva a mensagem do banner' })
    const expiraEm = new Date(request.body?.expiraEm)
    if (isNaN(expiraEm.getTime())) return reply.code(400).send({ erro: 'Informe a data/hora de expiração' })
    if (expiraEm.getTime() <= Date.now()) return reply.code(400).send({ erro: 'A expiração precisa ser no futuro' })

    const alvo = normalizarAlvo(request.body || {}, request.usuario, [])
    const erroAlvo = alvoInvalido(alvo)
    if (erroAlvo) return reply.code(400).send({ erro: erroAlvo })

    const banner = await prisma.banner.create({
      data: { mensagem, expiraEm, ativo: request.body?.ativo !== false, autorId: request.usuario.id, ...alvo },
    })
    return reply.code(201).send({ banner })
  })

  // Edita banner (ADMIN).
  app.patch('/banner/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const existente = await prisma.banner.findUnique({ where: { id } })
    if (!existente) return reply.code(404).send({ erro: 'Banner não encontrado' })

    const data = {}
    if (request.body?.mensagem !== undefined) {
      const m = String(request.body.mensagem).trim()
      if (!m) return reply.code(400).send({ erro: 'Escreva a mensagem do banner' })
      data.mensagem = m
    }
    if (request.body?.expiraEm !== undefined) {
      const e = new Date(request.body.expiraEm)
      if (isNaN(e.getTime())) return reply.code(400).send({ erro: 'Data de expiração inválida' })
      data.expiraEm = e
    }
    if (request.body?.ativo !== undefined) data.ativo = !!request.body.ativo
    if (CAMPOS_ALVO.some((k) => request.body?.[k] !== undefined)) {
      const alvo = normalizarAlvo(request.body, request.usuario, [])
      const erroAlvo = alvoInvalido(alvo)
      if (erroAlvo) return reply.code(400).send({ erro: erroAlvo })
      Object.assign(data, alvo)
    }

    const banner = await prisma.banner.update({ where: { id }, data })
    return reply.send({ banner })
  })

  app.delete('/banner/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    await prisma.banner.delete({ where: { id } }).catch(() => {})
    return reply.code(204).send()
  })
}
