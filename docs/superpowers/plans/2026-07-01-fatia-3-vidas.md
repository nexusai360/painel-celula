# Fatia 3 — Vidas + modo foco do QR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela "Vidas" (só líder) com as fotos dos membros ativos flutuando, espalhadas sem sobreposição e atualizando ao vivo; e o modo foco do QR (overlay escuro+blur com QR ampliado) na tela da célula.

**Architecture:** Frontend puro — nenhum backend novo (reusa `GET /celulas/:id/membros` da Fatia 2). O espalhamento é uma função pura testável (`lib/vidas.js`); a tela `Vidas.jsx` mede o container, faz polling (~4s) e posiciona as bolhas (reembaralha ao montar, incremental na sessão). O QR foco é um overlay `fixed` fora de qualquer ancestral com `backdrop-filter`.

**Tech Stack:** React 19 + React Router 6, framer-motion, lucide-react, qrcode.react, vitest (node, funções puras).

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-01-vidas-design.md`.
- **Sem backend novo.** Reusa `apiListarMembros(celulaId)` (já existe) — retorna os membros ATIVOS da célula do líder, incluindo o líder.
- **Vidas só para o líder:** rota `/app/vidas` no bloco protegido de `App.jsx`, envolta em `<SoLider>` (já existe, da Fatia 2). Item de menu "Vidas" só para `papel === 'LIDER'`, ícone `Heart`.
- **Espalhamento:** dardos com rejeição, do centro para fora; centro exato vazio; sem sobreposição (distância entre centros ≥ `2*raio + gap`); dentro dos limites (margem das bordas). `rng` injetável (default `Math.random`) — reembaralha a cada visita.
- **Tamanho adaptativo:** `calcularRaio` reduz o raio conforme a quantidade cresce, com piso `RAIO_MIN`; abaixo do piso a área cresce e a página rola.
- **Ao vivo:** polling `POLL_MS = 4000`. Novos ids "brotam" (mantendo as posições das já presentes); ids ausentes somem (fade). Erros do polling são silenciosos.
- **Animação:** cada bolha flutua (`y: [0,-7,0]` em loop, duração/delay estáveis por id); brotar = `scale/opacity 0→1`; `prefers-reduced-motion` → estático + fade simples.
- **Empty state:** tela simplesmente vazia (sem mensagem).
- **Sem clique** nas bolhas (decorativo).
- **QR foco:** overlay `fixed inset-0` com `bg-black/70 backdrop-blur`, QR ampliado (280px) + nome da célula; fecha ao clicar no fundo e no `Esc`.
- **Constantes de tamanho (Vidas):** `RAIO_MAX = 46`, `RAIO_MIN = 26`, `GAP = 16`, `POLL_MS = 4000`.
- **Tokens:** `bg-background`, `bg-black/70`, `text-text`, `text-text-muted`, `text-white`. Web tests = node-only (funções puras); componentes verificados por `build`.

---

## File Structure

- `apps/web/src/lib/vidas.js` (+ `test/vidas.test.js`) — algoritmo puro (Task 1)
- `apps/web/src/components/VidaBolha.jsx` — uma pessoa animada (Task 2)
- `apps/web/src/pages/Vidas.jsx` — orquestração; + rota em `App.jsx` + item em `TopBar.jsx` (Task 3)
- `apps/web/src/components/QrFocusOverlay.jsx` — overlay do QR (Task 4)
- `apps/web/src/pages/CelulaDetalhe.jsx` — `QrCard` abre o overlay (Task 5)

---

### Task 1: Algoritmo de espalhamento (`lib/vidas.js`)

**Files:**
- Create: `apps/web/src/lib/vidas.js`
- Test: `apps/web/test/vidas.test.js`

**Interfaces:**
- Produces:
  - `disporVidas({ largura, altura, n, raio, gap, rng?, existentes? })` → `[{x,y}]` (comprimento ≤ `n`; sem sobreposição; centro exato vazio; `existentes` preservados no início do array).
  - `calcularRaio({ largura, altura, n, raioMax, raioMin, gap })` → número em `[raioMin, raioMax]`.
  - `alturaNecessaria({ largura, n, raioMin, gap, alturaMin })` → número (altura para rolar quando no piso).

- [ ] **Step 1: Escrever o teste**

Create `apps/web/test/vidas.test.js`:

```js
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
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/web -- vidas`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `apps/web/src/lib/vidas.js`:

```js
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
```

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `npm run test --workspace apps/web -- vidas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/vidas.js apps/web/test/vidas.test.js
git commit -m "feat(web): algoritmo de espalhamento das Vidas (puro, testado)"
```

---

### Task 2: Bolha animada (`VidaBolha.jsx`)

**Files:**
- Create: `apps/web/src/components/VidaBolha.jsx`

**Interfaces:**
- Consumes: `Avatar` (`./ui/Avatar.jsx`).
- Produces: `<VidaBolha nome, avatar, x, y, raio, dur, delay />` — posicionada absolutamente (centro em x,y), flutua, brota na entrada.

- [ ] **Step 1: Implementar**

Create `apps/web/src/components/VidaBolha.jsx`:

```jsx
import { motion } from 'framer-motion'
import { Avatar } from './ui/Avatar.jsx'

