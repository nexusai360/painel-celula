export const PAPEL_RANK = { MEMBRO: 1, LIDER: 2, ADMIN: 3 }

export function temNivel(papelUsuario, papelMinimo) {
  return (PAPEL_RANK[papelUsuario] || 0) >= (PAPEL_RANK[papelMinimo] || 0)
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
