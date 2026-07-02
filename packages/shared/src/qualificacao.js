// Eixo de QUALIFICAÇÃO (função na igreja) — ortogonal ao nível de acesso.
// Fonte única; importado por apps/api e apps/web.
import { ehAdmin } from './roles.js'

export const QUALIFICACAO_RANK = {
  CONVIDADO: 1, MEMBRO: 2, LOUVOR: 3, COLIDER: 4, LIDER: 5, PASTOR: 6,
}
export const ROTULO_QUALIFICACAO = {
  CONVIDADO: 'Convidado',
  MEMBRO: 'Membro',
  LOUVOR: 'Louvor',
  COLIDER: 'Co-líder',
  LIDER: 'Líder',
  PASTOR: 'Pastor',
}
export const TODAS_QUALIFICACOES = ['CONVIDADO', 'MEMBRO', 'LOUVOR', 'COLIDER', 'LIDER', 'PASTOR']

/** rank(qualificacao) >= rank(minima). */
export function qualificacaoMinima(qualificacao, minima) {
  return (QUALIFICACAO_RANK[qualificacao] || 0) >= (QUALIFICACAO_RANK[minima] || 0)
}

/** Gestor por qualificação = LÍDER ou PASTOR (quem lidera/gerencia célula). */
export function ehGestorQualificacao(qualificacao) {
  return qualificacaoMinima(qualificacao, 'LIDER')
}

/** Só LÍDER e PASTOR podem criar célula (por qualificação). ADMIN cria por nível (à parte). */
export function podeCriarCelulaQualificacao(qualificacao) {
  return qualificacao === 'LIDER' || qualificacao === 'PASTOR'
}

/**
 * Qualificações que o editor pode ATRIBUIR:
 * - Nível ADMIN+ → todas (Convidado…Pastor).
 * - Gestor (LÍDER/PASTOR, nível USUARIO) → até LÍDER (não nomeia PASTOR). Escopo (própria célula) é
 *   checado na rota.
 * - Caso contrário → nenhuma.
 */
export function opcoesDeQualificacao(editorNivel, editorQualificacao) {
  if (ehAdmin(editorNivel)) return [...TODAS_QUALIFICACOES]
  if (ehGestorQualificacao(editorQualificacao)) {
    return TODAS_QUALIFICACOES.filter((q) => qualificacaoMinima('LIDER', q))
  }
  return []
}

export function podeEditarQualificacao(editorNivel, editorQualificacao, novaQualificacao) {
  return opcoesDeQualificacao(editorNivel, editorQualificacao).includes(novaQualificacao)
}
