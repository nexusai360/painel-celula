import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'
import { materializarEncontros } from '../lib/encontros.service.js'
import { podeGerenciarCelula, gerarQrToken } from '../lib/escopo.js'
import { publicoLeve } from '../lib/usuarios.js'
import { sincronizarMembro } from '../lib/sync/calendarSync.js'

/**
 * Retorna true se o erro Prisma P2002 foi causado pelo campo especificado.
 * Funciona com meta.target como array (Prisma 6+) ou string (nome da constraint).
 */
function isP2002OnField(err, fieldName) {
  if (err?.code !== 'P2002') return false
  const target = err.meta?.target
  if (Array.isArray(target)) return target.includes(fieldName)
  return String(target ?? '').includes(fieldName)
}

// Frequências suportadas: Semanal (7), Quinzenal (14), Mensal (28).
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

// Wall-clock ingênuo "YYYY-MM-DDTHH:mm" — weekday derivado dos componentes em UTC
// (TZ-independente; consistente com a data armazenada, também UTC-pinada no handler).
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

// O dia da semana é SEMPRE derivado da data no handler — nunca validado/rejeitado.
const celulaSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  diaSemana: z.coerce.number().int().min(0).max(6).optional(),
  frequenciaDias: frequenciaValida,
  dataPrimeiroEncontro: z.string().regex(DATA_HORA, 'Data/hora inválida'),
  liderId: z.string().optional(),
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

