// RBAC vem do pacote compartilhado (fonte única). Aqui fica só o middleware do Fastify.
export { PAPEL_RANK, ROTULO_PAPEL, temNivel, ehAdmin, ehSuperAdmin, ehLider, ehGestor, podeEditarPapel, opcoesDePapel, podeAgirSobre } from '@icelula/shared'
import { temNivel } from '@icelula/shared'

/**
 * requireRole(papelMinimo, { permitirPendente })
 * - Verifica o JWT e carrega o usuário FRESCO do banco (papel/celulaId/ativo/
 *   aprovado atualizados na hora — troca de papel e aprovação valem imediatamente).
 * - Bloqueia contas inativas e, por padrão, contas ainda NÃO aprovadas.
 *   Rotas de auto-serviço do pendente (perfil, seleção de célula, /me, listagem
 *   pública de células) passam `permitirPendente: true`.
 */
export function requireRole(papelMinimo, { permitirPendente = false } = {}) {
  return async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ erro: 'Não autenticado' })
    }
    // Import tardio evita ciclo de dependência.
    const { prisma } = await import('../prisma.js')
    const u = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, papel: true, celulaId: true, ativo: true, aprovado: true }
    })
    if (!u) return reply.code(401).send({ erro: 'Não autenticado' })
    if (!u.ativo) return reply.code(403).send({ erro: 'Usuário desativado' })
    if (!temNivel(u.papel, papelMinimo)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    if (!u.aprovado && !permitirPendente) {
      return reply.code(403).send({ erro: 'Conta aguardando aprovação', pendente: true })
    }
    request.usuario = { id: u.id, papel: u.papel, celulaId: u.celulaId, aprovado: u.aprovado }
  }
}