function prefereMenosMovimento() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function VidaBolha({ nome, avatar, x, y, raio, dur, delay }) {
  const reduzido = prefereMenosMovimento()
  const tamanhoFoto = Math.round(raio * 1.4)
  return (
    <motion.div
      className="absolute flex flex-col items-center gap-1 text-center"
      style={{ left: x, top: y, width: raio * 2, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={reduzido ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, y: [0, -7, 0] }}
      exit={{ scale: 0, opacity: 0 }}
      transition={
        reduzido
          ? { duration: 0.3 }
          : {
              scale: { duration: 0.4 },
              opacity: { duration: 0.4 },
              y: { duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }
            }
      }
    >
      <Avatar src={avatar} nome={nome} size={tamanhoFoto} />
      <span className="truncate text-xs text-text-muted" style={{ maxWidth: raio * 2 }}>
        {nome}
      </span>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/VidaBolha.jsx
git commit -m "feat(web): VidaBolha (foto flutuante com brotar/reduced-motion)"
```

---

### Task 3: Tela Vidas + rota + item de menu

**Files:**
- Create: `apps/web/src/pages/Vidas.jsx`
- Modify: `apps/web/src/App.jsx` (rota `/app/vidas` com `SoLider`)
- Modify: `apps/web/src/components/TopBar.jsx` (item "Vidas" para LIDER)

**Interfaces:**
- Consumes: `disporVidas`, `calcularRaio`, `alturaNecessaria` (Task 1); `VidaBolha` (Task 2); `apiListarMembros` (`../lib/api.js`); `useAuth`; `SoLider` (já em `App.jsx`).

- [ ] **Step 1: Implementar a página**

Create `apps/web/src/pages/Vidas.jsx`:

```jsx
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
        if (vivo) setMembros(lista.map((m) => ({ id: m.id, nome: m.nome, avatar: m.avatar })))
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
```

- [ ] **Step 2: Registrar a rota (só líder)**

Modify `apps/web/src/App.jsx`:
- import: `import Vidas from './pages/Vidas.jsx'`
- no bloco protegido (usa o `SoLider` já existente da Fatia 2), adicionar:

```jsx
<Route path="/app/vidas" element={<SoLider><Vidas /></SoLider>} />
```

- [ ] **Step 3: Adicionar o item de menu (LIDER)**

Modify `apps/web/src/components/TopBar.jsx`:
- adicionar `Heart` ao import de `lucide-react`.
- dentro de `linksPorPapel`, no bloco `if (papel === 'LIDER')`, adicionar (após "Testemunhos"):

```js
    links.push({ to: '/app/vidas', label: 'Vidas', icon: Heart })
```

- [ ] **Step 4: Verificar build e a suíte web**

Run: `npm run build --workspace apps/web && npm run test --workspace apps/web`
Expected: build sem erros; testes web PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/Vidas.jsx apps/web/src/App.jsx apps/web/src/components/TopBar.jsx
git commit -m "feat(web): tela Vidas (fotos flutuantes, ao vivo) + rota e menu do líder"
```

---

### Task 4: Overlay de foco do QR (`QrFocusOverlay.jsx`)

**Files:**
- Create: `apps/web/src/components/QrFocusOverlay.jsx`

**Interfaces:**
- Produces: `<QrFocusOverlay open, valorQr, nomeCelula, onClose />` — overlay `fixed` escuro+blur com QR ampliado; fecha em clique no fundo e `Esc`.

- [ ] **Step 1: Implementar**

Create `apps/web/src/components/QrFocusOverlay.jsx`:

```jsx
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'

export function QrFocusOverlay({ open, valorQr, nomeCelula, onClose }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} role="dialog" aria-modal="true"
        >
          <motion.div
            className="rounded-3xl bg-white p-6 shadow-2xl"
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeCanvas value={valorQr} size={280} fgColor="#1A1A1A" bgColor="#FFFFFF" />
          </motion.div>
          {nomeCelula && <p className="text-lg font-semibold text-white">{nomeCelula}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/QrFocusOverlay.jsx
git commit -m "feat(web): QrFocusOverlay (QR ampliado com fundo escuro e blur)"
```

---

### Task 5: `QrCard` abre o foco do QR

**Files:**
- Modify: `apps/web/src/pages/CelulaDetalhe.jsx` (componente `QrCard`)

**Interfaces:**
- Consumes: `QrFocusOverlay` (Task 4).

**Contexto (código atual do `QrCard` em `CelulaDetalhe.jsx`):**
```jsx
function QrCard({ celula }) {
  const url = `${window.location.origin}/c/${celula.qrToken}`
  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2 self-start text-text-muted">
        <QrCode className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">QR Code da célula</h2>
      </div>
      <div className="rounded-2xl bg-white p-4">
        <QRCodeCanvas value={url} size={180} fgColor="#1A1A1A" bgColor="#FFFFFF" />
      </div>
      <p className="break-all text-xs text-text-muted">{url}</p>
      <Button variant="secondary" className="w-auto px-5" onClick={() => navigator.clipboard?.writeText(url)}>
        Copiar link
      </Button>
    </Card>
  )
}
```
`useState` já está importado no arquivo. Adicionar o import de `QrFocusOverlay`.

- [ ] **Step 1: Adicionar o import**

Modify `apps/web/src/pages/CelulaDetalhe.jsx` — junto aos imports de componentes:

```js
import { QrFocusOverlay } from '../components/QrFocusOverlay.jsx'
```

- [ ] **Step 2: Tornar o QR clicável e renderizar o overlay**

Modify `apps/web/src/pages/CelulaDetalhe.jsx` — substituir a função `QrCard` inteira por:

```jsx
function QrCard({ celula }) {
  const url = `${window.location.origin}/c/${celula.qrToken}`
  const [foco, setFoco] = useState(false)
  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2 self-start text-text-muted">
        <QrCode className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">QR Code da célula</h2>
      </div>
      <button
        type="button"
        onClick={() => setFoco(true)}
        aria-label="Ampliar QR Code para apresentação"
        className="rounded-2xl bg-white p-4 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
      >
        <QRCodeCanvas value={url} size={180} fgColor="#1A1A1A" bgColor="#FFFFFF" />
      </button>
      <p className="break-all text-xs text-text-muted">{url}</p>
      <Button variant="secondary" className="w-auto px-5" onClick={() => navigator.clipboard?.writeText(url)}>
        Copiar link
      </Button>
      <QrFocusOverlay open={foco} valorQr={url} nomeCelula={celula.nome} onClose={() => setFoco(false)} />
    </Card>
  )
}
```

- [ ] **Step 3: Verificar build e a suíte web**

Run: `npm run build --workspace apps/web && npm run test --workspace apps/web`
Expected: build sem erros; testes web PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CelulaDetalhe.jsx
git commit -m "feat(web): QR clicável abre o modo foco (apresentação)"
```

---

## Verificação final (após todas as tasks)

- [ ] `npm run test --workspace apps/web` — verde (14 + vidas).
- [ ] `npm run build --workspace apps/web` — limpo.
- [ ] Smoke (localhost) como líder: menu tem "Vidas"; a tela mostra as fotos flutuando espalhadas (sem sobrepor, centro vazio); célula sem membros = tela vazia. Abrir um segundo navegador e cadastrar alguém na célula (via `/c/:qrToken`) → o nome brota na tela de Vidas em ~4s. Na aba Informações de "Minha Célula", clicar no QR abre o overlay escuro+blur com o QR ampliado; Esc/clique fora fecha. Testar `prefers-reduced-motion` (sem flutuar).

## Notas de desvio do spec

- **Teste de componente:** o projeto não tem infra de teste de componente React (vitest node-only). A lógica testável (espalhamento, raio, altura) está em `lib/vidas.js` com testes; `Vidas.jsx`/`VidaBolha.jsx`/`QrFocusOverlay.jsx` são verificados por `build` + smoke. Consistente com as Fatias 1 e 2.
- **Rolar quando há muitos membros:** implementado via altura dinâmica da área (`alturaNecessaria` quando no piso `RAIO_MIN`), fazendo a página rolar naturalmente. No caso extremo em que nem no piso cabe tudo na largura, `disporVidas` posiciona o que couber (as bolhas sem vaga não renderizam) — aceitável para o volume real de uma célula.
