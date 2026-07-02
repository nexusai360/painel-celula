import { prisma } from '../prisma.js'
import { requireGestor } from '../lib/roles.js'

// IDs das células que o usuário lidera (junção N:N).
async function celulasLideradas(userId) {
  const cels = await prisma.celula.findMany({ where: { lideres: { some: { id: userId } } }, select: { id: true } })
  return cels.map((c) => c.id)
}

export async function testemunhoRoutes(app) {
  app.get('/testemunhos', { preHandler: requireGestor() }, async (request) => {
    const ids = await celulasLideradas(request.usuario.id)
    if (ids.length === 0) return { testemunhos: [] }
    const testemunhos = await prisma.testemunho.findMany({
      where: { celulaId: { in: ids } },
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

  app.post('/testemunhos/:id/concluir', { preHandler: requireGestor() }, async (request, reply) => {
    const ids = await celulasLideradas(request.usuario.id)
    const t = await prisma.testemunho.findUnique({ where: { id: request.params.id } })
    if (!t || !ids.includes(t.celulaId)) return reply.code(404).send({ erro: 'Testemunho não encontrado' })
    const testemunho = await prisma.testemunho.update({
      where: { id: t.id }, data: { status: 'CONCLUIDO', concluidoEm: new Date() }
    })
    return { testemunho }
  })
}
