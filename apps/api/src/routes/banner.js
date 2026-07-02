import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'

export async function bannerRoutes(app) {
  // Banner ativo (qualquer usuário aprovado vê).
  app.get('/banner', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    const b = await prisma.banner.findFirst({ where: { ativo: true }, orderBy: { atualizadoEm: 'desc' } })
    return reply.send({ banner: b ? { mensagem: b.mensagem } : null })
  })

  // Estado completo para o editor (ADMIN+).
  app.get('/banner/admin', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const b = await prisma.banner.findFirst({ orderBy: { atualizadoEm: 'desc' } })
    return reply.send({ banner: b ? { mensagem: b.mensagem, ativo: b.ativo } : { mensagem: '', ativo: false } })
  })

  // Define o banner (ADMIN+). Singleton: atualiza o existente ou cria.
  app.put('/banner', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const mensagem = String(request.body?.mensagem || '').trim()
    const ativo = !!request.body?.ativo
    if (ativo && !mensagem) return reply.code(400).send({ erro: 'Escreva a mensagem do aviso' })
    const existente = await prisma.banner.findFirst()
    const data = { mensagem, ativo, atualizadoPorId: request.usuario.id }
    const b = existente
      ? await prisma.banner.update({ where: { id: existente.id }, data })
      : await prisma.banner.create({ data })
    return reply.send({ banner: { mensagem: b.mensagem, ativo: b.ativo } })
  })
}
