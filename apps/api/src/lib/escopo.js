/**
 * Verifica se o usuário pode gerenciar a célula.
 * ADMIN: sempre; LIDER: somente se for o líder da célula.
 *
 * @param {{ id: string, papel: string }} usuario
 * @param {{ liderId: string|null }} celula
 * @returns {boolean}
 */
export function podeGerenciarCelula(usuario, celula) {
  if (usuario.papel === 'ADMIN') return true
  if (usuario.papel === 'LIDER' && celula.liderId === usuario.id) return true
  return false
}

/**
 * Converte uma string em slug URL-amigável:
 * minúsculas, sem acentos, hífens em lugar de separadores, sem hífens nas bordas.
 * Sem bibliotecas externas.
 *
 * @param {string} nome
 * @returns {string}
 */
export function slugify(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos (acentos, cedilha, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // não-alfanuméricos → hífen
    .replace(/^-+|-+$/g, '') // remove hífens nas bordas
}

/**
 * Gera um qrToken a partir do nome slugificado e de um sufixo fornecido pelo chamador.
 *
 * @param {string} nome
 * @param {string} sufixo — ex.: String(id) ou String(contador)
 * @returns {string}
 */
export function gerarQrToken(nome, sufixo) {
  return slugify(nome) + '-' + sufixo
}
