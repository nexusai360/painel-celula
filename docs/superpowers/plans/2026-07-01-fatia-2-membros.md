# Fatia 2 — Membros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gestão de membros de uma célula — lista para Admin/Líder, com o Admin editando (modal) e inativando/reativando membros; abas Informações|Membros na tela da célula; cards de aviso de exclusão.

**Architecture:** Backend Fastify+Prisma: nova rota `GET /celulas/:id/membros` (escopada, líder só ativos) e `PUT /usuarios/:id` (admin edita nome/email/whatsapp/ativo com proteções). Frontend React: `CelulaDetalhe` ganha abas via query param, a aba Membros renderiza um `MembrosPanel` isolado (lista + modal de edição + confirmação), e o `window.confirm` de exclusão de célula vira `ConfirmDialog`.

**Tech Stack:** Node/Fastify 5, Prisma 6 + PostgreSQL, Zod 4, React 19 + React Router 6, framer-motion, lucide-react, react-hook-form, vitest.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-01-membros-design.md`.
- **`User.ativo` já existe; login já bloqueia inativo** (`apps/api/src/routes/auth.js`) — não mexer nisso.
- **`GET /celulas/:id/membros`:** escopo via `podeGerenciarCelula` (admin qualquer; líder só a sua → 403; inexistente → 404). Líder recebe **só `ativo:true`**; admin recebe **todos**. `select` explícito com `avatar` e `whatsapp` (o modal de edição usa whatsapp) — **não** usar `publicoLeve`.
- **`PUT /usuarios/:id`:** `requireRole('ADMIN')`. Campos `{ nome?, email?, whatsapp?, ativo? }`. E-mail duplicado (contra **outro** usuário, `id != alvo`) → `409`. WhatsApp via `normalizarWhatsapp`; inválido → `400`. `ativo:false` em si mesmo → `400`; em quem é **líder atual** de alguma célula → `409`. Retorna via `publico()`.
- **Soft-delete:** "Excluir" membro = `ativo:false`; não há delete real. "Ativar" = `ativo:true` (ação direta, sem confirmação).
- **Ordenação da lista:** ativos em cima, inativos embaixo (via `agruparMembros`).
- **Idioma:** UI e erros em português com acentuação correta.
- **Tokens (Tailwind):** `bg-card`, `bg-surface`, `bg-background`, `text-text`, `text-text-muted`, `text-danger`, `text-success`, `bg-danger/15`, `bg-success/15`, `border-border`, `bg-brand`, `text-on-brand`.
- **Comandos:** API `npm run test --workspace apps/api`; web `npm run test --workspace apps/web`; shared `npm run test --workspace packages/shared`; build web `npm run build --workspace apps/web`.
- **Teste de componente React não existe** (vitest web = node, `test/**/*.test.js`, funções puras). Componentes verificados por build.
- **Padrões:** `import { prisma } from '../prisma.js'`; `requireRole` de `../lib/roles.js` popula `request.usuario = { id, papel, celulaId }`; `podeGerenciarCelula` de `../lib/escopo.js`; `publico` de `../lib/usuarios.js`; `normalizarWhatsapp` de `@icelula/shared`. Testes backend: `buildApp()`, `app.jwt.sign({ id, papel, celulaId })`, `app.inject`, `hashSenha` de `../lib/password.js`.

---

## File Structure

**Backend**
- `packages/shared/src/usuario.schemas.js` (+ test, + reexport em `index.js`) — Task 1
- `apps/api/src/routes/celulas.js` — nova rota `GET /:id/membros`; test `celulas.test.js` — Task 2
- `apps/api/src/routes/usuarios.js` — nova rota `PUT /:id`; test `usuarios.test.js` — Task 3

**Frontend**
- `apps/web/src/lib/api.js` — `apiListarMembros`, `apiAtualizarMembro`; `apps/web/src/lib/membros.js` (+ test) — Task 4
- `apps/web/src/components/MembroCard.jsx`, `apps/web/src/components/MembroEditModal.jsx` — Task 5
- `apps/web/src/components/MembrosPanel.jsx` — Task 6
- `apps/web/src/pages/CelulaDetalhe.jsx` — abas — Task 7
- `apps/web/src/components/TopBar.jsx` — item Membros — Task 8
- `apps/web/src/pages/Celulas.jsx` — ConfirmDialog — Task 9

---

### Task 1: Schema zod de edição de membro (admin)

**Files:**
- Create: `packages/shared/src/usuario.schemas.js`
- Modify: `packages/shared/src/index.js`
- Test: `packages/shared/src/usuario.schemas.test.js`

**Interfaces:**
- Produces: `usuarioAdminUpdateSchema` — `{ nome?: string 1..120 (trim), email?: string email (trim), whatsapp?: string, ativo?: boolean }`, exportado de `@icelula/shared`.

- [ ] **Step 1: Escrever o teste**

Create `packages/shared/src/usuario.schemas.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { usuarioAdminUpdateSchema } from './usuario.schemas.js'

