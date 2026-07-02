// Fonte ÚNICA das regras de papel (RBAC). Importado por apps/api e apps/web.
export const PAPEL_RANK = { MEMBRO: 1, LIDER: 2, ADMIN: 3, SUPER_ADMIN: 4 }
export const ROTULO_PAPEL = {
  MEMBRO: 'Membro',
  LIDER: 'Líder',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
}
const TODOS_PAPEIS = ['MEMBRO', 'LIDER', 'ADMIN', 'SUPER_ADMIN']

export function temNivel(papel, minimo) {
  return (PAPEL_RANK[papel] || 0) >= (PAPEL_RANK[minimo] || 0)
}
export function ehAdmin(papel) {
  return (PAPEL_RANK[papel] || 0) >= PAPEL_RANK.ADMIN
}
export function ehSuperAdmin(papel) {
  return papel === 'SUPER_ADMIN'
}
export function ehLider(papel) {
  return papel === 'LIDER'
}
export function ehGestor(papel) {
  return (PAPEL_RANK[papel] || 0) >= PAPEL_RANK.LIDER
}

/**
 * Regra de edição de papel (spec §4.1):
 * - Conceder/mexer em SUPER_ADMIN → só SUPER_ADMIN.
 * - Rebaixar/alterar um ADMIN → só SUPER_ADMIN.
 * - Promover para ADMIN → ADMIN ou acima (admin nomeia admin).
 * - Transições MEMBRO↔LIDER e no-ops → ADMIN ou acima.
 */
export function podeEditarPapel(editor, atual, novo) {
  if (novo === 'SUPER_ADMIN' || atual === 'SUPER_ADMIN') return editor === 'SUPER_ADMIN'
  if (atual === 'ADMIN') return editor === 'SUPER_ADMIN'
  if (novo === 'ADMIN') return temNivel(editor, 'ADMIN')
  return temNivel(editor, 'ADMIN')
}

/** Papéis que o editor pode ATRIBUIR ao alvo (inclui o atual, para "manter"). */
export function opcoesDePapel(editorPapel, alvoPapel) {
  return TODOS_PAPEIS.filter(
    (novo) => novo === alvoPapel || podeEditarPapel(editorPapel, alvoPapel, novo),
  )
}

/** Pode ativar/desativar/editar dados do alvo (papel-based; o chamador ainda barra "a si mesmo"). */
export function podeAgirSobre(editorPapel, alvo) {
  if (!alvo) return false
  if (alvo.papel === 'SUPER_ADMIN') return editorPapel === 'SUPER_ADMIN'
  if (alvo.papel === 'ADMIN') return editorPapel === 'SUPER_ADMIN'
  return temNivel(editorPapel, 'ADMIN')
}
