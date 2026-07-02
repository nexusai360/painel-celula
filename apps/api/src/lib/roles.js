export const PAPEL_RANK = { MEMBRO: 1, LIDER: 2, ADMIN: 3, SUPER_ADMIN: 4 }

export function temNivel(papelUsuario, papelMinimo) {
  return (PAPEL_RANK[papelUsuario] || 0) >= (PAPEL_RANK[papelMinimo] || 0)
}

const ALTO_NIVEL = new Set(['ADMIN', 'SUPER_ADMIN'])

/**
 * Regra de edição de papel:
 * - Conceder/revogar ADMIN ou SUPER_ADMIN é EXCLUSIVO do SUPER_ADMIN.
 * - Trocar entre MEMBRO e LIDER pode ADMIN ou SUPER_ADMIN.
 */
export function podeEditarPapel(editorPapel, papelAtual, papelNovo) {
  if (ALTO_NIVEL.has(papelAtual) || ALTO_NIVEL.has(papelNovo)) {
    return editorPapel === 'SUPER_ADMIN'
  }
  return temNivel(editorPapel, 'ADMIN')
}

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
