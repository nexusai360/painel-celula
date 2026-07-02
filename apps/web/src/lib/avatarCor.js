// Cor determinística por nome — para avatares sem foto ficarem sofisticados
// (grafite-tingido, baixa saturação, in-brand), em vez de cinza-mush.
export function corDoNome(nome) {
  const s = String(nome ?? '').trim()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return { bg: `hsl(${h}, 22%, 42%)`, fg: '#ffffff' }
}

/** Iniciais (até 2) a partir do nome. */
export function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
