// RBAC vem do pacote compartilhado (fonte única). Aqui ficam os middlewares do Fastify.
export {
  // eixo nível de acesso
  NIVEL_RANK, ROTULO_NIVEL, TODOS_NIVEIS, temNivelAcesso, podeEditarNivel, opcoesDeNivel, podeAgirSobreNivel,
  ehAdmin, ehSuperAdmin,
  // eixo qualificação
  QUALIFICACAO_RANK, ROTULO_QUALIFICACAO, TODAS_QUALIFICACOES, qualificacaoMinima, ehGestorQualificacao,
  podeCriarCelulaQualificacao, opcoesDeQualificacao, podeEditarQualificacao,
  // legado (até a Task 9)
  PAPEL_RANK, ROTULO_PAPEL, temNivel, ehLider, ehGestor, podeEditarPapel, opcoesDePapel, podeAgirSobre,
} from '@icelula/shared'
import { temNivelAcesso, ehAdmin, ehGestorQualificacao } from '@icelula/shared'

// Carrega o usuário FRESCO e faz as checagens base (ativo/aprovado). Retorna o `u`
// selecionado, ou envia a resposta de erro e retorna null.
async function carregarUsuario(request, reply, { permitirPendente }) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ erro: 'Não autenticado' })
    return null
  }
  const { prisma } = await import('../prisma.js') // import tardio evita ciclo
  const u = await prisma.user.findUnique({
    where: { id: request.user.id },
    select: { id: true, nivelAcesso: true, qualificacao: true, celulaId: true, ativo: true, aprovado: true },
  })
  if (!u) { reply.code(401).send({ erro: 'Não autenticado' }); return null }
  if (!u.ativo) { reply.code(403).send({ erro: 'Usuário desativado' }); return null }
  if (!u.aprovado && !permitirPendente) {
    reply.code(403).send({ erro: 'Conta aguardando aprovação', pendente: true })
    return null
  }
  return u
}

function injetar(request, u) {
  request.usuario = {
    id: u.id,
    nivelAcesso: u.nivelAcesso,
    qualificacao: u.qualificacao,
    celulaId: u.celulaId,
    aprovado: u.aprovado,
  }
}

/**
 * requireRole(nivelMinimo, { permitirPendente }) — exige NÍVEL DE ACESSO mínimo
 * (`USUARIO` | `ADMIN` | `SUPER_ADMIN`). Recarrega o usuário do banco.
 */
export function requireRole(nivelMinimo, { permitirPendente = false } = {}) {
  return async function (request, reply) {
    const u = await carregarUsuario(request, reply, { permitirPendente })
    if (!u) return
    if (!temNivelAcesso(u.nivelAcesso, nivelMinimo)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    injetar(request, u)
  }
}

/** requireAuth — só exige sessão válida + conta ativa (e aprovada, salvo permitirPendente). */
export function requireAuth({ permitirPendente = false } = {}) {
  return async function (request, reply) {
    const u = await carregarUsuario(request, reply, { permitirPendente })
    if (!u) return
    injetar(request, u)
  }
}

/**
 * requireGestor — gate grosso de gestão: nível ADMIN+ OU qualificação ≥ LÍDER.
 * O escopo fino (esta célula específica) fica em `podeGerenciarCelula`.
 */
export function requireGestor({ permitirPendente = false } = {}) {
  return async function (request, reply) {
    const u = await carregarUsuario(request, reply, { permitirPendente })
    if (!u) return
    if (!ehAdmin(u.nivelAcesso) && !ehGestorQualificacao(u.qualificacao)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    injetar(request, u)
  }
}
