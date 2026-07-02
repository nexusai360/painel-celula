import { prisma } from '../prisma.js'
import { requireRole, requireGestor } from '../lib/roles.js'
import { podeGerenciarCelula } from '../lib/escopo.js'
import { podeMarcarPresenca } from '../lib/encontros.service.js'
import { publicoLeve } from '../lib/usuarios.js'

export async function presencaRoutes(app) {
  // ── POST /qr/:qrToken/checkin — check-in por QR Code na célula ───────────────
  // Marca presença no encontro de HOJE da célula, se dentro da janela (após o
  // horário). Usado logo após ler o QR (cadastro/login). Escopo: só da célula do
  // usuário. TZ do servidor = America/Sao_Paulo (o "hoje" é local).
  app.post('/qr/:qrToken/checkin', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const { qrToken } = request.params
    const usuario = request.usuario
    const celula = await prisma.celula.findUnique({ where: { qrToken }, select: { id: true, ativa: true } })
    if (!celula || !celula.ativa) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (usuario.celulaId !== celula.id) {
      return reply.code(403).send({ erro: 'Este QR é de outra célula' })
    }
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const fim = new Date(); fim.setHours(23, 59, 59, 999)
    const encontro = await prisma.encontro.findFirst({
      where: { celulaId: celula.id, data: { gte: inicio, lte: fim } }
    })
    if (!encontro) return reply.send({ presenca: false, motivo: 'Não há reunião da célula hoje' })
    const janela = podeMarcarPresenca(encontro)
    if (!janela.ok) return reply.send({ presenca: false, motivo: janela.motivo })
    await prisma.presenca.upsert({
      where: { encontroId_userId: { encontroId: encontro.id, userId: usuario.id } },
      update: {},
      create: { encontroId: encontro.id, userId: usuario.id }
    })
    return reply.send({ presenca: true, encontroId: encontro.id })
  })

  // ── POST /encontros/:id/presenca (MEMBRO+; marca a própria presença) ─────────
  app.post('/encontros/:id/presenca', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const { id } = request.params
    const usuario = request.usuario

    const encontro = await prisma.encontro.findUnique({ where: { id } })
    if (!encontro) return reply.code(404).send({ erro: 'Encontro não encontrado' })

    // Chamador deve pertencer à célula do encontro
    if (usuario.celulaId !== encontro.celulaId) {
      return reply.code(403).send({ erro: 'Você não participa desta célula' })
    }

    // Valida janela de marcação
    const resultado = podeMarcarPresenca(encontro)
    if (!resultado.ok) {
      return reply.code(403).send({ erro: resultado.motivo })
    }

    const existing = await prisma.presenca.findUnique({
      where: { encontroId_userId: { encontroId: id, userId: usuario.id } }
    })
    let presenca = existing
    let criou = false
    if (!existing) {
      presenca = await prisma.presenca.create({ data: { encontroId: id, userId: usuario.id } })
      criou = true
    }
    const totalPresencas = await prisma.presenca.count({ where: { encontroId: id } })
    return reply.code(criou ? 201 : 200).send({ presenca, totalPresencas })
  })

  // ── DELETE /encontros/:id/presenca (MEMBRO+; remove a própria presença) ─────
  app.delete('/encontros/:id/presenca', { preHandler: requireRole('USUARIO') }, async (request, reply) => {
    const { id } = request.params
    const usuario = request.usuario

    const encontro = await prisma.encontro.findUnique({ where: { id } })
    if (!encontro) return reply.code(404).send({ erro: 'Encontro não encontrado' })

    // Fix 4: mesma guarda de membership que POST — simetria
    if (usuario.celulaId !== encontro.celulaId) {
      return reply.code(403).send({ erro: 'Você não participa desta célula' })
    }

    // Idempotente: 200 mesmo se não existia
    await prisma.presenca.deleteMany({
      where: { encontroId: id, userId: usuario.id }
    })
    const totalPresencas = await prisma.presenca.count({ where: { encontroId: id } })
    return reply.code(200).send({ totalPresencas })
  })

  // ── GET /encontros/:id/presencas (LIDER+ com escopo) ─────────────────────────
  app.get('/encontros/:id/presencas', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params

    const encontro = await prisma.encontro.findUnique({
      where: { id },
      include: { celula: { include: { lideres: { select: { id: true } } } } }
    })
    if (!encontro) return reply.code(404).send({ erro: 'Encontro não encontrado' })

    if (!podeGerenciarCelula(request.usuario, encontro.celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const presencas = await prisma.presenca.findMany({
      where: { encontroId: id },
      include: { user: true }
    })

    const presencasPublicas = presencas.map((p) => ({
      ...p,
      user: publicoLeve(p.user)
    }))

    return reply.send({ presencas: presencasPublicas, total: presencas.length })
  })

  // ── GET /celulas/:id/frequencia (LIDER+ com escopo) ──────────────────────────
  app.get('/celulas/:id/frequencia', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params

    const celula = await prisma.celula.findUnique({ where: { id }, include: { lideres: { select: { id: true } } } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })

    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const agora = new Date()

    // Encontros realizados: status REALIZADO ou (não CANCELADO e data <= agora)
    const encontrosRealizados = await prisma.encontro.findMany({
      where: {
        celulaId: id,
        OR: [
          { status: 'REALIZADO' },
          { status: { not: 'CANCELADO' }, data: { lte: agora } }
        ]
      },
      select: { id: true }
    })

    const totalEncontrosRealizados = encontrosRealizados.length
    const encontroIds = encontrosRealizados.map((e) => e.id)

    // Membros da célula (todos com celulaId = id)
    const membros = await prisma.user.findMany({
      where: { celulaId: id },
      select: { id: true, nome: true }
    })

    // Presenças por pessoa nos encontros realizados
    const porPessoa = await Promise.all(
      membros.map(async (membro) => {
        const count =
          encontroIds.length > 0
            ? await prisma.presenca.count({
                where: { userId: membro.id, encontroId: { in: encontroIds } }
              })
            : 0
        const percentual =
          totalEncontrosRealizados > 0
            ? Math.round((count / totalEncontrosRealizados) * 100)
            : 0
        return {
          userId: membro.id,
          nome: membro.nome,
          presencas: count,
          percentual
        }
      })
    )

    const ranking = [...porPessoa].sort((a, b) => b.presencas - a.presencas)
    const ausentes = porPessoa
      .filter((p) => p.presencas === 0)
      .map((p) => ({ userId: p.userId, nome: p.nome }))

    return reply.send({ totalEncontrosRealizados, porPessoa, ranking, ausentes })
  })
}
