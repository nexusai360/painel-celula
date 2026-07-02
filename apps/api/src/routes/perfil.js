import { perfilUpdateSchema, normalizarWhatsapp } from '@icelula/shared'
import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'
import { COM_CELULA, comCelula } from '../lib/usuarios.js'

function magicJpegOk(dataUrl) {
  const b64 = dataUrl.split(',')[1] ?? ''
  const buf = Buffer.from(b64, 'base64')
  return buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
}

export async function perfilRoutes(app) {
  app.put('/perfil', {
    preHandler: requireRole('USUARIO', { permitirPendente: true }),
    bodyLimit: 700 * 1024
  }, async (request, reply) => {
    const parsed = perfilUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro:'Dados inválidos', detalhes: parsed.error.issues })

    const data = {}
    if (parsed.data.nome !== undefined) data.nome = parsed.data.nome
    if (parsed.data.whatsapp !== undefined) {
      if (parsed.data.whatsapp === null || parsed.data.whatsapp === '') data.whatsapp = null
      else {
        const w = normalizarWhatsapp(parsed.data.whatsapp)
        if (!w) return reply.code(400).send({ erro:'WhatsApp inválido' })
        data.whatsapp = w
      }
    }
    if (parsed.data.avatar !== undefined) {
      if (parsed.data.avatar === null || parsed.data.avatar === '') data.avatar = null
      else {
        if (!magicJpegOk(parsed.data.avatar)) return reply.code(400).send({ erro:'Imagem inválida' })
        data.avatar = parsed.data.avatar
      }
    }

    if (parsed.data.dataNascimento !== undefined) {
      data.dataNascimento = parsed.data.dataNascimento ? new Date(parsed.data.dataNascimento + 'T12:00:00') : null
    }
    if (parsed.data.estadoCivil !== undefined) {
      data.estadoCivil = parsed.data.estadoCivil || null
    }

    const user = await prisma.user.update({ where:{ id: request.usuario.id }, data, ...COM_CELULA })
    return reply.send({ usuario: comCelula(user) })
  })

  // Seleção de célula pelo próprio usuário (onboarding). Permitido a pendentes.
  // Só define quando ainda não há célula (evita "pular" de célula depois).
  app.post('/perfil/celula', { preHandler: requireRole('USUARIO', { permitirPendente: true }) }, async (request, reply) => {
    const celulaId = request.body?.celulaId
    if (!celulaId || typeof celulaId !== 'string') return reply.code(400).send({ erro: 'Célula inválida' })

    const eu = await prisma.user.findUnique({ where: { id: request.usuario.id } })
    if (eu.celulaId && eu.aprovado) {
      return reply.code(400).send({ erro: 'Você já pertence a uma célula' })
    }
    const celula = await prisma.celula.findUnique({ where: { id: celulaId }, select: { id: true, ativa: true } })
    if (!celula || !celula.ativa) return reply.code(404).send({ erro: 'Célula não encontrada' })

    const user = await prisma.user.update({ where: { id: request.usuario.id }, data: { celulaId }, ...COM_CELULA })
    return reply.send({ usuario: comCelula(user) })
  })

  // ── Cônjuge (vínculo por e-mail com duplo opt-in) ──────────────────────────
  const pendente = { permitirPendente: true }
  const perfilPublico = { id: true, nome: true, email: true, avatar: true }

  // Estado atual: cônjuge vinculado, convites recebidos e convite enviado pendente.
  app.get('/perfil/conjuge', { preHandler: requireRole('USUARIO', pendente) }, async (request, reply) => {
    const meuId = request.usuario.id
    const eu = await prisma.user.findUnique({ where: { id: meuId }, select: { conjugeId: true } })
    const conjuge = eu?.conjugeId
      ? await prisma.user.findUnique({ where: { id: eu.conjugeId }, select: perfilPublico })
      : null
    const recebidasRaw = await prisma.conjugeSolicitacao.findMany({
      where: { alvoId: meuId, status: 'PENDENTE' }, orderBy: { criadoEm: 'desc' }
    })
    const solicitantes = await prisma.user.findMany({
      where: { id: { in: recebidasRaw.map((r) => r.solicitanteId) } }, select: perfilPublico
    })
    const recebidas = recebidasRaw.map((r) => ({ id: r.id, solicitante: solicitantes.find((s) => s.id === r.solicitanteId) || null }))
    const enviadaRaw = await prisma.conjugeSolicitacao.findFirst({ where: { solicitanteId: meuId, status: 'PENDENTE' } })
    const enviada = enviadaRaw
      ? { id: enviadaRaw.id, alvo: await prisma.user.findUnique({ where: { id: enviadaRaw.alvoId }, select: perfilPublico }) }
      : null
    return reply.send({ conjuge, recebidas, enviada })
  })

  // Convida o cônjuge pelo e-mail exato (sem busca aberta).
  app.post('/perfil/conjuge', { preHandler: requireRole('USUARIO', pendente) }, async (request, reply) => {
    const meuId = request.usuario.id
    const email = String(request.body?.email || '').trim()
    if (!email) return reply.code(400).send({ erro: 'Informe o e-mail' })
    const alvo = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
    if (!alvo) return reply.code(404).send({ erro: 'Não encontramos ninguém com esse e-mail' })
    if (alvo.id === meuId) return reply.code(400).send({ erro: 'Você não pode se vincular a si mesmo' })
    const eu = await prisma.user.findUnique({ where: { id: meuId }, select: { conjugeId: true } })
    if (eu?.conjugeId) return reply.code(400).send({ erro: 'Você já tem um cônjuge vinculado' })
    // Se o alvo já me convidou, aceita direto (vínculo mútuo).
    const reversa = await prisma.conjugeSolicitacao.findFirst({ where: { solicitanteId: alvo.id, alvoId: meuId, status: 'PENDENTE' } })
    if (reversa) {
      await vincular(meuId, alvo.id, reversa.id)
      return reply.send({ vinculado: true })
    }
    await prisma.conjugeSolicitacao.upsert({
      where: { solicitanteId_alvoId: { solicitanteId: meuId, alvoId: alvo.id } },
      update: { status: 'PENDENTE', criadoEm: new Date() },
      create: { solicitanteId: meuId, alvoId: alvo.id }
    })
    return reply.send({ enviado: true })
  })

  async function vincular(aId, bId, solicitacaoId) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: aId }, data: { conjugeId: bId } }),
      prisma.user.update({ where: { id: bId }, data: { conjugeId: aId } }),
      prisma.conjugeSolicitacao.update({ where: { id: solicitacaoId }, data: { status: 'ACEITO' } })
    ])
  }

  app.post('/perfil/conjuge/:id/aceitar', { preHandler: requireRole('USUARIO', pendente) }, async (request, reply) => {
    const meuId = request.usuario.id
    const sol = await prisma.conjugeSolicitacao.findUnique({ where: { id: request.params.id } })
    if (!sol || sol.alvoId !== meuId || sol.status !== 'PENDENTE') return reply.code(404).send({ erro: 'Convite não encontrado' })
    await vincular(meuId, sol.solicitanteId, sol.id)
    return reply.send({ ok: true })
  })

  app.post('/perfil/conjuge/:id/recusar', { preHandler: requireRole('USUARIO', pendente) }, async (request, reply) => {
    const meuId = request.usuario.id
    const sol = await prisma.conjugeSolicitacao.findUnique({ where: { id: request.params.id } })
    if (!sol || sol.alvoId !== meuId) return reply.code(404).send({ erro: 'Convite não encontrado' })
    await prisma.conjugeSolicitacao.update({ where: { id: sol.id }, data: { status: 'RECUSADO' } })
    return reply.send({ ok: true })
  })

  // Desfaz o vínculo (dos dois lados).
  app.delete('/perfil/conjuge', { preHandler: requireRole('USUARIO', pendente) }, async (request, reply) => {
    const meuId = request.usuario.id
    const eu = await prisma.user.findUnique({ where: { id: meuId }, select: { conjugeId: true } })
    if (!eu?.conjugeId) return reply.send({ ok: true })
    await prisma.$transaction([
      prisma.user.update({ where: { id: meuId }, data: { conjugeId: null } }),
      prisma.user.update({ where: { id: eu.conjugeId }, data: { conjugeId: null } })
    ])
    return reply.send({ ok: true })
  })
}
