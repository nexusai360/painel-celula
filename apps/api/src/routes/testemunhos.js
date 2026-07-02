import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'

export async function testemunhoRoutes(app) {
  app.get('/testemunhos', { preHandler: requireRole('LIDER') }, async (request) => {
    const celula = await prisma.celula.findFirst({ where: { liderId: request.usuario.id } })
    if (!celula) return { testemunhos: [] }
    const testemunhos = await prisma.testemunho.findMany({
      where: { celulaId: celula.id },
      include: { user: { select: { nome: true, avatar: true } } },
      orderBy: { criadoEm: 'asc' }
    })
    return {
      testemunhos: testemunhos.map((t) => ({
        id: t.id, titulo: t.titulo, status: t.status,
        criadoEm: t.criadoEm, concluidoEm: t.concluidoEm,
        autor: { nome: t.user.nome, avatar: t.user.avatar }
      }))
    }
  })

  app.post('/testemunhos/:id/concluir', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const celula = await prisma.celula.findFirst({ where: { liderId: request.usuario.id } })
    if (!celula) return reply.code(404).send({ erro: 'Testemunho não encontrado' })
    const t = await prisma.testemunho.findUnique({ where: { id: request.params.id } })
    if (!t || t.celulaId !== celula.id) return reply.code(404).send({ erro: 'Testemunho não encontrado' })
    const testemunho = await prisma.testemunho.update({
      where: { id: t.id }, data: { status: 'CONCLUIDO', concluidoEm: new Date() }
    })
    return { testemunho }
  })
}