export async function celulaRoutes(app) {
  // ── Endpoint público (landing QR Code) ─────────────────────────────────────
  app.get('/public/celula/:qrToken', async (request, reply) => {
    const { qrToken } = request.params
    const celula = await prisma.celula.findUnique({
      where: { qrToken },
      select: { nome: true, ativa: true }
    })
    if (!celula || !celula.ativa) {
      return reply.code(404).send({ erro: 'Célula não encontrada' })
    }
    return reply.send({ nome: celula.nome })
  })

  // ── POST /celulas (ADMIN) ───────────────────────────────────────────────────
  app.post('/celulas', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const parsed = celulaSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }
    const { nome, descricao, frequenciaDias, liderId } = parsed.data
    // Dia da semana DERIVADO da data (nunca falha por mismatch) + data UTC-pinada.
    const diaSemana = weekdayDaString(parsed.data.dataPrimeiroEncontro)
    const dataPrimeiroEncontro = dataUtcDaString(parsed.data.dataPrimeiroEncontro)
    const endereco = Object.fromEntries(
      CAMPOS_ENDERECO.filter((k) => parsed.data[k] !== undefined).map((k) => [k, parsed.data[k]])
    )

    if (liderId) {
      const lider = await prisma.user.findUnique({ where: { id: liderId } })
      if (!lider) return reply.code(404).send({ erro: 'Líder não encontrado' })
    }

    // Gera qrToken único: slug do nome + sufixo incremental
    let qrToken
    let sufixo = 1
    const MAX_SUFIXO = 50
    while (sufixo <= MAX_SUFIXO) {
      qrToken = gerarQrToken(nome, String(sufixo))
      const existing = await prisma.celula.findUnique({ where: { qrToken } })
      if (!existing) break
      sufixo++
    }

    // Fix 1: cria célula e promoção de líder em transação única.
    // Em P2002: distingue colisão de liderId (409 imediato) de qrToken (retry com novo sufixo).
    let celula
    const MAX_TENTATIVAS = 5
    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
      try {
        celula = await prisma.$transaction(async (tx) => {
          const c = await tx.celula.create({
            data: { nome, descricao, diaSemana, frequenciaDias, dataPrimeiroEncontro, qrToken, liderId, ...endereco }
          })
          if (liderId) {
            await tx.user.update({
              where: { id: liderId },
              data: { papel: 'LIDER', celulaId: c.id }
            })
          }
          return c
        })
        break
      } catch (err) {
        if (isP2002OnField(err, 'liderId')) {
          return reply.code(409).send({ erro: 'Usuário já lidera outra célula' })
        } else if (isP2002OnField(err, 'qrToken') && tentativa < MAX_TENTATIVAS - 1) {
          sufixo++
          qrToken = gerarQrToken(nome, String(sufixo))
        } else if (err?.code === 'P2002') {
          return reply.code(409).send({ erro: 'Não foi possível gerar um identificador único para a célula' })
        } else {
          throw err
        }
      }
    }

    // materializarEncontros fica fora da transação (é idempotente)
    await materializarEncontros(celula.id)

    return reply.code(201).send({ celula })
  })

  // ── GET /celulas (LIDER+) ───────────────────────────────────────────────────
  app.get('/celulas', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const usuario = request.usuario
    const where = usuario.papel === 'ADMIN' ? {} : { liderId: usuario.id }
    const celulas = await prisma.celula.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { membros: true, encontros: true } },
        lider: { select: { id: true, nome: true, email: true } }
      }
    })
    return reply.send({ celulas })
  })

  // ── GET /celulas/publicas (seleção no onboarding — permite pendente) ─────────
  // Só expõe o essencial para escolher: bairro, dia, horário, frequência e os
  // líderes (nome + foto). Nunca o endereço completo.
  app.get('/celulas/publicas', { preHandler: requireRole('MEMBRO', { permitirPendente: true }) }, async (request, reply) => {
    const celulas = await prisma.celula.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      select: {
        id: true, nome: true, bairro: true, diaSemana: true,
        frequenciaDias: true, dataPrimeiroEncontro: true,
        lider: { select: { nome: true, avatar: true } }
      }
    })
    const lista = celulas.map((c) => ({
      id: c.id, nome: c.nome, bairro: c.bairro, diaSemana: c.diaSemana,
      frequenciaDias: c.frequenciaDias, dataPrimeiroEncontro: c.dataPrimeiroEncontro,
      lideres: c.lider ? [c.lider] : []
    }))
    return reply.send({ celulas: lista })
  })

  // ── GET /celulas/:id (escopo) ───────────────────────────────────────────────
  app.get('/celulas/:id', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({
      where: { id },
      include: {
        lider: true,
        _count: { select: { membros: true, encontros: true } }
      }
    })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    return reply.send({ celula: { ...celula, lider: publicoLeve(celula.lider) } })
  })

  // ── GET /celulas/:id/membros (escopo) ───────────────────────────────────────
  app.get('/celulas/:id/membros', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    const soAtivos = request.usuario.papel !== 'ADMIN'
    const membros = await prisma.user.findMany({
      where: { celulaId: id, ...(soAtivos ? { ativo: true } : {}) },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, avatar: true, papel: true, ativo: true, whatsapp: true }
    })
    return reply.send({ membros })
  })

  // ── PUT /celulas/:id (escopo) ───────────────────────────────────────────────
  app.put('/celulas/:id', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const parsed = updateCelulaSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }

    const data = parsed.data
    const mudouFrequencia =
      data.frequenciaDias !== undefined && data.frequenciaDias !== celula.frequenciaDias
    const mudouDataPrimeiro =
      data.dataPrimeiroEncontro !== undefined &&
      new Date(data.dataPrimeiroEncontro).getTime() !== new Date(celula.dataPrimeiroEncontro).getTime()

    await prisma.celula.update({ where: { id }, data })

    if (mudouFrequencia || mudouDataPrimeiro) {
      // Apaga encontros futuros AGENDADO sem nenhuma presença registrada
      const agora = new Date()
      const encontrosFuturos = await prisma.encontro.findMany({
        where: { celulaId: id, status: 'AGENDADO', data: { gt: agora } },
        include: { _count: { select: { presencas: true } } }
      })
      const semPresenca = encontrosFuturos
        .filter((e) => e._count.presencas === 0)
        .map((e) => e.id)
      if (semPresenca.length > 0) {
        await prisma.encontro.deleteMany({ where: { id: { in: semPresenca } } })
      }
      await materializarEncontros(id)

      // Re-sync membros vinculados ao Google (idempotente). Bloco best-effort: nunca quebra a rota.
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
    }

    const atualizada = await prisma.celula.findUnique({ where: { id } })
    return reply.send({ celula: atualizada })
  })

  // ── POST /celulas/:id/lider (ADMIN) ────────────────────────────────────────
  app.post('/celulas/:id/lider', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })

    const parsed = z.object({ userId: z.string() }).safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }
    const { userId } = parsed.data

    const novoLider = await prisma.user.findUnique({ where: { id: userId } })
    if (!novoLider) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    // Determina se o novo líder já lidera outra célula (leitura antes da transação)
    const celulaAnteriorId =
      novoLider.celulaId && novoLider.celulaId !== id ? novoLider.celulaId : null

    let celulaAnterior = null
    if (celulaAnteriorId) {
      celulaAnterior = await prisma.celula.findUnique({ where: { id: celulaAnteriorId } })
    }

    // Todas as escritas em transação atômica
    const atualizada = await prisma.$transaction(async (tx) => {
      // Se o novo líder já lidera OUTRA célula, libera o liderId daquela célula
      if (celulaAnterior && celulaAnterior.liderId === userId) {
        await tx.celula.update({
          where: { id: celulaAnteriorId },
          data: { liderId: null }
        })
      }

      // Rebaixa o líder anterior a MEMBRO (se houver e for diferente).
      // Um ADMIN nunca é rebaixado: `papel: { not: 'ADMIN' }` preserva o topo da hierarquia.
      if (celula.liderId && celula.liderId !== userId) {
        await tx.user.updateMany({
          where: { id: celula.liderId, papel: { not: 'ADMIN' } },
          data: { papel: 'MEMBRO', celulaId: null }
        })
      }

      // Promove o novo líder. Se já for ADMIN, mantém o papel (ADMIN > LIDER)
      // e continua global (celulaId null) — o vínculo fica só em celula.liderId.
      if (novoLider.papel !== 'ADMIN') {
        await tx.user.update({
          where: { id: userId },
          data: { papel: 'LIDER', celulaId: id }
        })
      }

      return tx.celula.update({
        where: { id },
        data: { liderId: userId }
      })
    })

    return reply.send({ celula: atualizada })
  })

  // ── DELETE /celulas/:id (ADMIN) ─────────────────────────────────────────────
  app.delete('/celulas/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })

    // Rebaixa o ex-líder para MEMBRO e remove a célula atomicamente.
    // `celulaId: null` torna o handler autossuficiente (não depende só do SetNull do schema).
    await prisma.$transaction(async (tx) => {
      if (celula.liderId) {
        // ADMIN nunca é rebaixado (`papel: { not: 'ADMIN' }`).
        await tx.user.updateMany({
          where: { id: celula.liderId, papel: { not: 'ADMIN' } },
          data: { papel: 'MEMBRO', celulaId: null }
        })
      }
      await tx.celula.delete({ where: { id } })
    })
    return reply.code(204).send()
  })
}
