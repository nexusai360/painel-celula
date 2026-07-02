export function formatarWhatsapp(e164) {
  if (!e164) return ''
  const d = String(e164).replace(/\D/g, '')
  const nac = d.startsWith('55') ? d.slice(2) : d
  if (nac.length < 10) return e164
  const ddd = nac.slice(0,2), resto = nac.slice(2)
  const meio = resto.length === 9 ? resto.slice(0,5) : resto.slice(0,4)
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4)
  return `(${ddd}) ${meio}-${fim}`
}
/**
 * Validação de entrada (BR, sem exigir país): vazio é válido (campo opcional),
 * senão precisa de DDD + número = 10 (fixo) ou 11 (celular) dígitos.
 */
export function whatsappValido(valor) {
  const d = String(valor ?? '').replace(/\D/g, '')
  return d.length === 0 || d.length === 10 || d.length === 11
}

export function paraWhatsappLink(e164) {
  const d = String(e164 || '').replace(/\D/g, '')
  return d ? `https://wa.me/${d}` : ''
}
