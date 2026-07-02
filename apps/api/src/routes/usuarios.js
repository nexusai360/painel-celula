import { prisma } from '../prisma.js'
import {
  requireRole, requireGestor, ehAdmin, podeEditarNivel, podeEditarQualificacao, qualificacaoMinima,
  TODOS_NIVEIS, TODAS_QUALIFICACOES,
} from '../lib/roles.js'
import {
  usuarioAdminUpdateSchema, usuarioAdminCreateSchema, senhaResetSchema, normalizarWhatsapp,
} from '@icelula/shared'
import { publico } from '../lib/usuarios.js'
import { hashSenha } from '../lib/password.js'

// IDs das células que o usuário lidera (junção N:N).
async function celulasLideradasIds(userId) {
  const cels = await prisma.celula.findMany({ where: { lideres: { some: { id: userId } } }, select: { id: true } })
  return cels.map((c) => c.id)
}

// ADMIN+ gerencia qualquer pendente; líder só os das células que lidera.
async function podeGerenciarPendente(usuario, alvo) {
  if (ehAdmin(usuario.nivelAcesso)) return true
  if (!alvo.celulaId) return false
  const ids = await celulasLideradasIds(usuario.id)
  return ids.includes(alvo.celulaId)
}

export async function usuarioRoutes(app) {
  // Lista/busca usuários (ADMIN). Nunca expõe senhaHash.
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
        nivelAcesso: true,
        qualificacao: true,
        celulaId: true,
        ativo: true,
        aprovado: true
      }
    })
    return reply.send({ usuarios })
  })

  // Lista contas pendentes: ADMIN+ vê todas; LÍDER vê só as da própria célula.
  app.get('/usuarios/pendentes', { preHandler: requireGestor() }, async (request, reply) => {
    const admin = ehAdmin(request.usuario.nivelAcesso)
    const where = { aprovado: false, ativo: true }
    if (!admin) where.celulaId = { in: await celulasLideradasIds(request.usuario.id) }
    const usuarios = await prisma.user.findMany({
      where,
      orderBy: { criadoEm: 'asc' },
      select: { id: true, nome: true, email: true, criadoEm: true, celula: { select: { nome: true } } }
    })
    return reply.send({ usuarios: usuarios.map((u) => ({ id: u.id, nome: u.nome, email: u.email, criadoEm: u.criadoEm, celulaNome: u.celula?.nome ?? null })) })
  })

  // Cria um usuário (ADMIN). Conta nasce APROVADA e ATIVA, com senha definida.
  // Nível/qualificação concedidos respeitam as travas de RBAC do criador.
  app.post('/usuarios', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const parsed = usuarioAdminCreateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    const { nome, email, senha, qualificacao, nivelAcesso } = parsed.data

    if (!podeEditarNivel(request.usuario.nivelAcesso, 'USUARIO', nivelAcesso)) {
      return reply.code(403).send({ erro: 'Sem permissão para conceder esse nível de acesso' })
    }
    if (!podeEditarQualificacao(request.usuario.nivelAcesso, request.usuario.qualificacao, qualificacao)) {
      return reply.code(403).send({ erro: 'Sem permissão para definir essa qualificação' })
    }

    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) return reply.code(409).send({ erro: 'E-mail já cadastrado' })

    const whatsapp = parsed.data.whatsapp ? normalizarWhatsapp(parsed.data.whatsapp) : null
    const user = await prisma.user.create({
      data: {
        nome, email, senhaHash: await hashSenha(senha),
        nivelAcesso, qualificacao, whatsapp, aprovado: true, ativo: true,
      },
    })
    return reply.code(201).send({ usuario: publico(user) })
  })

  // Redefine a senha de um usuário (ADMIN). Mexer em ADMIN/SUPER exige SUPER (self-exempt).
  app.patch('/usuarios/:id/senha', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const parsed = senhaResetSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })

    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    if (id !== request.usuario.id && request.usuario.nivelAcesso !== 'SUPER_ADMIN' && ehAdmin(alvo.nivelAcesso)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    await prisma.user.update({ where: { id }, data: { senhaHash: await hashSenha(parsed.data.senha) } })
    return reply.send({ ok: true })
  })

  // Aprova uma conta pendente (ADMIN+ qualquer; LÍDER só da própria célula).
  // Quem aprova escolhe a QUALIFICAÇÃO (default MEMBRO), dentro das opções permitidas.
  app.post('/usuarios/:id/aprovar', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params
    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    if (!(await podeGerenciarPendente(request.usuario, alvo))) return reply.code(403).send({ erro: 'Sem permissão' })

    const qualificacao = request.body?.qualificacao || 'MEMBRO'
    if (!TODAS_QUALIFICACOES.includes(qualificacao)) return reply.code(400).send({ erro: 'Qualificação inválida' })
    if (!podeEditarQualificacao(request.usuario.nivelAcesso, request.usuario.qualificacao, qualificacao)) {
      return reply.code(403).send({ erro: 'Sem permissão para definir essa qualificação' })
    }

    const user = await prisma.user.update({ where: { id }, data: { aprovado: true, qualificacao } })
    return reply.send({ usuario: publico(user) })
  })

  // Altera o NÍVEL DE ACESSO (USUARIO/ADMIN/SUPER_ADMIN). Só ADMIN+; travas por podeEditarNivel.
  app.patch('/usuarios/:id/nivel', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const novo = request.body?.nivelAcesso
    if (!TODOS_NIVEIS.includes(novo)) return reply.code(400).send({ erro: 'Nível inválido' })
    if (id === request.usuario.id) return reply.code(400).send({ erro: 'Você não pode alterar o próprio nível' })

    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    if (!podeEditarNivel(request.usuario.nivelAcesso, alvo.nivelAcesso, novo)) {
      return reply.code(403).send({ erro: 'Sem permissão para definir esse nível de acesso' })
    }
    // Não deixa remover o ÚLTIMO super admin.
    if (alvo.nivelAcesso === 'SUPER_ADMIN' && novo !== 'SUPER_ADMIN') {
      const outros = await prisma.user.count({ where: { nivelAcesso: 'SUPER_ADMIN', id: { not: id } } })
      if (outros === 0) return reply.code(409).send({ erro: 'Não há como remover o último Super Admin' })
    }

    const user = await prisma.user.update({ where: { id }, data: { nivelAcesso: novo } })
    return reply.send({ usuario: publico(user) })
  })

  // Altera a QUALIFICAÇÃO. ADMIN+ livre; gestor (líder/pastor) só na própria célula, até LÍDER.
  // Admin/super podem alterar a PRÓPRIA qualificação.
  app.patch('/usuarios/:id/qualificacao', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params
    const nova = request.body?.qualificacao
    if (!TODAS_QUALIFICACOES.includes(nova)) return reply.code(400).send({ erro: 'Qualificação inválida' })

    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    const admin = ehAdmin(request.usuario.nivelAcesso)
    const escopoOk = admin || (id === request.usuario.id) ||
      (!!request.usuario.celulaId && alvo.celulaId === request.usuario.celulaId)
    if (!escopoOk) return reply.code(403).send({ erro: 'Sem permissão' })
    if (!podeEditarQualificacao(request.usuario.nivelAcesso, request.usuario.qualificacao, nova)) {
      return reply.code(403).send({ erro: 'Sem permissão para definir essa qualificação' })
    }

    // Trava de rebaixamento: rebaixar um LÍDER/PASTOR para abaixo de LÍDER exige tratar os vínculos.
    const rebaixandoLider = qualificacaoMinima(alvo.qualificacao, 'LIDER') && !qualificacaoMinima(nova, 'LIDER')
    if (rebaixandoLider) {
      const lideradas = await prisma.celula.findMany({ where: { lideres: { some: { id } } }, select: { id: true } })
      if (lideradas.length > 1) {
        return reply.code(409).send({ erro: 'Este líder atua em várias células. Remova-o das células antes de rebaixar.' })
      }
      if (lideradas.length === 1) {
        // Lidera exatamente 1 → vira MEMBRO daquela célula (perde o vínculo de liderança).
        const cId = lideradas[0].id
        await prisma.celula.update({ where: { id: cId }, data: { lideres: { disconnect: { id } } } })
        await prisma.user.update({ where: { id }, data: { celulaId: cId } })
      }
    }

    const user = await prisma.user.update({ where: { id }, data: { qualificacao: nova } })
    return reply.send({ usuario: publico(user) })
  })

  // Recusa uma conta ainda pendente (ADMIN+ qualquer; LÍDER só da sua célula).
  app.post('/usuarios/:id/recusar', { preHandler: requireGestor() }, async (request, reply) => {
    const { id } = request.params
    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    if (alvo.aprovado) return reply.code(400).send({ erro: 'Conta já aprovada; use desativar.' })
    if (!(await podeGerenciarPendente(request.usuario, alvo))) return reply.code(403).send({ erro: 'Sem permissão' })
    // Reprovar = soft (fica REPROVADO, sem qualificação de gestão). Reativar depois volta a Membro.
    const user = await prisma.user.update({ where: { id }, data: { ativo: false, qualificacao: 'MEMBRO' } })
    return reply.send({ usuario: publico(user) })
  })

  // Edita um usuário (ADMIN): nome, email, whatsapp, ativo. Nível/qualificação vão pelos PATCH dedicados.
  app.put('/usuarios/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const parsed = usuarioAdminUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })

    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    // Mexer em conta ADMIN/SUPER é exclusivo do SUPER_ADMIN (self-exempt: admin edita a si mesmo).
    const editorNivel = request.usuario.nivelAcesso
    if (id !== request.usuario.id && editorNivel !== 'SUPER_ADMIN' && ehAdmin(alvo.nivelAcesso)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

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
        const lideranca = await prisma.celula.findFirst({ where: { lideres: { some: { id } } } })
        if (lideranca) return reply.code(409).send({ erro: 'Remova este líder das células antes de inativar' })
      }
      data.ativo = parsed.data.ativo
    }

    const user = await prisma.user.update({ where: { id }, data })
    return reply.send({ usuario: publico(user) })
  })
}
