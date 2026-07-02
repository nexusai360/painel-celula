import { pedidoCreateSchema, pedidoUpdateSchema } from '@icelula/shared'
import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'

export async function pedidoRoutes(app) {
  app.get('/pedidos', { preHandler: requireRole('USUARIO') }, async (request) => {
    const pedidos = await prisma.pedidoOracao.findMany({
      where: { userId: request.usuario.id },
      orderBy: { criadoEm: 'desc' },
      include: { testemunho: { select: { id: true } } }
    })
    return {
      pedidos: pedidos.map((p) => ({
        id: p.id, titulo: p.titulo, detalhes: p.detalhes,
        status: p.status, criadoEm: p.criadoEm, testemunhado: !!p.testemunho
      }))
    }
  })

  app.post('/pedidos', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const parsed = pedidoCreateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    const { titulo, detalhes, testemunhar } = parsed.data
    const userId = request.usuario.id
    const celulaId = request.usuario.celulaId ?? null

    if (testemunhar) {
      const pedido = await prisma.$transaction(async (tx) => {
        const p = await tx.pedidoOracao.create({
          data: { userId, celulaId, titulo, detalhes: detalhes ?? null, status: 'ATENDIDO' }
        })
        await tx.testemunho.create({ data: { userId, celulaId, pedidoId: p.id, titulo, status: 'PENDENTE' } })
        return p
      })
      return reply.code(201).send({ pedido })
    }

    const pedido = await prisma.pedidoOracao.create({
      data: { userId, celulaId, titulo, detalhes: detalhes ?? null }
    })
    return reply.code(201).send({ pedido })
  })

  app.put('/pedidos/:id', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const parsed = pedidoUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    const existente = await prisma.pedidoOracao.findUnique({ where: { id: request.params.id } })
    if (!existente || existente.userId !== request.usuario.id) return reply.code(404).send({ erro: 'Pedido não encontrado' })
    const pedido = await prisma.pedidoOracao.update({
      where: { id: existente.id },
      data: { titulo: parsed.data.titulo, detalhes: parsed.data.detalhes ?? null }
    })
    return { pedido }
  })

  app.delete('/pedidos/:id', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const existente = await prisma.pedidoOracao.findUnique({ where: { id: request.params.id } })
    if (!existente || existente.userId !== request.usuario.id) return reply.code(404).send({ erro: 'Pedido não encontrado' })
    await prisma.pedidoOracao.delete({ where: { id: existente.id } })
    return reply.code(204).send()
  })

  app.post('/pedidos/:id/testemunho', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const existente = await prisma.pedidoOracao.findUnique({
      where: { id: request.params.id }, include: { testemunho: true }
    })
    if (!existente || existente.userId !== request.usuario.id) return reply.code(404).send({ erro: 'Pedido não encontrado' })
    if (existente.testemunho) return { testemunho: existente.testemunho }
    try {
      const testemunho = await prisma.$transaction(async (tx) => {
        const t = await tx.testemunho.create({
          data: { userId: existente.userId, celulaId: existente.celulaId, pedidoId: existente.id, titulo: existente.titulo, status: 'PENDENTE' }
        })
        await tx.pedidoOracao.update({ where: { id: existente.id }, data: { status: 'ATENDIDO' } })
        return t
      })
      return reply.code(201).send({ testemunho })
    } catch (err) {
      if (err?.code === 'P2002') {
        // Corrida: outra requisição concorrente já criou o testemunho para este pedido.
        const testemunho = await prisma.testemunho.findUnique({ where: { pedidoId: existente.id } })
        return reply.code(200).send({ testemunho })
      }
      throw err
    }
  })
}
