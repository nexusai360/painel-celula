import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireRole, requireGestor, ehAdmin } from '../lib/roles.js'
import { materializarEncontros } from '../lib/encontros.service.js'
import { podeGerenciarCelula, gerarQrToken } from '../lib/escopo.js'
import { publicoLeve } from '../lib/usuarios.js'
import { sincronizarMembro } from '../lib/sync/calendarSync.js'

function isP2002OnField(err, fieldName) {
  if (err?.code !== 'P2002') return false
  const target = err.meta?.target
  if (Array.isArray(target)) return target.includes(fieldName)
  return String(target ?? '').includes(fieldName)
}

const FREQUENCIAS_VALIDAS = [7, 14, 28]
const frequenciaValida = z
  .coerce.number()
  .int()
  .refine((v) => FREQUENCIAS_VALIDAS.includes(v), 'Frequência inválida')

const enderecoFields = {
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  pontoReferencia: z.string().optional(),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional()
}
const CAMPOS_ENDERECO = Object.keys(enderecoFields)

const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
function weekdayDaString(s) {
  const [y, mo, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
}
export function dataUtcDaString(s) {
  const [y, mo, d] = s.slice(0, 10).split('-').map(Number)
  const [hh, mi] = s.slice(11, 16).split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, hh, mi))
}

const celulaSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  diaSemana: z.coerce.number().int().min(0).max(6).optional(),
  frequenciaDias: frequenciaValida,
  dataPrimeiroEncontro: z.string().regex(DATA_HORA, 'Data/hora inválida'),
  ...enderecoFields
})

const updateCelulaSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  diaSemana: z.coerce.number().int().min(0).max(6).optional(),
  frequenciaDias: frequenciaValida.optional(),
  dataPrimeiroEncontro: z.coerce.date().optional(),
  ativa: z.boolean().optional(),
  ...enderecoFields
})

// Seleção dos líderes (nome + foto) para exibição.
const LIDERES_SELECT = { select: { id: true, nome: true, email: true, avatar: true } }

