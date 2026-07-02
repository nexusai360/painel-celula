// Segmentação de avisos por 3 eixos combináveis (AND): células, qualificações, níveis.
// Cada eixo tem um flag `*Todas` (não-restritivo) + um array. Vazio+Todas=false => ninguém.
import { ehAdmin, TODAS_QUALIFICACOES, TODOS_NIVEIS } from './roles.js'

const bool = (v) => v === true
const arr = (v) => (Array.isArray(v) ? v : [])

/**
 * Where do Prisma para "avisos que atingem este usuário" (Banner ou Notificacao).
 * `celulaIds` = células do usuário (membro + as que lidera). SUPER_ADMIN casa alvo ADMIN.
 */
export function montarWhereAlvo(usuario, celulaIds) {
  const cels = [...new Set([usuario.celulaId, ...(celulaIds || [])].filter(Boolean))]
  const niveis = usuario.nivelAcesso === 'SUPER_ADMIN' ? ['SUPER_ADMIN', 'ADMIN'] : [usuario.nivelAcesso]
  return {
    AND: [
      { OR: [{ celulasTodas: true }, { celulasAlvo: { hasSome: cels } }] },
      { OR: [{ qualificacoesTodas: true }, { qualificacoesAlvo: { has: usuario.qualificacao } }] },
      { OR: [{ niveisTodas: true }, { niveisAlvo: { hasSome: niveis } }] },
    ],
  }
}

/**
 * Normaliza o alvo vindo do cliente conforme a permissão do remetente.
 * - ADMIN+: livre (os 3 eixos).
 * - LÍDER/PASTOR: nível fixo {USUARIO} (nunca mira admin); células ⊆ as que lidera
 *   (Todas do líder = todas as que ele lidera, não a plataforma).
 */
export function normalizarAlvo(body, remetente, ledCellIds) {
  const admin = ehAdmin(remetente.nivelAcesso)
  let celulasTodas = bool(body.celulasTodas)
  let celulasAlvo = arr(body.celulasAlvo).map(String)
  const qualificacoesTodas = bool(body.qualificacoesTodas)
  const qualificacoesAlvo = arr(body.qualificacoesAlvo).filter((q) => TODAS_QUALIFICACOES.includes(q))
  let niveisTodas = bool(body.niveisTodas)
  let niveisAlvo = arr(body.niveisAlvo).filter((n) => TODOS_NIVEIS.includes(n))

  if (!admin) {
    niveisTodas = false
    niveisAlvo = ['USUARIO']
    if (celulasTodas) { celulasTodas = false; celulasAlvo = [...ledCellIds] }
    else celulasAlvo = celulasAlvo.filter((id) => ledCellIds.includes(id))
  }
  return { celulasTodas, celulasAlvo, qualificacoesTodas, qualificacoesAlvo, niveisTodas, niveisAlvo }
}

/** Retorna string de erro se o alvo mira "ninguém" (eixo vazio), ou null se ok. */
export function alvoInvalido(alvo) {
  if (!alvo.celulasTodas && alvo.celulasAlvo.length === 0) return 'Selecione ao menos uma célula (ou "Todas").'
  if (!alvo.qualificacoesTodas && alvo.qualificacoesAlvo.length === 0) return 'Selecione ao menos uma qualificação (ou "Todas").'
  if (!alvo.niveisTodas && alvo.niveisAlvo.length === 0) return 'Selecione ao menos um nível (ou "Todos").'
  return null
}
