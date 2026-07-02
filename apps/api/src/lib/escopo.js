import { ehAdmin } from './roles.js'

/**
 * Verifica se o usuário pode gerenciar a célula.
 * Nível ADMIN+ (inclui SUPER_ADMIN): sempre; senão, só se estiver entre os líderes da célula.
 * A célula deve vir com `lideres` carregado (array com `id`).
 *
 * @param {{ id: string, nivelAcesso: string }} usuario
 * @param {{ lideres?: Array<{ id: string }> }} celula
 * @returns {boolean}
 */
export function podeGerenciarCelula(usuario, celula) {
  if (ehAdmin(usuario.nivelAcesso)) return true
  return Array.isArray(celula.lideres) && celula.lideres.some((l) => l.id === usuario.id)
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
