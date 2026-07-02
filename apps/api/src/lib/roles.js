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

export function requireRole(papelMinimo) {
  return async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ erro: 'Não autenticado' })
    }
    const { id, papel, celulaId } = request.user
    if (!temNivel(papel, papelMinimo)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    request.usuario = { id, papel, celulaId }
  }
}
