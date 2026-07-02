import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireRole, requireGestor } from '../lib/roles.js'
import { podeGerenciarCelula } from '../lib/escopo.js'
import { materializarEncontros } from '../lib/encontros.service.js'
import { sincronizarEncontro, sincronizarMembro } from '../lib/sync/calendarSync.js'

const encontroStatusEnum = z.enum(['AGENDADO', 'REALIZADO', 'CANCELADO'])

const updateEncontroSchema = z.object({
  data: z.coerce.date().optional(),
  status: encontroStatusEnum.optional(),
  observacao: z.string().optional()
})

const criarEncontroSchema = z.object({
  data: z.coerce.date(),
  observacao: z.string().optional()
})

const estenderSchema = z.object({
  horizonteDias: z.number().int().positive().optional()
})

export async function encontroRoutes(app) {
  // ── GET /celulas/:id/encontros (MEMBRO+, com escopo) ───────────────────────
  app.get('/celulas/:id/encontros', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const { id } = request.params
    const usuario = request.usuario

    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })

    // Scoping: ADMIN+ e líder da célula gerenciam (podeGerenciarCelula); membro só se for da célula.
    if (!podeGerenciarCelula(usuario, celula) && usuario.celulaId !== id) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const { desde, ate } = request.query
    const where = { celulaId: id }
    if (desde || ate) {
      where.data = {}
      if (desde) where.data.gte = new Date(desde)
      if (ate) where.data.lte = new Date(ate)
    }

    const encontros = await prisma.encontro.findMany({
      where,
      orderBy: { data: 'asc' },
      include: {
        _count: { select: { presencas: true } },
        // presença do próprio solicitante naquele encontro (para o flag marcadoPorMim)
        presencas: { where: { userId: usuario.id }, select: { marcadaEm: true } }
      }
    })

    // Expõe se o solicitante já marcou presença, sem vazar a lista de presenças
    const comFlag = encontros.map(({ presencas, ...e }) => ({
      ...e,
      marcadoPorMim: presencas.length > 0,
      marcadaEm: presencas[0]?.marcadaEm ?? null
    }))

    return reply.send({ encontros: comFlag })
  })

  // ── PUT /encontros/:id (LIDER+, com escopo) ────────────────────────────────
  app.put('/encontros/:id', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params

    const parsed = updateEncontroSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }

    const encontro = await prisma.encontro.findUnique({
      where: { id },
      include: { celula: true }
    })
    if (!encontro) return reply.code(404).send({ erro: 'Encontro não encontrado' })

    if (!podeGerenciarCelula(request.usuario, encontro.celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    // Fix 2: colisão de data no mesmo célula → 409 (não 500)
    let encontroAtualizado
    try {
      encontroAtualizado = await prisma.encontro.update({
        where: { id },
        data: parsed.data
      })
    } catch (err) {
      if (err?.code === 'P2002') {
        return reply.code(409).send({ erro: 'Já existe um encontro nessa data' })
      }
      throw err
    }

    try { await sincronizarEncontro(id) } catch {}
    return reply.send({ encontro: encontroAtualizado })
  })

  // ── POST /celulas/:id/encontros/estender (LIDER+, com escopo) ─────────────
  // Registrado ANTES da rota avulsa para ter precedência sobre o segmento literal 'estender'
  app.post('/celulas/:id/encontros/estender', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params

    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const parsed = estenderSchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }

    const { horizonteDias = 90 } = parsed.data
    const criados = await materializarEncontros(id, { horizonteDias })

    // Sync de membros vinculados ao Google (sincronizarMembro é idempotente — backfill dos eventos em falta).
    // Bloco inteiro best-effort: nem a busca nem o sync podem quebrar a rota.
    try {
      const membrosVinculados = await prisma.user.findMany({
        where: {
          celulaId: id,
          googleConectado: true,
          googleCalendarId: { not: null },
          googleRefreshTokenEnc: { not: null }
        },
        select: { id: true }
      })
      for (const m of membrosVinculados) {
        try { await sincronizarMembro(m.id) } catch {}
      }
    } catch {}

    return reply.send({ criados })
  })

  app.post('/celulas/:id/encontros', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params

    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const parsed = criarEncontroSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }

    const { data, observacao } = parsed.data

    try {
      const encontro = await prisma.encontro.create({
        data: { celulaId: id, data, observacao }
      })
      try { await sincronizarEncontro(encontro.id) } catch {}
      return reply.code(201).send({ encontro })
    } catch (err) {
      if (err?.code === 'P2002') {
        return reply.code(409).send({ erro: 'Já existe um encontro nesta data para esta célula' })
      }
      throw err
    }
  })
}