export async function celulaRoutes(app) {
  // ── Público (landing QR Code) — só célula aprovada e ativa ──────────────────
  app.get('/public/celula/:qrToken', async (request, reply) => {
    const { qrToken } = request.params
    const celula = await prisma.celula.findUnique({
      where: { qrToken },
      select: { nome: true, ativa: true, status: true }
    })
    if (!celula || !celula.ativa || celula.status !== 'APROVADA') {
      return reply.code(404).send({ erro: 'Célula não encontrada' })
    }
    return reply.send({ nome: celula.nome })
  })

  // ── POST /celulas — cria (ADMIN ou qualificação LÍDER/PASTOR) ───────────────
  // Admin: aprovada na hora. Líder/Pastor: PENDENTE até um admin aprovar; o criador
  // vira líder da célula que criou.
  app.post('/celulas', { preHandler: requireGestor() }, async (request, reply) => {
    const parsed = celulaSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }
    const criador = request.usuario
    const admin = ehAdmin(criador.nivelAcesso)
    const { nome, descricao, frequenciaDias } = parsed.data
    const diaSemana = weekdayDaString(parsed.data.dataPrimeiroEncontro)
    const dataPrimeiroEncontro = dataUtcDaString(parsed.data.dataPrimeiroEncontro)
    const endereco = Object.fromEntries(
      CAMPOS_ENDERECO.filter((k) => parsed.data[k] !== undefined).map((k) => [k, parsed.data[k]])
    )
    const status = admin ? 'APROVADA' : 'PENDENTE'

    let qrToken
    let sufixo = 1
    const MAX = 50
    let celula
    for (let tentativa = 0; tentativa < MAX; tentativa++) {
      qrToken = gerarQrToken(nome, String(sufixo))
      try {
        celula = await prisma.celula.create({
          data: {
            nome, descricao, diaSemana, frequenciaDias, dataPrimeiroEncontro, qrToken, status,
            criadaPorId: criador.id, ...endereco,
            // Criador não-admin (líder/pastor) vira líder da célula criada.
            ...(admin ? {} : { lideres: { connect: { id: criador.id } } })
          }
        })
        break
      } catch (err) {
        if (isP2002OnField(err, 'qrToken') && tentativa < MAX - 1) { sufixo++; continue }
        if (err?.code === 'P2002') return reply.code(409).send({ erro: 'Não foi possível gerar um identificador único' })
        throw err
      }
    }

    await materializarEncontros(celula.id)
    return reply.code(201).send({ celula, pendente: status === 'PENDENTE' })
  })

  // ── GET /celulas — admin vê aprovadas; líder vê as que lidera (incl. pendentes)
  app.get('/celulas', { preHandler: requireGestor() }, async (request, reply) => {
    const usuario = request.usuario
    const where = ehAdmin(usuario.nivelAcesso)
      ? { status: 'APROVADA' }
      : { lideres: { some: { id: usuario.id } } }
    const celulas = await prisma.celula.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { membros: true, encontros: true } },
        lideres: LIDERES_SELECT
      }
    })
    return reply.send({ celulas })
  })

  // ── GET /celulas/pendentes (ADMIN) — fila de aprovação de células ───────────
  app.get('/celulas/pendentes', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const celulas = await prisma.celula.findMany({
      where: { status: 'PENDENTE' },
      orderBy: { criadoEm: 'asc' },
      include: {
        _count: { select: { membros: true } },
        lideres: LIDERES_SELECT,
        criadaPor: { select: { id: true, nome: true, email: true } }
      }
    })
    return reply.send({ celulas })
  })

  // ── POST /celulas/:id/aprovar (ADMIN) ───────────────────────────────────────
  app.post('/celulas/:id/aprovar', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    const atualizada = await prisma.celula.update({ where: { id }, data: { status: 'APROVADA' } })
    return reply.send({ celula: atualizada })
  })

  // ── GET /celulas/publicas (onboarding) — só aprovadas e ativas ──────────────
  app.get('/celulas/publicas', { preHandler: requireRole('USUARIO', { permitirPendente: true }) }, async (request, reply) => {
    const celulas = await prisma.celula.findMany({
      where: { ativa: true, status: 'APROVADA' },
      orderBy: { nome: 'asc' },
      select: {
        id: true, nome: true, bairro: true, diaSemana: true,
        frequenciaDias: true, dataPrimeiroEncontro: true,
        lideres: { select: { nome: true, avatar: true } }
      }
    })
    return reply.send({ celulas })
  })

  // ── GET /celulas/:id (escopo) ───────────────────────────────────────────────
  app.get('/celulas/:id', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({
      where: { id },
      include: { lideres: LIDERES_SELECT, _count: { select: { membros: true, encontros: true } } }
    })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    return reply.send({ celula })
  })

  // ── GET /celulas/:id/membros (escopo) ───────────────────────────────────────
  app.get('/celulas/:id/membros', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id }, include: { lideres: { select: { id: true } } } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    const soAtivos = !ehAdmin(request.usuario.nivelAcesso)
    const membros = await prisma.user.findMany({
      where: { celulaId: id, ...(soAtivos ? { ativo: true } : {}) },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, avatar: true, nivelAcesso: true, qualificacao: true, ativo: true, whatsapp: true }
    })
    return reply.send({ membros })
  })

  // ── PUT /celulas/:id (escopo) ───────────────────────────────────────────────
  app.put('/celulas/:id', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id }, include: { lideres: { select: { id: true } } } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const parsed = updateCelulaSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }

    const data = parsed.data
    const mudouFrequencia = data.frequenciaDias !== undefined && data.frequenciaDias !== celula.frequenciaDias
    const mudouDataPrimeiro = data.dataPrimeiroEncontro !== undefined &&
      new Date(data.dataPrimeiroEncontro).getTime() !== new Date(celula.dataPrimeiroEncontro).getTime()

    await prisma.celula.update({ where: { id }, data })

    if (mudouFrequencia || mudouDataPrimeiro) {
      const agora = new Date()
      const encontrosFuturos = await prisma.encontro.findMany({
        where: { celulaId: id, status: 'AGENDADO', data: { gt: agora } },
        include: { _count: { select: { presencas: true } } }
      })
      const semPresenca = encontrosFuturos.filter((e) => e._count.presencas === 0).map((e) => e.id)
      if (semPresenca.length > 0) {
        await prisma.encontro.deleteMany({ where: { id: { in: semPresenca } } })
      }
      await materializarEncontros(id)

      try {
        const membrosVinculados = await prisma.user.findMany({
          where: { celulaId: id, googleConectado: true, googleCalendarId: { not: null }, googleRefreshTokenEnc: { not: null } },
          select: { id: true }
        })
        for (const m of membrosVinculados) { try { await sincronizarMembro(m.id) } catch {} }
      } catch {}
    }

    const atualizada = await prisma.celula.findUnique({ where: { id }, include: { lideres: LIDERES_SELECT } })
    return reply.send({ celula: atualizada })
  })

  // ── POST /celulas/:id/lideres — adiciona líder (ADMIN ou líder da célula) ────
  app.post('/celulas/:id/lideres', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params
    const parsed = z.object({ userId: z.string() }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    const { userId } = parsed.data

    const celula = await prisma.celula.findUnique({ where: { id }, include: { lideres: { select: { id: true } } } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) return reply.code(403).send({ erro: 'Sem permissão' })

    const alvo = await prisma.user.findUnique({ where: { id: userId } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    // Entrar na junção exige qualificação ≥ LÍDER — promove se estiver abaixo (e não for admin).
    const promove = !ehAdmin(alvo.nivelAcesso) && alvo.qualificacao !== 'PASTOR'
    await prisma.celula.update({
      where: { id },
      data: { lideres: { connect: { id: userId } } }
    })
    if (promove) {
      await prisma.user.update({ where: { id: userId }, data: { qualificacao: 'LIDER' } })
    }
    const atualizada = await prisma.celula.findUnique({ where: { id }, include: { lideres: LIDERES_SELECT } })
    return reply.send({ celula: atualizada })
  })

  // ── DELETE /celulas/:id/lideres/:userId — remove vínculo (não a qualificação)
  app.delete('/celulas/:id/lideres/:userId', { preHandler: requireGestor() }, async (request, reply) => {
    const { id, userId } = request.params
    const celula = await prisma.celula.findUnique({ where: { id }, include: { lideres: { select: { id: true } } } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) return reply.code(403).send({ erro: 'Sem permissão' })

    await prisma.celula.update({ where: { id }, data: { lideres: { disconnect: { id: userId } } } })
    const atualizada = await prisma.celula.findUnique({ where: { id }, include: { lideres: LIDERES_SELECT } })
    return reply.send({ celula: atualizada })
  })

  // ── DELETE /celulas/:id (ADMIN) ─────────────────────────────────────────────
  app.delete('/celulas/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    // A junção de líderes some por cascade; qualificações dos líderes são preservadas.
    await prisma.celula.delete({ where: { id } })
    return reply.code(204).send()
  })
}
