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
export function paraWhatsappLink(e164) {
  const d = String(e164 || '').replace(/\D/g, '')
  return d ? `https://wa.me/${d}` : ''
}
