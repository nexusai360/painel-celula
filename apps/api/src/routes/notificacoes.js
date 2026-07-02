import { prisma } from '../prisma.js'
import { requireRole, temNivel } from '../lib/roles.js'

export async function notificacaoRoutes(app) {
  // Lista as notificações visíveis ao usuário + contagem de não lidas.
  app.get('/notificacoes', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    const u = request.usuario
    const or = [{ escopo: 'GLOBAL' }]
    if (u.celulaId) or.push({ escopo: 'CELULA', celulaId: u.celulaId })
    const itens = await prisma.notificacao.findMany({ where: { OR: or }, orderBy: { criadoEm: 'desc' }, take: 30 })
    const autores = await prisma.user.findMany({ where: { id: { in: [...new Set(itens.map((i) => i.autorId))] } }, select: { id: true, nome: true } })
    const nomePorId = Object.fromEntries(autores.map((a) => [a.id, a.nome]))
    const eu = await prisma.user.findUnique({ where: { id: u.id }, select: { notificacoesLidasEm: true } })
    const corte = eu?.notificacoesLidasEm ? new Date(eu.notificacoesLidasEm).getTime() : 0
    const lista = itens.map((i) => ({
      id: i.id, titulo: i.titulo, corpo: i.corpo, escopo: i.escopo, criadoEm: i.criadoEm,
      autorNome: nomePorId[i.autorId] || null, lida: new Date(i.criadoEm).getTime() <= corte
    }))
    return reply.send({ notificacoes: lista, naoLidas: lista.filter((n) => !n.lida).length, podeEnviar: temNivel(u.papel, 'LIDER') })
  })

  // Marca todas como lidas.
  app.post('/notificacoes/ler', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    await prisma.user.update({ where: { id: request.usuario.id }, data: { notificacoesLidasEm: new Date() } })
    return reply.send({ ok: true })
  })

  // Envia notificação. ADMIN+: GLOBAL (ou CELULA de qualquer célula). LÍDER: só CELULA da própria célula.
  app.post('/notificacoes', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const u = request.usuario
    const titulo = String(request.body?.titulo || '').trim()
    const corpo = String(request.body?.corpo || '').trim()
    let escopo = request.body?.escopo === 'GLOBAL' ? 'GLOBAL' : 'CELULA'
    if (!titulo || !corpo) return reply.code(400).send({ erro: 'Preencha título e mensagem' })

    let celulaId = null
    if (escopo === 'GLOBAL') {
      if (!temNivel(u.papel, 'ADMIN')) return reply.code(403).send({ erro: 'Só admin envia aviso global' })
    } else {
      // CELULA
      if (temNivel(u.papel, 'ADMIN')) {
        celulaId = request.body?.celulaId || u.celulaId
        if (!celulaId) return reply.code(400).send({ erro: 'Informe a célula' })
      } else {
        celulaId = u.celulaId
        if (!celulaId) return reply.code(400).send({ erro: 'Você não lidera uma célula' })
      }
    }
    const n = await prisma.notificacao.create({ data: { autorId: u.id, escopo, celulaId, titulo, corpo } })
    return reply.code(201).send({ notificacao: { id: n.id } })
  })
}
