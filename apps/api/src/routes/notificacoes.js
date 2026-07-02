import { prisma } from '../prisma.js'
import { requireAuth, requireGestor, ehAdmin, ehGestorQualificacao } from '../lib/roles.js'
import { montarWhereAlvo, normalizarAlvo, alvoInvalido } from '../lib/alvo.js'

async function celulasLideradasIds(userId) {
  const cels = await prisma.celula.findMany({ where: { lideres: { some: { id: userId } } }, select: { id: true } })
  return cels.map((c) => c.id)
}

export async function notificacaoRoutes(app) {
  // Notificações que atingem o usuário + leitura POR ITEM.
  app.get('/notificacoes', { preHandler: requireAuth() }, async (request, reply) => {
    const u = request.usuario
    const ledIds = await celulasLideradasIds(u.id)
    const itens = await prisma.notificacao.findMany({
      where: montarWhereAlvo(u, ledIds),
      orderBy: { criadoEm: 'desc' },
      take: 30,
    })
    const ids = itens.map((i) => i.id)
    const leituras = ids.length
      ? await prisma.notificacaoLeitura.findMany({ where: { userId: u.id, notificacaoId: { in: ids } }, select: { notificacaoId: true, lidaEm: true } })
      : []
    const lidaPorId = Object.fromEntries(leituras.map((l) => [l.notificacaoId, l.lidaEm]))
    const autores = await prisma.user.findMany({ where: { id: { in: [...new Set(itens.map((i) => i.autorId))] } }, select: { id: true, nome: true } })
    const nomePorId = Object.fromEntries(autores.map((a) => [a.id, a.nome]))

    const lista = itens.map((i) => ({
      id: i.id, titulo: i.titulo, corpo: i.corpo, criadoEm: i.criadoEm,
      autorNome: nomePorId[i.autorId] || null,
      lida: !!lidaPorId[i.id], lidaEm: lidaPorId[i.id] || null,
    }))
    return reply.send({
      notificacoes: lista,
      naoLidas: lista.filter((n) => !n.lida).length,
      podeEnviar: ehAdmin(u.nivelAcesso) || ehGestorQualificacao(u.qualificacao),
    })
  })

  // Marca UMA notificação como lida (leitura por item, carimbo com segundos).
  app.post('/notificacoes/:id/ler', { preHandler: requireAuth() }, async (request, reply) => {
    const { id } = request.params
    await prisma.notificacaoLeitura.upsert({
      where: { userId_notificacaoId: { userId: request.usuario.id, notificacaoId: id } },
      update: {},
      create: { userId: request.usuario.id, notificacaoId: id },
    }).catch(() => {})
    return reply.send({ ok: true })
  })

  // Marca TODAS as visíveis como lidas.
  app.post('/notificacoes/ler-tudo', { preHandler: requireAuth() }, async (request, reply) => {
    const u = request.usuario
    const ledIds = await celulasLideradasIds(u.id)
    const visiveis = await prisma.notificacao.findMany({ where: montarWhereAlvo(u, ledIds), select: { id: true } })
    if (visiveis.length) {
      await prisma.notificacaoLeitura.createMany({
        data: visiveis.map((n) => ({ userId: u.id, notificacaoId: n.id })),
        skipDuplicates: true,
      })
    }
    return reply.send({ ok: true })
  })

  // Envia notificação. ADMIN+ e LÍDER/PASTOR (com alvo travado pela permissão).
  app.post('/notificacoes', { preHandler: requireGestor() }, async (request, reply) => {
    const u = request.usuario
    const titulo = String(request.body?.titulo || '').trim()
    const corpo = String(request.body?.corpo || '').trim()
    if (!titulo || !corpo) return reply.code(400).send({ erro: 'Preencha título e mensagem' })

    const ledIds = ehAdmin(u.nivelAcesso) ? [] : await celulasLideradasIds(u.id)
    const alvo = normalizarAlvo(request.body || {}, u, ledIds)
    const erroAlvo = alvoInvalido(alvo)
    if (erroAlvo) return reply.code(400).send({ erro: erroAlvo })

    const n = await prisma.notificacao.create({ data: { autorId: u.id, titulo, corpo, ...alvo } })
    return reply.code(201).send({ notificacao: { id: n.id } })
  })
}
