// Fonte ÚNICA das regras de RBAC. Importado por apps/api e apps/web.
//
// Eixo NÍVEL DE ACESSO (plataforma): USUARIO < ADMIN < SUPER_ADMIN. Define permissão.
// (O eixo QUALIFICAÇÃO fica em ./qualificacao.js.) `ehAdmin`/`ehSuperAdmin` servem aos dois
// espaços de valor (ADMIN/SUPER_ADMIN existem em ambos).
export const NIVEL_RANK = { USUARIO: 1, ADMIN: 2, SUPER_ADMIN: 3 }
export const ROTULO_NIVEL = { USUARIO: 'Usuário', ADMIN: 'Administrador', SUPER_ADMIN: 'Super Admin' }
export const TODOS_NIVEIS = ['USUARIO', 'ADMIN', 'SUPER_ADMIN']

/** rank(nível) >= rank(mínimo). */
export function temNivelAcesso(nivel, minimo) {
  return (NIVEL_RANK[nivel] || 0) >= (NIVEL_RANK[minimo] || 0)
}

/**
 * Edição de NÍVEL de acesso:
 * - Conceder/mexer em SUPER_ADMIN → só SUPER_ADMIN.
 * - Rebaixar/alterar um ADMIN → só SUPER_ADMIN.
 * - Promover para ADMIN → ADMIN ou acima (admin nomeia admin).
 */
export function podeEditarNivel(editor, atual, novo) {
  if (novo === 'SUPER_ADMIN' || atual === 'SUPER_ADMIN') return editor === 'SUPER_ADMIN'
  if (atual === 'ADMIN') return editor === 'SUPER_ADMIN'
  if (novo === 'ADMIN') return temNivelAcesso(editor, 'ADMIN')
  return temNivelAcesso(editor, 'ADMIN')
}

/** Níveis que o editor pode ATRIBUIR ao alvo (inclui o atual, para "manter"). */
export function opcoesDeNivel(editorNivel, alvoNivel) {
  return TODOS_NIVEIS.filter(
    (novo) => novo === alvoNivel || podeEditarNivel(editorNivel, alvoNivel, novo),
  )
}

/** Pode ativar/desativar/editar o alvo, por NÍVEL (o chamador ainda barra "a si mesmo"). */
export function podeAgirSobreNivel(editorNivel, alvo) {
  if (!alvo) return false
  const n = alvo.nivelAcesso
  if (n === 'SUPER_ADMIN') return editorNivel === 'SUPER_ADMIN'
  if (n === 'ADMIN') return editorNivel === 'SUPER_ADMIN'
  return temNivelAcesso(editorNivel, 'ADMIN')
}

// ── Eixo PAPEL legado (mantido até a Task 9 do refactor; consumidores migram antes) ─────────
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
