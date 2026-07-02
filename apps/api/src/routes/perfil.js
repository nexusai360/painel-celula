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
    preHandler: requireRole('MEMBRO', { permitirPendente: true }),
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
  app.post('/perfil/celula', { preHandler: requireRole('MEMBRO', { permitirPendente: true }) }, async (request, reply) => {
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
}
