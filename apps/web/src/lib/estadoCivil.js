// Estado civil vira um checkbox "Sou casado(a)". Para não destruir dados legados
// (UNIAO_ESTAVEL/DIVORCIADO/VIUVO), só gravamos o enum quando o usuário REALMENTE
// alterna o checkbox (transição real). Sem transição → não envia o campo.

/** Leitura: o checkbox nasce marcado para casado(a) ou união estável. */
export function ehCasadoInicial(estadoCivil) {
  return estadoCivil === 'CASADO' || estadoCivil === 'UNIAO_ESTAVEL'
}

/**
 * Map-back: retorna o valor a ENVIAR (ou undefined para não enviar).
 * - marcado→marcado / desmarcado→desmarcado (sem transição) → undefined (não toca no legado).
 * - desmarcado→marcado → 'CASADO'.
 * - marcado→desmarcado → 'SOLTEIRO' (colapsa DIVORCIADO/VIUVO/UNIAO_ESTAVEL, intencional).
 */
export function mapBackEstadoCivil(inicialMarcado, marcadoAgora) {
  if (inicialMarcado === marcadoAgora) return undefined
  return marcadoAgora ? 'CASADO' : 'SOLTEIRO'
}
