export function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '')
}

/** CEP → 00000-000 (tolera entrada parcial/suja). */
export function mascaraCep(v) {
  const d = soDigitos(v).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** Telefone BR → (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo). */
export function mascaraTelefone(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
