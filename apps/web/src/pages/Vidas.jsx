import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { apiListarMembros } from '../lib/api.js'
import { disporVidas, calcularRaio, alturaNecessaria } from '../lib/vidas.js'
import { VidaBolha } from '../components/VidaBolha.jsx'

const RAIO_MAX = 46
const RAIO_MIN = 26
const GAP = 16
const POLL_MS = 4000

// duração/delay estáveis por id (não mudam a cada render)
function hashId(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff
  return h
}

export default function Vidas() {
  const { usuario } = useAuth()
  const celulaId = usuario?.celulaId
  const areaRef = useRef(null)
  const [tam, setTam] = useState({ largura: 0, alturaBase: 0 })
  const [membros, setMembros] = useState([]) // [{ id, nome, avatar }]
  const [posMap, setPosMap] = useState({}) // id -> { x, y }
  const posRef = useRef(posMap)
  posRef.current = posMap
  const tamAplicadaRef = useRef({ largura: 0, alturaBase: 0 })

  // mede largura do container e a altura base disponível abaixo do título (via viewport)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const medir = () => {
      const top = el.getBoundingClientRect().top
      setTam({ largura: el.clientWidth, alturaBase: Math.max(240, window.innerHeight - top - 16) })
    }
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    medir()
    window.addEventListener('resize', medir)
    return () => { ro.disconnect(); window.removeEventListener('resize', medir) }
  }, [])

  // carregar + polling (novos brotam, ausentes somem)
  useEffect(() => {
    if (!celulaId) return
    let vivo = true
    async function buscar() {
      try {
        const lista = await apiListarMembros(celulaId)
        if (vivo) setMembros((atual) => {
          const novos = lista.map((m) => ({ id: m.id, nome: m.nome, avatar: m.avatar }))
          const idsIguais = novos.length === atual.length && novos.every((m, i) => m.id === atual[i].id)
          return idsIguais ? atual : novos
        })
      } catch { /* mantém o estado atual */ }
    }
    buscar()
    const it = setInterval(buscar, POLL_MS)
    return () => { vivo = false; clearInterval(it) }
  }, [celulaId])

  const { largura, alturaBase } = tam
  const n = membros.length
  const raio = largura > 0 ? calcularRaio({ largura, altura: alturaBase, n: Math.max(n, 1), raioMax: RAIO_MAX, raioMin: RAIO_MIN, gap: GAP }) : RAIO_MAX
  const noPiso = raio <= RAIO_MIN + 0.5
  const altura = noPiso ? alturaNecessaria({ largura, n, raioMin: RAIO_MIN, gap: GAP, alturaMin: alturaBase }) : alturaBase

  // recalcula posições quando muda a lista ou o tamanho
  useEffect(() => {
    if (largura <= 0 || alturaBase <= 0) return
    const anterior = posRef.current
    const ap = tamAplicadaRef.current
    const mudouTam = largura !== ap.largura || alturaBase !== ap.alturaBase
    const ids = membros.map((m) => m.id)

    if (mudouTam) {
      const pos = disporVidas({ largura, altura, n, raio, gap: GAP })
      const novo = {}
      ids.forEach((id, i) => { if (pos[i]) novo[id] = pos[i] })
      setPosMap(novo)
      tamAplicadaRef.current = { largura, alturaBase }
      return
    }

    const mantidos = ids.filter((id) => anterior[id])
    const novos = ids.filter((id) => !anterior[id])
    const conjunto = new Set(ids)
    const sobra = Object.keys(anterior).some((id) => !conjunto.has(id))
    if (novos.length === 0 && !sobra) return // nada mudou

    const existentes = mantidos.map((id) => anterior[id])
    const pos = disporVidas({ largura, altura, n: mantidos.length + novos.length, raio, gap: GAP, existentes })
    const novasPos = pos.slice(mantidos.length)
    const novo = {}
    mantidos.forEach((id) => { novo[id] = anterior[id] })
    novos.forEach((id, i) => { if (novasPos[i]) novo[id] = novasPos[i] })
    setPosMap(novo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membros, largura, alturaBase])

  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold text-text">Vidas</h1>
      <div ref={areaRef} className="relative w-full" style={{ height: altura }}>
        <AnimatePresence>
          {membros.map((m) => {
            const p = posMap[m.id]
            if (!p) return null
            const h = hashId(m.id)
            return (
              <VidaBolha
                key={m.id}
                nome={m.nome}
                avatar={m.avatar}
                x={p.x}
                y={p.y}
                raio={raio}
                dur={3.5 + (h % 16) / 10}
                delay={(h % 20) / 10}
              />
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
