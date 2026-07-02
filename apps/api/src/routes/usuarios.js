import { prisma } from '../prisma.js'
import { requireRole, podeEditarPapel } from '../lib/roles.js'
import { usuarioAdminUpdateSchema, normalizarWhatsapp } from '@icelula/shared'
import { publico } from '../lib/usuarios.js'

const PAPEIS_VALIDOS = ['MEMBRO', 'LIDER', 'ADMIN', 'SUPER_ADMIN']

export async function usuarioRoutes(app) {
  // Lista/busca usuários (ADMIN) — usado para atribuir líder. Nunca expõe senhaHash.
  app.get('/usuarios', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { busca } = request.query
    const where = busca
      ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { email: { contains: busca, mode: 'insensitive' } }
          ]
        }
      : {}
    const usuarios = await prisma.user.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: 50,
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        celulaId: true,
        ativo: true,
        aprovado: true
      }
    })
    return reply.send({ usuarios })
  })

  // Lista contas pendentes de aprovação (ADMIN).
  app.get('/usuarios/pendentes', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const usuarios = await prisma.user.findMany({
      where: { aprovado: false },
      orderBy: { criadoEm: 'asc' },
      select: { id: true, nome: true, email: true, criadoEm: true }
    })
    return reply.send({ usuarios })
  })

  // Aprova uma conta pendente (ADMIN).
  app.post('/usuarios/:id/aprovar', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    const user = await prisma.user.update({ where: { id }, data: { aprovado: true } })
    return reply.send({ usuario: publico(user) })
  })

  // Altera o papel (nível de acesso) de um usuário.
  // Só SUPER_ADMIN concede/revoga ADMIN ou SUPER_ADMIN; ADMIN troca MEMBRO<->LIDER.
  app.patch('/usuarios/:id/papel', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const novo = request.body?.papel
    if (!PAPEIS_VALIDOS.includes(novo)) return reply.code(400).send({ erro: 'Papel inválido' })
    if (id === request.usuario.id) return reply.code(400).send({ erro: 'Você não pode alterar o próprio papel' })

    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    if (!podeEditarPapel(request.usuario.papel, alvo.papel, novo)) {
      return reply.code(403).send({ erro: 'Sem permissão para definir esse nível de acesso' })
    }

    const user = await prisma.user.update({ where: { id }, data: { papel: novo } })
    return reply.send({ usuario: publico(user) })
  })

  // Recusa e remove uma conta ainda pendente (ADMIN).
  app.post('/usuarios/:id/recusar', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    if (alvo.aprovado) return reply.code(400).send({ erro: 'Conta já aprovada; use desativar.' })
    await prisma.user.delete({ where: { id } })
    return reply.send({ ok: true })
  })

  // Edita um membro (ADMIN): nome, email, whatsapp, ativo. Soft-delete via ativo:false.
  app.put('/usuarios/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const parsed = usuarioAdminUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })

    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    const data = {}
    if (parsed.data.nome !== undefined) data.nome = parsed.data.nome
    if (parsed.data.email !== undefined && parsed.data.email !== alvo.email) {
      const colide = await prisma.user.findFirst({ where: { email: parsed.data.email, id: { not: id } } })
      if (colide) return reply.code(409).send({ erro: 'E-mail já em uso' })
      data.email = parsed.data.email
    }
    if (parsed.data.whatsapp !== undefined) {
      if (parsed.data.whatsapp === null || parsed.data.whatsapp === '') data.whatsapp = null
      else {
        const w = normalizarWhatsapp(parsed.data.whatsapp)
        if (!w) return reply.code(400).send({ erro: 'WhatsApp inválido' })
        data.whatsapp = w
      }
    }
    if (parsed.data.ativo !== undefined) {
      if (parsed.data.ativo === false) {
        if (id === request.usuario.id) return reply.code(400).send({ erro: 'Você não pode inativar a si mesmo' })
        const lideranca = await prisma.celula.findFirst({ where: { liderId: id } })
        if (lideranca) return reply.code(409).send({ erro: 'Defina outro líder antes de inativar este membro' })
      }
      data.ativo = parsed.data.ativo
    }

    const user = await prisma.user.update({ where: { id }, data })
    return reply.send({ usuario: publico(user) })
  })
}
