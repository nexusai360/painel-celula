const FP = 0.62 // fator de empacotamento aproximado para círculos

// Coloca até `n` centros por dardos com rejeição, do centro para fora.
// Dois centros não colidem se a distância >= 2*raio + gap. O centro exato fica vazio.
// `existentes` (posições já ocupadas) são preservados no início do resultado.
export function disporVidas({ largura, altura, n, raio, gap, rng = Math.random, existentes = [] }) {
  const margem = raio + 4
  const cx = largura / 2
  const cy = altura / 2
  const minDoCentro = raio + gap
  const distMin = 2 * raio + gap
  const maxAnel = Math.hypot(largura, altura) / 2
  const pontos = existentes.map((p) => ({ x: p.x, y: p.y }))

  const colide = (x, y) => pontos.some((p) => Math.hypot(p.x - x, p.y - y) < distMin)
  const dentro = (x, y) =>
    x >= margem && x <= largura - margem && y >= margem && y <= altura - margem

  let faltam = n - pontos.length
  while (faltam > 0) {
    let colocado = false
    for (let anel = minDoCentro; anel <= maxAnel && !colocado; anel += raio) {
      for (let t = 0; t < 40 && !colocado; t++) {
        const ang = rng() * Math.PI * 2
        const rr = anel + rng() * raio
        const x = cx + Math.cos(ang) * rr
        const y = cy + Math.sin(ang) * rr
        if (dentro(x, y) && !colide(x, y)) {
          pontos.push({ x, y })
          colocado = true
        }
      }
    }
    if (!colocado) break // não coube mais nesta área com este raio
    faltam--
  }
  return pontos
}

// Maior raio (<= raioMax, >= raioMin) que comporte n círculos na área.
export function calcularRaio({ largura, altura, n, raioMax, raioMin, gap }) {
  if (n <= 0) return raioMax
  const rCabe = Math.sqrt((FP * largura * altura) / (n * Math.PI)) - gap / 2
  return Math.max(raioMin, Math.min(raioMax, rCabe))
}

// Altura necessária para caberem n círculos no raio mínimo (a página rola).
export function alturaNecessaria({ largura, n, raioMin, gap, alturaMin }) {
  const areaPorCirculo = (Math.PI * (raioMin + gap / 2) ** 2) / FP
  const alturaCalc = (n * areaPorCirculo) / Math.max(largura, 1)
  return Math.max(alturaMin, Math.ceil(alturaCalc))
}