describe('usuarioAdminUpdateSchema', () => {
  it('aceita campos parciais válidos', () => {
    expect(usuarioAdminUpdateSchema.safeParse({}).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ nome: 'Ana' }).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ ativo: false }).success).toBe(true)
    expect(usuarioAdminUpdateSchema.safeParse({ email: 'a@b.com', whatsapp: '62999999999' }).success).toBe(true)
  })
  it('rejeita e-mail inválido e nome vazio', () => {
    expect(usuarioAdminUpdateSchema.safeParse({ email: 'nao-email' }).success).toBe(false)
    expect(usuarioAdminUpdateSchema.safeParse({ nome: '   ' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — `Cannot find module './usuario.schemas.js'`.

- [ ] **Step 3: Implementar o schema**

Create `packages/shared/src/usuario.schemas.js`:

```js
import { z } from 'zod'

export const usuarioAdminUpdateSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(120, 'Máximo de 120 caracteres').optional(),
  email: z.string().trim().email('E-mail inválido').optional(),
  whatsapp: z.string().optional(),
  ativo: z.boolean().optional()
})
```

- [ ] **Step 4: Reexportar no index**

Modify `packages/shared/src/index.js` — adicionar a linha:

```js
export * from './usuario.schemas.js'
```

- [ ] **Step 5: Rodar o teste (deve passar)**

Run: `npm run test --workspace packages/shared`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/usuario.schemas.js packages/shared/src/usuario.schemas.test.js packages/shared/src/index.js
git commit -m "feat(shared): schema de edição de membro pelo admin"
```

---

### Task 2: `GET /celulas/:id/membros` (backend)

**Files:**
- Modify: `apps/api/src/routes/celulas.js` (nova rota após `GET /celulas/:id`, linha ~145)
- Test: `apps/api/src/routes/celulas.test.js`

**Interfaces:**
- Consumes: `podeGerenciarCelula` (já importado no arquivo), `prisma`, `requireRole`.
- Produces: `GET /celulas/:id/membros` → `{ membros: [{ id, nome, email, avatar, papel, ativo, whatsapp }] }`, `nome asc`. Líder recebe só ativos; admin recebe todos.

- [ ] **Step 1: Escrever o teste**

Add ao final de `apps/api/src/routes/celulas.test.js` (dentro do arquivo, novo `describe`; usa os helpers já existentes `buildApp`, `prisma`, `hashSenha`, e o padrão de sufixo). Inserir antes do último fechamento do arquivo:

```js
describe('GET /celulas/:id/membros', () => {
  let cId, liderTk, adminTk, outroLiderTk, membroAtivoId, membroInativoId

  beforeAll(async () => {
    const suf = `mem-${Date.now()}`
    const cel = await prisma.celula.create({
      data: { nome: `Cel ${suf}`, qrToken: `qr-${suf}`, diaSemana: 2, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-09-01T19:30:00') }
    })
    cId = cel.id
    const lider = await prisma.user.create({ data: { nome: 'Lider Mem', email: `lidermem-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId: cId } })
    await prisma.celula.update({ where: { id: cId }, data: { liderId: lider.id } })
    const ativo = await prisma.user.create({ data: { nome: 'Ativo Zé', email: `ativo-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO', celulaId: cId, ativo: true } })
    const inativo = await prisma.user.create({ data: { nome: 'Inativo Bia', email: `inativo-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO', celulaId: cId, ativo: false } })
    membroAtivoId = ativo.id; membroInativoId = inativo.id
    const admin = await prisma.user.create({ data: { nome: 'Adm Mem', email: `admmem-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'ADMIN' } })
    const outroLider = await prisma.user.create({ data: { nome: 'Outro L', email: `outrol-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'LIDER' } })
    liderTk = app.jwt.sign({ id: lider.id, papel: 'LIDER', celulaId: cId })
    adminTk = app.jwt.sign({ id: admin.id, papel: 'ADMIN', celulaId: null })
    outroLiderTk = app.jwt.sign({ id: outroLider.id, papel: 'LIDER', celulaId: null })
  })

  it('líder vê só os membros ativos da própria célula', async () => {
    const res = await app.inject({ method: 'GET', url: `/celulas/${cId}/membros`, headers: { authorization: `Bearer ${liderTk}` } })
    expect(res.statusCode).toBe(200)
    const ids = res.json().membros.map((m) => m.id)
    expect(ids).toContain(membroAtivoId)
    expect(ids).not.toContain(membroInativoId)
  })
  it('admin vê todos, inclusive inativos, com o campo ativo', async () => {
    const res = await app.inject({ method: 'GET', url: `/celulas/${cId}/membros`, headers: { authorization: `Bearer ${adminTk}` } })
    expect(res.statusCode).toBe(200)
    const inativo = res.json().membros.find((m) => m.id === membroInativoId)
    expect(inativo).toBeDefined()
    expect(inativo.ativo).toBe(false)
  })
  it('líder de outra célula → 403', async () => {
    const res = await app.inject({ method: 'GET', url: `/celulas/${cId}/membros`, headers: { authorization: `Bearer ${outroLiderTk}` } })
    expect(res.statusCode).toBe(403)
  })
  it('célula inexistente → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/celulas/nao-existe/membros', headers: { authorization: `Bearer ${adminTk}` } })
    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/api -- celulas`
Expected: FAIL — a rota `/membros` responde 404 de rota inexistente (não o 404 de célula), então as asserções de 200/403 falham.

- [ ] **Step 3: Implementar a rota**

Modify `apps/api/src/routes/celulas.js` — inserir logo após o fechamento do handler `GET /celulas/:id` (após a linha `})` da rota em ~145):

```js
  // ── GET /celulas/:id/membros (escopo) ───────────────────────────────────────
  app.get('/celulas/:id/membros', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const { id } = request.params
    const celula = await prisma.celula.findUnique({ where: { id } })
    if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
    if (!podeGerenciarCelula(request.usuario, celula)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    const soAtivos = request.usuario.papel !== 'ADMIN'
    const membros = await prisma.user.findMany({
      where: { celulaId: id, ...(soAtivos ? { ativo: true } : {}) },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, avatar: true, papel: true, ativo: true, whatsapp: true }
    })
    return reply.send({ membros })
  })
```

- [ ] **Step 4: Rodar o teste (deve passar) e a suíte completa**

Run: `npm run test --workspace apps/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/celulas.js apps/api/src/routes/celulas.test.js
git commit -m "feat(api): GET /celulas/:id/membros (escopo, líder só ativos)"
```

---

### Task 3: `PUT /usuarios/:id` (backend)

**Files:**
- Modify: `apps/api/src/routes/usuarios.js`
- Test: `apps/api/src/routes/usuarios.test.js`

**Interfaces:**
- Consumes: `usuarioAdminUpdateSchema`, `normalizarWhatsapp` (`@icelula/shared`); `publico` (`../lib/usuarios.js`); `prisma`, `requireRole`.
- Produces: `PUT /usuarios/:id` → `{ usuario }` (via `publico`). Erros: 400 (validação / whatsapp / auto-inativação), 404 (alvo inexistente), 409 (e-mail duplicado / líder atual).

- [ ] **Step 1: Escrever o teste**

O arquivo `apps/api/src/routes/usuarios.test.js` **já existe** e no escopo do módulo tem: `app`, `emailAdmin`, `emailMembro`, `adminToken`, `membroToken` (admin e membro globais criados no `beforeAll` do arquivo). Reusar esses. Adicionar este `describe` ao final do arquivo (antes de nada que feche o módulo; o `afterAll` do arquivo roda depois dos `afterAll` aninhados, então o cleanup abaixo é seguro):

```js
describe('PUT /usuarios/:id', () => {
  const suf = `put-${Date.now()}`
  const qrCel = `qrput-${suf}`
  const emailsCriados = [`alvo-${suf}@t.com`, `liderput-${suf}@t.com`, `ocupado-${suf}@t.com`]
  let alvoId, adminId, liderId, emailOcupado

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: emailAdmin } })
    adminId = admin.id
    const alvo = await prisma.user.create({ data: { nome: 'Alvo', email: `alvo-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' } })
    alvoId = alvo.id
    const cel = await prisma.celula.create({ data: { nome: `Cel ${suf}`, qrToken: qrCel, diaSemana: 1, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-09-01T19:30:00') } })
    const lider = await prisma.user.create({ data: { nome: 'Lider Put', email: `liderput-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId: cel.id } })
    liderId = lider.id
    await prisma.celula.update({ where: { id: cel.id }, data: { liderId: lider.id } })
    const ocupado = await prisma.user.create({ data: { nome: 'Ocupado', email: `ocupado-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' } })
    emailOcupado = ocupado.email
  })

  afterAll(async () => {
    await prisma.celula.deleteMany({ where: { qrToken: qrCel } })
    await prisma.user.deleteMany({ where: { email: { in: emailsCriados } } })
  })

  it('admin edita nome e whatsapp', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { nome: 'Alvo Novo', whatsapp: '62999998888' } })
    expect(res.statusCode).toBe(200)
    expect(res.json().usuario.nome).toBe('Alvo Novo')
    expect(res.json().usuario.whatsapp).toMatch(/^\+55/)
  })
  it('e-mail já em uso → 409', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { email: emailOcupado } })
    expect(res.statusCode).toBe(409)
  })
  it('inativa e reativa', async () => {
    const off = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: false } })
    expect(off.statusCode).toBe(200)
    expect(off.json().usuario.ativo).toBe(false)
    const on = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: true } })
    expect(on.json().usuario.ativo).toBe(true)
  })
  it('admin não pode inativar a si mesmo → 400', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${adminId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: false } })
    expect(res.statusCode).toBe(400)
  })
  it('não pode inativar o líder atual de uma célula → 409', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${liderId}`, headers: { authorization: `Bearer ${adminToken}` }, payload: { ativo: false } })
    expect(res.statusCode).toBe(409)
  })
  it('não-admin → 403', async () => {
    const res = await app.inject({ method: 'PUT', url: `/usuarios/${alvoId}`, headers: { authorization: `Bearer ${membroToken}` }, payload: { nome: 'X' } })
    expect(res.statusCode).toBe(403)
  })
  it('alvo inexistente → 404', async () => {
    const res = await app.inject({ method: 'PUT', url: '/usuarios/nao-existe', headers: { authorization: `Bearer ${adminToken}` }, payload: { nome: 'X' } })
    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/api -- usuarios`
Expected: FAIL — rota `PUT /usuarios/:id` inexistente (405/404), asserções falham.

- [ ] **Step 3: Implementar a rota**

Modify `apps/api/src/routes/usuarios.js` — trocar os imports do topo e adicionar o handler dentro de `usuarioRoutes`:

```js
import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'
import { usuarioAdminUpdateSchema, normalizarWhatsapp } from '@icelula/shared'
import { publico } from '../lib/usuarios.js'
```

Dentro de `export async function usuarioRoutes(app) { ... }`, após o handler `GET /usuarios`, adicionar:

```js
  // Edita um membro (ADMIN): nome, email, whatsapp, ativo. Soft-delete via ativo:false.
  app.put('/usuarios/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params
    const parsed = usuarioAdminUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })

    const alvo = await prisma.user.findUnique({ where: { id } })
    if (!alvo) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    const data = {}
    if (parsed.data.nome !== undefined) data.nome = parsed.data.nome
    if (parsed.data.email !== undefined && parsed.data.email !== alvo.email) {
      const colide = await prisma.user.findFirst({ where: { email: parsed.data.email, id: { not: id } } })
      if (colide) return reply.code(409).send({ erro: 'E-mail já em uso' })
      data.email = parsed.data.email
    }
    if (parsed.data.whatsapp !== undefined) {
      if (parsed.data.whatsapp === null || parsed.data.whatsapp === '') data.whatsapp = null
      else {
        const w = normalizarWhatsapp(parsed.data.whatsapp)
        if (!w) return reply.code(400).send({ erro: 'WhatsApp inválido' })
        data.whatsapp = w
      }
    }
    if (parsed.data.ativo !== undefined) {
      if (parsed.data.ativo === false) {
        if (id === request.usuario.id) return reply.code(400).send({ erro: 'Você não pode inativar a si mesmo' })
        const lideranca = await prisma.celula.findFirst({ where: { liderId: id } })
        if (lideranca) return reply.code(409).send({ erro: 'Defina outro líder antes de inativar este membro' })
      }
      data.ativo = parsed.data.ativo
    }

    const user = await prisma.user.update({ where: { id }, data })
    return reply.send({ usuario: publico(user) })
  })
```

- [ ] **Step 4: Rodar o teste (deve passar) e a suíte completa**

Run: `npm run test --workspace apps/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/usuarios.js apps/api/src/routes/usuarios.test.js
git commit -m "feat(api): PUT /usuarios/:id (admin edita/inativa membro, com proteções)"
```

---

### Task 4: API client + `agruparMembros` (frontend base)

**Files:**
- Modify: `apps/web/src/lib/api.js`
- Create: `apps/web/src/lib/membros.js`
- Test: `apps/web/test/membros.test.js`

**Interfaces:**
- Produces: `apiListarMembros(celulaId)` → array de membros; `apiAtualizarMembro(userId, dados)` → usuário; `agruparMembros(lista)` → `{ ativos, inativos }` (ativos = `m.ativo` truthy).

- [ ] **Step 1: Escrever o teste de `agruparMembros`**

Create `apps/web/test/membros.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { agruparMembros } from '../src/lib/membros.js'

const lista = [
  { id: 'a', nome: 'Ana', ativo: true },
  { id: 'b', nome: 'Bia', ativo: false },
  { id: 'c', nome: 'Caio', ativo: true }
]

describe('agruparMembros', () => {
  it('separa ativos e inativos', () => {
    const { ativos, inativos } = agruparMembros(lista)
    expect(ativos.map((m) => m.id)).toEqual(['a', 'c'])
    expect(inativos.map((m) => m.id)).toEqual(['b'])
  })
  it('renderização coloca ativos antes dos inativos', () => {
    const { ativos, inativos } = agruparMembros(lista)
    expect([...ativos, ...inativos].map((m) => m.id)).toEqual(['a', 'c', 'b'])
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/web -- membros`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `membros.js`**

Create `apps/web/src/lib/membros.js`:

```js
export function agruparMembros(lista) {
  const ativos = lista.filter((m) => m.ativo)
  const inativos = lista.filter((m) => !m.ativo)
  return { ativos, inativos }
}
```

- [ ] **Step 4: Adicionar as funções de API**

Modify `apps/web/src/lib/api.js` — adicionar ao final:

```js
// ---- Membros ----
export async function apiListarMembros(celulaId) {
  const { data } = await api.get(`/celulas/${celulaId}/membros`)
  return data.membros
}
export async function apiAtualizarMembro(userId, dados) {
  const { data } = await api.put(`/usuarios/${userId}`, dados)
  return data.usuario
}
```

- [ ] **Step 5: Rodar o teste (deve passar)**

Run: `npm run test --workspace apps/web -- membros`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.js apps/web/src/lib/membros.js apps/web/test/membros.test.js
git commit -m "feat(web): api de membros + agruparMembros"
```

---

### Task 5: `MembroCard` + `MembroEditModal` (componentes)

**Files:**
- Create: `apps/web/src/components/MembroCard.jsx`
- Create: `apps/web/src/components/MembroEditModal.jsx`

**Interfaces:**
- Consumes: `Avatar` (`./ui/Avatar.jsx`), `Button` (`./ui/Button.jsx`), `Input` (`./ui/Input.jsx`); `usuarioAdminUpdateSchema` (`@icelula/shared`); `apiAtualizarMembro` (Task 4).
- Produces: `<MembroCard membro, ehLider, podeGerenciar, onEditar, onInativar, onAtivar />`; `<MembroEditModal membro, open, onSalvo, onCancelar />` (chama `apiAtualizarMembro` e retorna o membro atualizado via `onSalvo(usuario)`).

- [ ] **Step 1: Implementar o `MembroCard`**

Create `apps/web/src/components/MembroCard.jsx`:

```jsx
import { Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Avatar } from './ui/Avatar.jsx'

export function MembroCard({ membro, ehLider, podeGerenciar, onEditar, onInativar, onAtivar }) {
  const inativo = !membro.ativo
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 ${inativo ? 'opacity-60' : ''}`}>
      <Avatar src={membro.avatar} nome={membro.nome} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-text">{membro.nome}</p>
          {ehLider && (
            <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">Líder</span>
          )}
          {inativo && (
            <span className="shrink-0 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">Inativo</span>
          )}
        </div>
        <p className="truncate text-sm text-text-muted">{membro.email}</p>
      </div>

      {podeGerenciar && (
        <div className="flex shrink-0 items-center gap-1">
          {inativo ? (
            <button
              type="button"
              onClick={() => onAtivar(membro)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-success hover:bg-surface"
            >
              <RotateCcw className="h-4 w-4" /> Ativar
            </button>
          ) : (
            <>
              <button type="button" aria-label="Editar" onClick={() => onEditar(membro)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Excluir" onClick={() => onInativar(membro)}
                className="rounded-lg p-1.5 text-danger hover:bg-surface">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implementar o `MembroEditModal`**

Create `apps/web/src/components/MembroEditModal.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usuarioAdminUpdateSchema } from '@icelula/shared'
import { apiAtualizarMembro } from '../lib/api.js'
import { Input } from './ui/Input.jsx'
import { Button } from './ui/Button.jsx'

export function MembroEditModal({ membro, open, onSalvo, onCancelar }) {
  const [erro, setErro] = useState(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(usuarioAdminUpdateSchema) })

  useEffect(() => {
    if (membro) reset({ nome: membro.nome || '', email: membro.email || '', whatsapp: membro.whatsapp || '' })
  }, [membro, reset])

  async function salvar(dados) {
    setErro(null)
    try {
      const atualizado = await apiAtualizarMembro(membro.id, {
        nome: dados.nome, email: dados.email, whatsapp: dados.whatsapp || null
      })
      onSalvo(atualizado)
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível salvar. Tente novamente.')
    }
  }

  return (
    <AnimatePresence>
      {open && membro && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancelar} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <motion.div role="dialog" aria-modal="true"
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <h2 className="mb-4 text-lg font-semibold text-text">Editar membro</h2>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit(salvar)}>
                <Input id="nome" label="Nome" {...register('nome')} error={errors.nome?.message} />
                <Input id="whatsapp" label="WhatsApp" placeholder="(62) 99999-9999" {...register('whatsapp')} error={errors.whatsapp?.message} />
                <Input id="email" label="E-mail" {...register('email')} error={errors.email?.message} />
                {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
                <div className="mt-3 flex gap-3">
                  <Button variant="secondary" type="button" onClick={onCancelar}>Cancelar</Button>
                  <Button variant="primary" type="submit" loading={isSubmitting}>Salvar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/MembroCard.jsx apps/web/src/components/MembroEditModal.jsx
git commit -m "feat(web): MembroCard e MembroEditModal"
```

---

### Task 6: `MembrosPanel` (lista + edição + inativar/reativar)

**Files:**
- Create: `apps/web/src/components/MembrosPanel.jsx`

**Interfaces:**
- Consumes: `apiListarMembros`, `apiAtualizarMembro` (Task 4); `agruparMembros` (Task 4); `MembroCard`, `MembroEditModal` (Task 5); `ConfirmDialog` (`./ui/ConfirmDialog.jsx`).
- Produces: `<MembrosPanel celulaId, liderId, podeGerenciar />` — carrega e renderiza a lista; edição via modal; inativar via ConfirmDialog; ativar direto.

- [ ] **Step 1: Implementar o `MembrosPanel`**

Create `apps/web/src/components/MembrosPanel.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { apiListarMembros, apiAtualizarMembro } from '../lib/api.js'
import { agruparMembros } from '../lib/membros.js'
import { MembroCard } from './MembroCard.jsx'
import { MembroEditModal } from './MembroEditModal.jsx'
import { ConfirmDialog } from './ui/ConfirmDialog.jsx'

export function MembrosPanel({ celulaId, liderId, podeGerenciar }) {
  const [membros, setMembros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [aEditar, setAEditar] = useState(null)
  const [aInativar, setAInativar] = useState(null)
  const [inativando, setInativando] = useState(false)

  async function carregar() {
    try {
      setMembros(await apiListarMembros(celulaId))
      setErro(null)
    } catch {
      setErro('Não foi possível carregar os membros.')
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() /* eslint-disable-next-line */ }, [celulaId])

  function aplicar(usuario) {
    setMembros((lista) => lista.map((m) => (m.id === usuario.id ? { ...m, ...usuario } : m)))
  }

  async function confirmarInativar() {
    setInativando(true)
    try {
      const upd = await apiAtualizarMembro(aInativar.id, { ativo: false })
      aplicar(upd); setAInativar(null); setErro(null)
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível inativar. Tente novamente.')
      setAInativar(null)
    } finally { setInativando(false) }
  }

  async function ativar(membro) {
    try {
      const upd = await apiAtualizarMembro(membro.id, { ativo: true })
      aplicar(upd); setErro(null)
    } catch {
      setErro('Não foi possível ativar. Tente novamente.')
    }
  }

  if (carregando) return <p className="text-sm text-text-muted">Carregando…</p>

  const { ativos, inativos } = agruparMembros(membros)
  const ordenada = [...ativos, ...inativos]

  return (
    <div>
      {erro && <p role="alert" className="mb-3 text-sm text-danger">{erro}</p>}
      {ordenada.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-text-muted">Nenhum membro nesta célula.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenada.map((m) => (
            <MembroCard
              key={m.id} membro={m}
              ehLider={m.id === liderId}
              podeGerenciar={podeGerenciar}
              onEditar={setAEditar}
              onInativar={setAInativar}
              onAtivar={ativar}
            />
          ))}
        </div>
      )}

      <MembroEditModal
        membro={aEditar} open={!!aEditar}
        onSalvo={(u) => { aplicar(u); setAEditar(null) }}
        onCancelar={() => setAEditar(null)}
      />

      <ConfirmDialog
        open={!!aInativar}
        titulo="Inativar membro"
        mensagem={aInativar ? `Inativar ${aInativar.nome}? A pessoa deixa de acessar e some das listas; você pode reativá-la depois.` : ''}
        confirmarLabel="Inativar"
        carregando={inativando}
        onConfirmar={confirmarInativar}
        onCancelar={() => setAInativar(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/MembrosPanel.jsx
git commit -m "feat(web): MembrosPanel (lista, edição, inativar/reativar)"
```

---

### Task 7: Abas Informações | Membros em `CelulaDetalhe`

**Files:**
- Modify: `apps/web/src/pages/CelulaDetalhe.jsx`

**Interfaces:**
- Consumes: `MembrosPanel` (Task 6); `useSearchParams` (react-router-dom); `useAuth` (`../context/AuthContext.jsx`).

- [ ] **Step 1: Ajustar imports**

Modify `apps/web/src/pages/CelulaDetalhe.jsx` — na linha de import do react-router trocar para incluir `useSearchParams`, e adicionar os imports de `MembrosPanel` e `useAuth`:

```js
import { useParams, useSearchParams } from 'react-router-dom'
```
E junto aos demais imports de componentes/contexto (após os imports existentes):
```js
import { MembrosPanel } from '../components/MembrosPanel.jsx'
import { useAuth } from '../context/AuthContext.jsx'
```

- [ ] **Step 2: Substituir o `return` do componente `CelulaDetalhe` por abas**

Modify `apps/web/src/pages/CelulaDetalhe.jsx` — substituir o bloco `return ( <> ... </> )` do `export default function CelulaDetalhe()` (o que hoje contém o header + `<div className="space-y-5">` com os 4 cards) por:

```jsx
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()
  const aba = params.get('tab') === 'membros' ? 'membros' : 'informacoes'
  const ehAdmin = usuario?.papel === 'ADMIN'

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">{celula.nome}</h1>
        {celula.descricao && <p className="mt-1 text-sm text-text-muted">{celula.descricao}</p>}
        <p className="mt-1 text-sm text-text-muted">
          {nomeDiaSemana(celula.diaSemana)} · {celula._count?.membros ?? 0} membro(s)
        </p>
      </div>

      <div className="mb-5 flex gap-1 border-b border-border">
        {[
          { id: 'informacoes', label: 'Informações' },
          { id: 'membros', label: 'Membros' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams(t.id === 'membros' ? { tab: 'membros' } : {})}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.id ? 'border-brand text-text' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'informacoes' ? (
        <div className="space-y-5">
          <CronogramaForm celula={celula} onSalvo={() => { carregar(); setVersao((v) => v + 1) }} />
          <QrCard celula={celula} />
          <EncontrosCard key={`enc-${versao}`} celulaId={celula.id} />
          <FrequenciaCard key={`freq-${versao}`} celulaId={celula.id} />
        </div>
      ) : (
        <MembrosPanel celulaId={celula.id} liderId={celula.liderId} podeGerenciar={ehAdmin} />
      )}
    </>
  )
```

Observação: os componentes `CronogramaForm`, `QrCard`, `EncontrosCard`, `FrequenciaCard` já existem no arquivo — apenas movidos para dentro da aba Informações, sem alteração.

- [ ] **Step 3: Verificar build e a suíte web**

Run: `npm run build --workspace apps/web && npm run test --workspace apps/web`
Expected: build sem erros; testes web PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CelulaDetalhe.jsx
git commit -m "feat(web): abas Informações|Membros na tela da célula"
```

---

### Task 8: Item de menu "Membros" (líder)

**Files:**
- Modify: `apps/web/src/components/TopBar.jsx`

**Interfaces:**
- Consumes: `linksPorPapel` (a função exportada no próprio arquivo, da Fatia 1).

- [ ] **Step 1: Adicionar o ícone e o item**

Modify `apps/web/src/components/TopBar.jsx`:
- No import de `lucide-react`, adicionar `Contact` à lista.
- Dentro de `linksPorPapel`, no bloco `if (papel === 'LIDER')`, adicionar o item Membros **após** o item "Minha Célula":

```js
    links.push({ to: `/app/celula/${celulaId}?tab=membros`, label: 'Membros', icon: Contact })
```

- [ ] **Step 2: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/TopBar.jsx
git commit -m "feat(web): item de menu Membros para o líder"
```

---

### Task 9: Card de aviso ao excluir célula (refatora `window.confirm`)

**Files:**
- Modify: `apps/web/src/pages/Celulas.jsx`

**Interfaces:**
- Consumes: `ConfirmDialog` (`../components/ui/ConfirmDialog.jsx`).

Contexto (código atual em `apps/web/src/pages/Celulas.jsx`, dentro de `export default function Celulas()`):

```js
  async function excluir(id) {
    if (!window.confirm('Excluir esta célula? Os encontros e presenças serão removidos.')) return
    try {
      await apiExcluirCelula(id)
      carregar()
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível excluir a célula.')
    }
  }
```
O JSX tem um botão de excluir que chama `excluir(c.id)` (dentro do `.map((c) => ...)`). `useState` já está importado; `carregar` e `setErro` já existem.

- [ ] **Step 1: Adicionar o import do ConfirmDialog**

Modify `apps/web/src/pages/Celulas.jsx` — adicionar aos imports:

```js
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
```

- [ ] **Step 2: Substituir o handler `excluir` por estado + confirmação**

Modify `apps/web/src/pages/Celulas.jsx` — dentro de `Celulas()`, trocar a função `excluir(id)` inteira por:

```js
  const [aExcluir, setAExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function confirmarExclusao() {
    setExcluindo(true)
    try {
      await apiExcluirCelula(aExcluir.id)
      setAExcluir(null)
      carregar()
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível excluir a célula.')
      setAExcluir(null)
    } finally {
      setExcluindo(false)
    }
  }
```

No JSX, onde o botão de excluir chama `excluir(c.id)`, trocar para `setAExcluir(c)`. E adicionar o dialog logo antes do `</>` que fecha o `return` do componente:

```jsx
      <ConfirmDialog
        open={!!aExcluir}
        titulo="Excluir célula"
        mensagem="Excluir esta célula? Os encontros e presenças serão removidos. Não dá para desfazer."
        confirmarLabel="Excluir"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setAExcluir(null)}
      />
```

- [ ] **Step 3: Verificar build e a suíte web**

Run: `npm run build --workspace apps/web && npm run test --workspace apps/web`
Expected: build sem erros; testes web PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/Celulas.jsx
git commit -m "feat(web): card de aviso ao excluir célula (ConfirmDialog)"
```

---

## Verificação final (após todas as tasks)

- [ ] `npm run test --workspace packages/shared` — verde.
- [ ] `npm run test --workspace apps/api` — verde (175 + novos).
- [ ] `npm run test --workspace apps/web` — verde (12 + membros).
- [ ] `npm run build --workspace apps/web` — limpo.
- [ ] Smoke (localhost): como admin, abrir uma célula → aba Membros → editar um membro (modal), inativar (card de aviso → some/escurece com tag Inativo + Ativar), reativar; excluir célula mostra o card de aviso. Como líder, menu "Membros" abre a célula na aba Membros, só ativos, sem ações.

## Notas de desvio do spec

- **`GET /celulas/:id/membros` inclui `whatsapp`** no `select` (o spec listava `{id,nome,email,avatar,papel,ativo}`). Necessário para o `MembroEditModal` pré-preencher o campo WhatsApp. Não é dado sensível de auth; escopo da rota (própria célula) já restringe quem vê.
- **Testes de componente:** o projeto não tem infra de teste de componente React (vitest node-only). Lógica testável extraída em `agruparMembros`; componentes verificados por `build`. Consistente com a Fatia 1.
