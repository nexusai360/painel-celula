import { describe, it, expect } from 'vitest'
import { disporVidas, calcularRaio, alturaNecessaria } from '../src/lib/vidas.js'

// rng determinístico (LCG) para testes reprodutíveis
function rngSemeado(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

describe('disporVidas', () => {
  const base = { largura: 800, altura: 600, raio: 30, gap: 16 }

  it('coloca n pontos sem sobreposição e dentro dos limites', () => {
    const n = 8
    const pts = disporVidas({ ...base, n, rng: rngSemeado(1) })
    expect(pts.length).toBe(n)
    const distMin = 2 * base.raio + base.gap
    const margem = base.raio + 4
    for (let i = 0; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThanOrEqual(margem - 1e-6)
      expect(pts[i].x).toBeLessThanOrEqual(base.largura - margem + 1e-6)
      expect(pts[i].y).toBeGreaterThanOrEqual(margem - 1e-6)
      expect(pts[i].y).toBeLessThanOrEqual(base.altura - margem + 1e-6)
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        expect(d).toBeGreaterThanOrEqual(distMin - 1e-6)
      }
    }
  })

  it('deixa o centro exato vazio', () => {
    const pts = disporVidas({ ...base, n: 8, rng: rngSemeado(2) })
    const cx = base.largura / 2, cy = base.altura / 2
    const minDoCentro = base.raio + base.gap
    for (const p of pts) {
      expect(Math.hypot(p.x - cx, p.y - cy)).toBeGreaterThanOrEqual(minDoCentro - 1e-6)
    }
  })

  it('preserva as posições existentes (incremental)', () => {
    const existentes = [{ x: 120, y: 120 }, { x: 300, y: 420 }]
    const pts = disporVidas({ ...base, n: 5, existentes, rng: rngSemeado(3) })
    expect(pts.slice(0, 2)).toEqual(existentes)
    expect(pts.length).toBe(5)
  })
})

describe('calcularRaio', () => {
  const params = { largura: 400, altura: 700, raioMax: 46, raioMin: 26, gap: 16 }
  it('reduz o raio conforme n cresce e respeita piso e teto', () => {
    const poucos = calcularRaio({ ...params, n: 3 })
    const muitos = calcularRaio({ ...params, n: 60 })
    expect(poucos).toBeGreaterThan(muitos)
    expect(poucos).toBeLessThanOrEqual(46)
    expect(muitos).toBeGreaterThanOrEqual(26)
  })
})

describe('alturaNecessaria', () => {
  it('cresce com n e nunca fica abaixo de alturaMin', () => {
    const a = alturaNecessaria({ largura: 400, n: 5, raioMin: 26, gap: 16, alturaMin: 600 })
    const b = alturaNecessaria({ largura: 400, n: 80, raioMin: 26, gap: 16, alturaMin: 600 })
    expect(a).toBe(600)
    expect(b).toBeGreaterThan(600)
  })
})
