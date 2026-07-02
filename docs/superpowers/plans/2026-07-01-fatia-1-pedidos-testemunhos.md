# Fatia 1 — Pedidos de Oração + Testemunhos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Pedidos de Oração (Membro/Líder), Testemunhos (Líder) e o novo padrão de navegação (drawer mobile), evoluindo os models já existentes.

**Architecture:** Backend Fastify+Prisma com duas rotas novas (`pedidos`, `testemunhos`) escopadas por autor/célula; frontend React com telas Meus Pedidos, PedidoForm e Testemunhos, um `ConfirmDialog` reutilizável, e refatoração da navegação (TopBar com drawer ☰; BottomNav aposentado).

**Tech Stack:** Node/Fastify 5, Prisma 6 + PostgreSQL, Zod 4, React 19 + React Router 6, Vite, Tailwind (tokens CSS), framer-motion, lucide-react, vitest.

## Global Constraints

- **Spec de referência:** `docs/superpowers/specs/2026-07-01-pedidos-oracao-e-testemunhos-design.md`.
- **Pedidos são privados ao autor:** toda rota de pedido filtra por `userId = request.usuario.id`; id de terceiro → `404`.
- **Testemunhos escopados à célula liderada:** `celula.liderId = request.usuario.id`.
- **Título obrigatório ≤100; Detalhes opcional ≤500** (validação no zod compartilhado).
- **1 testemunho por pedido** (`Testemunho.pedidoId @unique`), **sobrevive à exclusão do pedido** (`onDelete: SetNull` + `titulo` snapshot).
- **Dar testemunho marca o pedido `ATENDIDO`.**
- **Idioma:** todo texto de UI e mensagens de erro em português (com acentuação correta).
- **Tokens de cor (Tailwind):** `bg-card`, `bg-surface`, `bg-background`, `text-text`, `text-text-muted`, `text-on-brand`, `bg-brand`, `text-danger`, `border-border`, e a classe utilitária `brand-grad` (degradê prateado).
- **Comandos:** API `npm run test --workspace apps/api`; Web `npm run test --workspace apps/web`; build web `npm run build --workspace apps/web`; migration `npm run prisma:migrate --workspace apps/api`.
- **Teste de componente React não existe** (vitest web roda em `node`, `test/**/*.test.js`, só funções puras). Não adicionar jsdom/testing-library nesta fatia. Cobertura de lógica via funções puras; componentes verificados por `build`.
- **Prisma client** importado nas rotas via `import { prisma } from '../prisma.js'`. `requireRole(papel)` (de `../lib/roles.js`) faz `jwtVerify` e popula `request.usuario = { id, papel, celulaId }`.

---

## File Structure

**Backend (`apps/api`)**
- `prisma/schema.prisma` — evolui `PedidoOracao` e `Testemunho` (Task 1)
- `src/routes/pedidos.js` + `src/routes/pedidos.test.js` — CRUD + testemunhar (Task 3)
- `src/routes/testemunhos.js` + `src/routes/testemunhos.test.js` — listar/concluir (Task 4)
- `src/app.js` — registra as duas rotas (Tasks 3 e 4)

**Shared (`packages/shared`)**
- `src/pedido.schemas.js` + `src/pedido.schemas.test.js` — zod (Task 2)
- `src/index.js` — reexporta (Task 2)

**Frontend (`apps/web`)**
- `src/lib/datas.js` (+ `test/datas.test.js`) — `formatarDataCurta` (Task 5)
- `src/lib/api.js` — funções de pedidos/testemunhos (Task 5)
- `src/lib/testemunhos.js` (+ `test/testemunhos.test.js`) — `agruparTestemunhos` (Task 6)
- `src/components/ui/ConfirmDialog.jsx` — modal de confirmação (Task 7)
- `src/pages/MeusPedidos.jsx`, `src/components/PedidoCard.jsx` (Task 8)
- `src/pages/PedidoForm.jsx` (Task 9)
- `src/pages/Testemunhos.jsx`, `src/components/TestemunhoItem.jsx` (Task 10)
- `src/App.jsx` — rotas novas (Tasks 8, 9, 10)
- `src/components/NavDrawer.jsx`, `src/components/TopBar.jsx`, `src/components/AppLayout.jsx`, `src/components/BottomNav.jsx` — navegação (Task 11)

---

### Task 1: Evoluir schema Prisma + migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (models `PedidoOracao`, `Testemunho`)

**Interfaces:**
- Produces: tabelas com `PedidoOracao.titulo` (String, NOT NULL), `PedidoOracao.detalhes` (String?, nullable), `Testemunho.pedidoId` (String?, UNIQUE, FK ON DELETE SET NULL), `Testemunho.titulo` (String, NOT NULL), e relação 1-1 `PedidoOracao.testemunho`.

- [ ] **Step 1: Editar os models no schema**

Substituir os models `PedidoOracao` e `Testemunho` em `apps/api/prisma/schema.prisma` por:

```prisma
model PedidoOracao {
  id           String       @id @default(cuid())
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  celula       Celula?      @relation(fields: [celulaId], references: [id], onDelete: SetNull)
  celulaId     String?
  titulo       String
  detalhes     String?
  status       PedidoStatus @default(ATIVO)
  criadoEm     DateTime     @default(now())
  atualizadoEm DateTime     @updatedAt
  testemunho   Testemunho?
}

model Testemunho {
  id          String           @id @default(cuid())
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  celula      Celula?          @relation(fields: [celulaId], references: [id], onDelete: SetNull)
  celulaId    String?
  pedido      PedidoOracao?    @relation(fields: [pedidoId], references: [id], onDelete: SetNull)
  pedidoId    String?          @unique
  titulo      String
  status      TestemunhoStatus @default(PENDENTE)
  criadoEm    DateTime         @default(now())
  concluidoEm DateTime?
}
```

Não alterar os enums `PedidoStatus`/`TestemunhoStatus` (já existem).

- [ ] **Step 2: Gerar e aplicar a migration**

Run:
```bash
cd apps/api && npx prisma migrate dev --name pedidos_testemunhos_evolucao
```
Expected: cria `prisma/migrations/<timestamp>_pedidos_testemunhos_evolucao/` e aplica. Como não há dados reais em `PedidoOracao`/`Testemunho`, aceitar a recriação de colunas. Client é regenerado automaticamente.

- [ ] **Step 3: Validar o schema**

Run: `cd apps/api && npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 4: Rodar a suíte da API (garante que nada quebrou)**

Run: `npm run test --workspace apps/api`
Expected: PASS (161 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): evolui PedidoOracao (titulo/detalhes) e Testemunho (pedidoId/titulo)"
```

---

### Task 2: Schema zod compartilhado (pedido)

**Files:**
- Create: `packages/shared/src/pedido.schemas.js`
- Modify: `packages/shared/src/index.js`
- Test: `packages/shared/src/pedido.schemas.test.js`

**Interfaces:**
- Produces: `pedidoCreateSchema` (`{ titulo: string 1..100, detalhes?: string ..500, testemunhar?: boolean }`) e `pedidoUpdateSchema` (`{ titulo, detalhes? }`), exportados de `@icelula/shared`.

- [ ] **Step 1: Escrever o teste**

Create `packages/shared/src/pedido.schemas.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { pedidoCreateSchema, pedidoUpdateSchema } from './pedido.schemas.js'

describe('pedidoCreateSchema', () => {
  it('aceita título válido e detalhes opcionais', () => {
    expect(pedidoCreateSchema.safeParse({ titulo: 'Cura' }).success).toBe(true)
    expect(pedidoCreateSchema.safeParse({ titulo: 'Cura', detalhes: 'orar por saúde' }).success).toBe(true)
    expect(pedidoCreateSchema.safeParse({ titulo: 'Cura', testemunhar: true }).success).toBe(true)
  })
  it('rejeita título vazio', () => {
    expect(pedidoCreateSchema.safeParse({ titulo: '' }).success).toBe(false)
  })
  it('rejeita título acima de 100 e detalhes acima de 500', () => {
    expect(pedidoCreateSchema.safeParse({ titulo: 'a'.repeat(101) }).success).toBe(false)
    expect(pedidoCreateSchema.safeParse({ titulo: 'ok', detalhes: 'a'.repeat(501) }).success).toBe(false)
  })
})

describe('pedidoUpdateSchema', () => {
  it('exige título', () => {
    expect(pedidoUpdateSchema.safeParse({ detalhes: 'x' }).success).toBe(false)
    expect(pedidoUpdateSchema.safeParse({ titulo: 'novo' }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — `Cannot find module './pedido.schemas.js'`.

- [ ] **Step 3: Implementar o schema**

Create `packages/shared/src/pedido.schemas.js`:

```js
import { z } from 'zod'

export const pedidoCreateSchema = z.object({
  titulo: z.string().min(1, 'Informe um título').max(100, 'Máximo de 100 caracteres'),
  detalhes: z.string().max(500, 'Máximo de 500 caracteres').optional(),
  testemunhar: z.boolean().optional()
})

export const pedidoUpdateSchema = z.object({
  titulo: z.string().min(1, 'Informe um título').max(100, 'Máximo de 100 caracteres'),
  detalhes: z.string().max(500, 'Máximo de 500 caracteres').optional()
})
```

- [ ] **Step 4: Reexportar no index**

Modify `packages/shared/src/index.js` — adicionar a linha:

```js
export * from './pedido.schemas.js'
```

- [ ] **Step 5: Rodar o teste (deve passar)**

Run: `npm run test --workspace packages/shared`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/pedido.schemas.js packages/shared/src/pedido.schemas.test.js packages/shared/src/index.js
git commit -m "feat(shared): schemas zod de pedido de oração"
```

---

### Task 3: Rotas de Pedidos (backend)

**Files:**
- Create: `apps/api/src/routes/pedidos.js`
- Modify: `apps/api/src/app.js` (registrar `pedidoRoutes`)
- Test: `apps/api/src/routes/pedidos.test.js`

**Interfaces:**
- Consumes: `pedidoCreateSchema`, `pedidoUpdateSchema` (Task 2); `requireRole` (`../lib/roles.js`); `prisma` (`../prisma.js`).
- Produces: `pedidoRoutes(app)`. Endpoints: `GET /pedidos` → `{ pedidos: [{id,titulo,detalhes,status,criadoEm,testemunhado}] }`; `POST /pedidos` (201) → `{ pedido }`; `PUT /pedidos/:id` → `{ pedido }`; `DELETE /pedidos/:id` (204); `POST /pedidos/:id/testemunho` (201/200) → `{ testemunho }`.

- [ ] **Step 1: Escrever o teste completo**

Create `apps/api/src/routes/pedidos.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()
let autorId, outroId, autorToken, outroToken

beforeAll(async () => {
  app = buildApp(); await app.ready()
  const autor = await prisma.user.create({
    data: { nome: 'Autor', email: `autor-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' }
  })
  const outro = await prisma.user.create({
    data: { nome: 'Outro', email: `outro-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' }
  })
  autorId = autor.id; outroId = outro.id
  autorToken = app.jwt.sign({ id: autorId, papel: 'MEMBRO', celulaId: null })
  outroToken = app.jwt.sign({ id: outroId, papel: 'MEMBRO', celulaId: null })
})

afterAll(async () => {
  await prisma.testemunho.deleteMany({ where: { userId: { in: [autorId, outroId] } } })
  await prisma.pedidoOracao.deleteMany({ where: { userId: { in: [autorId, outroId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [autorId, outroId] } } })
  await app.close()
})

function criar(token, payload) {
  return app.inject({ method: 'POST', url: '/pedidos', headers: { authorization: `Bearer ${token}` }, payload })
}

describe('POST /pedidos', () => {
  it('cria pedido do autor logado', async () => {
    const res = await criar(autorToken, { titulo: 'Cura', detalhes: 'saúde' })
    expect(res.statusCode).toBe(201)
    expect(res.json().pedido.titulo).toBe('Cura')
    expect(res.json().pedido.status).toBe('ATIVO')
  })
  it('rejeita título vazio → 400', async () => {
    const res = await criar(autorToken, { titulo: '' })
    expect(res.statusCode).toBe(400)
  })
  it('testemunhar:true cria testemunho e marca pedido ATENDIDO', async () => {
    const res = await criar(autorToken, { titulo: 'Emprego', testemunhar: true })
    expect(res.statusCode).toBe(201)
    const pedidoId = res.json().pedido.id
    expect(res.json().pedido.status).toBe('ATENDIDO')
    const t = await prisma.testemunho.findUnique({ where: { pedidoId } })
    expect(t).not.toBeNull()
    expect(t.titulo).toBe('Emprego')
    expect(t.status).toBe('PENDENTE')
  })
})

describe('GET /pedidos', () => {
  it('lista apenas os pedidos do autor (privacidade)', async () => {
    await criar(outroToken, { titulo: 'Do outro' })
    const res = await app.inject({ method: 'GET', url: '/pedidos', headers: { authorization: `Bearer ${autorToken}` } })
    expect(res.statusCode).toBe(200)
    const titulos = res.json().pedidos.map((p) => p.titulo)
    expect(titulos).toContain('Cura')
    expect(titulos).not.toContain('Do outro')
    const comTestemunho = res.json().pedidos.find((p) => p.titulo === 'Emprego')
    expect(comTestemunho.testemunhado).toBe(true)
  })
})

describe('PUT /pedidos/:id', () => {
  it('autor edita o próprio pedido', async () => {
    const criado = (await criar(autorToken, { titulo: 'Antigo' })).json().pedido
    const res = await app.inject({
      method: 'PUT', url: `/pedidos/${criado.id}`,
      headers: { authorization: `Bearer ${autorToken}` }, payload: { titulo: 'Novo' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().pedido.titulo).toBe('Novo')
  })
  it('não-autor recebe 404', async () => {
    const criado = (await criar(autorToken, { titulo: 'Privado' })).json().pedido
    const res = await app.inject({
      method: 'PUT', url: `/pedidos/${criado.id}`,
      headers: { authorization: `Bearer ${outroToken}` }, payload: { titulo: 'Hack' }
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /pedidos/:id/testemunho', () => {
  it('é idempotente e o testemunho sobrevive à exclusão do pedido', async () => {
    const criado = (await criar(autorToken, { titulo: 'Milagre' })).json().pedido
    const r1 = await app.inject({ method: 'POST', url: `/pedidos/${criado.id}/testemunho`, headers: { authorization: `Bearer ${autorToken}` } })
    expect(r1.statusCode).toBe(201)
    const r2 = await app.inject({ method: 'POST', url: `/pedidos/${criado.id}/testemunho`, headers: { authorization: `Bearer ${autorToken}` } })
    expect(r2.json().testemunho.id).toBe(r1.json().testemunho.id) // não duplica

    await app.inject({ method: 'DELETE', url: `/pedidos/${criado.id}`, headers: { authorization: `Bearer ${autorToken}` } })
    const t = await prisma.testemunho.findUnique({ where: { id: r1.json().testemunho.id } })
    expect(t).not.toBeNull()          // sobreviveu
    expect(t.pedidoId).toBeNull()     // vínculo virou null
    expect(t.titulo).toBe('Milagre')  // título mantido
  })
})

describe('DELETE /pedidos/:id', () => {
  it('autor exclui o próprio pedido', async () => {
    const criado = (await criar(autorToken, { titulo: 'Excluir' })).json().pedido
    const res = await app.inject({ method: 'DELETE', url: `/pedidos/${criado.id}`, headers: { authorization: `Bearer ${autorToken}` } })
    expect(res.statusCode).toBe(204)
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/api -- pedidos`
Expected: FAIL — rota inexistente (404 em vez de 201).

- [ ] **Step 3: Implementar a rota**

Create `apps/api/src/routes/pedidos.js`:

```js
import { pedidoCreateSchema, pedidoUpdateSchema } from '@icelula/shared'
import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'

export async function pedidoRoutes(app) {
  app.get('/pedidos', { preHandler: requireRole('MEMBRO') }, async (request) => {
    const pedidos = await prisma.pedidoOracao.findMany({
      where: { userId: request.usuario.id },
      orderBy: { criadoEm: 'desc' },
      include: { testemunho: { select: { id: true } } }
    })
    return {
      pedidos: pedidos.map((p) => ({
        id: p.id, titulo: p.titulo, detalhes: p.detalhes,
        status: p.status, criadoEm: p.criadoEm, testemunhado: !!p.testemunho
      }))
    }
  })

  app.post('/pedidos', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    const parsed = pedidoCreateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    const { titulo, detalhes, testemunhar } = parsed.data
    const userId = request.usuario.id
    const celulaId = request.usuario.celulaId ?? null

    if (testemunhar) {
      const pedido = await prisma.$transaction(async (tx) => {
        const p = await tx.pedidoOracao.create({
          data: { userId, celulaId, titulo, detalhes: detalhes ?? null, status: 'ATENDIDO' }
        })
        await tx.testemunho.create({ data: { userId, celulaId, pedidoId: p.id, titulo, status: 'PENDENTE' } })
        return p
      })
      return reply.code(201).send({ pedido })
    }

    const pedido = await prisma.pedidoOracao.create({
      data: { userId, celulaId, titulo, detalhes: detalhes ?? null }
    })
    return reply.code(201).send({ pedido })
  })

  app.put('/pedidos/:id', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    const parsed = pedidoUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    const existente = await prisma.pedidoOracao.findUnique({ where: { id: request.params.id } })
    if (!existente || existente.userId !== request.usuario.id) return reply.code(404).send({ erro: 'Pedido não encontrado' })
    const pedido = await prisma.pedidoOracao.update({
      where: { id: existente.id },
      data: { titulo: parsed.data.titulo, detalhes: parsed.data.detalhes ?? null }
    })
    return { pedido }
  })

  app.delete('/pedidos/:id', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    const existente = await prisma.pedidoOracao.findUnique({ where: { id: request.params.id } })
    if (!existente || existente.userId !== request.usuario.id) return reply.code(404).send({ erro: 'Pedido não encontrado' })
    await prisma.pedidoOracao.delete({ where: { id: existente.id } })
    return reply.code(204).send()
  })

  app.post('/pedidos/:id/testemunho', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    const existente = await prisma.pedidoOracao.findUnique({
      where: { id: request.params.id }, include: { testemunho: true }
    })
    if (!existente || existente.userId !== request.usuario.id) return reply.code(404).send({ erro: 'Pedido não encontrado' })
    if (existente.testemunho) return { testemunho: existente.testemunho }
    const testemunho = await prisma.$transaction(async (tx) => {
      const t = await tx.testemunho.create({
        data: { userId: existente.userId, celulaId: existente.celulaId, pedidoId: existente.id, titulo: existente.titulo, status: 'PENDENTE' }
      })
      await tx.pedidoOracao.update({ where: { id: existente.id }, data: { status: 'ATENDIDO' } })
      return t
    })
    return reply.code(201).send({ testemunho })
  })
}
```

- [ ] **Step 4: Registrar a rota no app**

Modify `apps/api/src/app.js` — adicionar o import junto aos demais e o `register` após `perfilRoutes`:

```js
import { pedidoRoutes } from './routes/pedidos.js'
// ...
  app.register(pedidoRoutes)
```

- [ ] **Step 5: Rodar o teste (deve passar)**

Run: `npm run test --workspace apps/api -- pedidos`
Expected: PASS.

- [ ] **Step 6: Rodar a suíte completa da API**

Run: `npm run test --workspace apps/api`
Expected: PASS (todos os arquivos).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/pedidos.js apps/api/src/routes/pedidos.test.js apps/api/src/app.js
git commit -m "feat(api): rotas de pedidos de oração (CRUD + testemunhar, escopo por autor)"
```

---

### Task 4: Rotas de Testemunhos (backend)

**Files:**
- Create: `apps/api/src/routes/testemunhos.js`
- Modify: `apps/api/src/app.js` (registrar `testemunhoRoutes`)
- Test: `apps/api/src/routes/testemunhos.test.js`

**Interfaces:**
- Consumes: `requireRole`, `prisma`.
- Produces: `testemunhoRoutes(app)`. `GET /testemunhos` → `{ testemunhos: [{id,titulo,status,criadoEm,concluidoEm,autor:{nome,avatar}}] }` (da célula liderada, `criadoEm asc`); `POST /testemunhos/:id/concluir` → `{ testemunho }` (status CONCLUIDO + `concluidoEm`).

- [ ] **Step 1: Escrever o teste completo**

Create `apps/api/src/routes/testemunhos.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()
let celulaId, liderId, membroId, liderToken, membroToken
let outraCelulaId, outroLiderId, outroLiderToken

beforeAll(async () => {
  app = buildApp(); await app.ready()
  const celula = await prisma.celula.create({
    data: { nome: `Célula T ${sufixo}`, qrToken: `qr-t-${sufixo}`, diaSemana: 3, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-08-01T19:30:00') }
  })
  celulaId = celula.id
  const lider = await prisma.user.create({
    data: { nome: 'Líder T', email: `liderT-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId }
  })
  liderId = lider.id
  await prisma.celula.update({ where: { id: celulaId }, data: { liderId } })
  const membro = await prisma.user.create({
    data: { nome: 'Membro T', email: `membroT-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO', celulaId }
  })
  membroId = membro.id
  liderToken = app.jwt.sign({ id: liderId, papel: 'LIDER', celulaId })
  membroToken = app.jwt.sign({ id: membroId, papel: 'MEMBRO', celulaId })

  // Outra célula + líder (escopo isolado)
  const outra = await prisma.celula.create({
    data: { nome: `Outra ${sufixo}`, qrToken: `qr-o-${sufixo}`, diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-08-02T19:30:00') }
  })
  outraCelulaId = outra.id
  const outroLider = await prisma.user.create({
    data: { nome: 'Outro Líder', email: `outroL-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId: outraCelulaId }
  })
  outroLiderId = outroLider.id
  await prisma.celula.update({ where: { id: outraCelulaId }, data: { liderId: outroLiderId } })
  outroLiderToken = app.jwt.sign({ id: outroLiderId, papel: 'LIDER', celulaId: outraCelulaId })

  // Testemunhos: um do membro, um do próprio líder
  await prisma.testemunho.create({ data: { userId: membroId, celulaId, titulo: 'Do membro', status: 'PENDENTE' } })
  await prisma.testemunho.create({ data: { userId: liderId, celulaId, titulo: 'Do líder', status: 'PENDENTE' } })
})

afterAll(async () => {
  await prisma.testemunho.deleteMany({ where: { celulaId: { in: [celulaId, outraCelulaId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [liderId, membroId, outroLiderId] } } })
  await prisma.celula.deleteMany({ where: { id: { in: [celulaId, outraCelulaId] } } })
  await app.close()
})

describe('GET /testemunhos', () => {
  it('líder vê os testemunhos da própria célula, incluindo o próprio', async () => {
    const res = await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${liderToken}` } })
    expect(res.statusCode).toBe(200)
    const titulos = res.json().testemunhos.map((t) => t.titulo)
    expect(titulos).toContain('Do membro')
    expect(titulos).toContain('Do líder')
    const doMembro = res.json().testemunhos.find((t) => t.titulo === 'Do membro')
    expect(doMembro.autor.nome).toBe('Membro T')
  })
  it('membro (não-líder) recebe 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${membroToken}` } })
    expect(res.statusCode).toBe(403)
  })
  it('líder de outra célula não vê estes testemunhos', async () => {
    const res = await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${outroLiderToken}` } })
    expect(res.json().testemunhos).toHaveLength(0)
  })
})

describe('POST /testemunhos/:id/concluir', () => {
  it('marca CONCLUIDO com concluidoEm', async () => {
    const lista = (await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${liderToken}` } })).json().testemunhos
    const alvo = lista[0]
    const res = await app.inject({ method: 'POST', url: `/testemunhos/${alvo.id}/concluir`, headers: { authorization: `Bearer ${liderToken}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json().testemunho.status).toBe('CONCLUIDO')
    expect(res.json().testemunho.concluidoEm).not.toBeNull()
  })
  it('líder de outra célula não conclui → 404', async () => {
    const lista = (await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${liderToken}` } })).json().testemunhos
    const alvo = lista.find((t) => t.status === 'PENDENTE') || lista[0]
    const res = await app.inject({ method: 'POST', url: `/testemunhos/${alvo.id}/concluir`, headers: { authorization: `Bearer ${outroLiderToken}` } })
    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/api -- testemunhos`
Expected: FAIL — rota inexistente.

- [ ] **Step 3: Implementar a rota**

Create `apps/api/src/routes/testemunhos.js`:

```js
import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'

export async function testemunhoRoutes(app) {
  app.get('/testemunhos', { preHandler: requireRole('LIDER') }, async (request) => {
    const celula = await prisma.celula.findFirst({ where: { liderId: request.usuario.id } })
    if (!celula) return { testemunhos: [] }
    const testemunhos = await prisma.testemunho.findMany({
      where: { celulaId: celula.id },
      include: { user: { select: { nome: true, avatar: true } } },
      orderBy: { criadoEm: 'asc' }
    })
    return {
      testemunhos: testemunhos.map((t) => ({
        id: t.id, titulo: t.titulo, status: t.status,
        criadoEm: t.criadoEm, concluidoEm: t.concluidoEm,
        autor: { nome: t.user.nome, avatar: t.user.avatar }
      }))
    }
  })

  app.post('/testemunhos/:id/concluir', { preHandler: requireRole('LIDER') }, async (request, reply) => {
    const celula = await prisma.celula.findFirst({ where: { liderId: request.usuario.id } })
    if (!celula) return reply.code(404).send({ erro: 'Testemunho não encontrado' })
    const t = await prisma.testemunho.findUnique({ where: { id: request.params.id } })
    if (!t || t.celulaId !== celula.id) return reply.code(404).send({ erro: 'Testemunho não encontrado' })
    const testemunho = await prisma.testemunho.update({
      where: { id: t.id }, data: { status: 'CONCLUIDO', concluidoEm: new Date() }
    })
    return { testemunho }
  })
}
```

- [ ] **Step 4: Registrar a rota no app**

Modify `apps/api/src/app.js` — adicionar import e `app.register(testemunhoRoutes)` após `pedidoRoutes`:

```js
import { testemunhoRoutes } from './routes/testemunhos.js'
// ...
  app.register(testemunhoRoutes)
```

- [ ] **Step 5: Rodar o teste (deve passar) e a suíte completa**

Run: `npm run test --workspace apps/api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/testemunhos.js apps/api/src/routes/testemunhos.test.js apps/api/src/app.js
git commit -m "feat(api): rotas de testemunhos (listar/concluir, escopo por célula liderada)"
```

---

### Task 5: Helper de data curta + funções de API (frontend)

**Files:**
- Modify: `apps/web/src/lib/datas.js`
- Test: `apps/web/test/datas.test.js`
- Modify: `apps/web/src/lib/api.js`

**Interfaces:**
- Produces: `formatarDataCurta(iso)` → `"dd/mm/aaaa"`; e as funções `apiListarPedidos`, `apiCriarPedido`, `apiAtualizarPedido`, `apiExcluirPedido`, `apiTestemunhar`, `apiListarTestemunhos`, `apiConcluirTestemunho`.

- [ ] **Step 1: Escrever o teste da formatação**

Modify `apps/web/test/datas.test.js`:
- **Estender o import existente** no topo — trocar `import { chaveDiaLocal } from '../src/lib/datas.js'` por `import { chaveDiaLocal, formatarDataCurta } from '../src/lib/datas.js'` (não criar um segundo import do mesmo módulo).
- Adicionar ao final do arquivo:

```js
describe('formatarDataCurta', () => {
  it('retorna dd/mm/aaaa a partir de um ISO', () => {
    expect(formatarDataCurta('2026-07-01T10:00:00')).toBe('01/07/2026')
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/web -- datas`
Expected: FAIL — `formatarDataCurta is not a function`.

- [ ] **Step 3: Implementar a formatação**

Modify `apps/web/src/lib/datas.js` — adicionar:

```js
export function formatarDataCurta(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
```

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `npm run test --workspace apps/web -- datas`
Expected: PASS.

- [ ] **Step 5: Adicionar as funções de API**

Modify `apps/web/src/lib/api.js` — adicionar ao final:

```js
// ---- Pedidos de Oração ----
export async function apiListarPedidos() {
  const { data } = await api.get('/pedidos')
  return data.pedidos
}
export async function apiCriarPedido(payload) {
  const { data } = await api.post('/pedidos', payload)
  return data.pedido
}
export async function apiAtualizarPedido(id, payload) {
  const { data } = await api.put(`/pedidos/${id}`, payload)
  return data.pedido
}
export async function apiExcluirPedido(id) {
  await api.delete(`/pedidos/${id}`)
}
export async function apiTestemunhar(pedidoId) {
  const { data } = await api.post(`/pedidos/${pedidoId}/testemunho`)
  return data.testemunho
}

// ---- Testemunhos (líder) ----
export async function apiListarTestemunhos() {
  const { data } = await api.get('/testemunhos')
  return data.testemunhos
}
export async function apiConcluirTestemunho(id) {
  const { data } = await api.post(`/testemunhos/${id}/concluir`)
  return data.testemunho
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/datas.js apps/web/test/datas.test.js apps/web/src/lib/api.js
git commit -m "feat(web): formatarDataCurta + funções de API de pedidos/testemunhos"
```

---

### Task 6: Lógica pura de agrupamento de testemunhos

**Files:**
- Create: `apps/web/src/lib/testemunhos.js`
- Test: `apps/web/test/testemunhos.test.js`

**Interfaces:**
- Produces: `agruparTestemunhos(lista)` → `{ pendentes, concluidos }`, onde `pendentes` = status PENDENTE ordenados por `criadoEm` **ascendente** (fila) e `concluidos` = status CONCLUIDO ordenados por `concluidoEm` **descendente** (realização mais recente primeiro).

- [ ] **Step 1: Escrever o teste**

Create `apps/web/test/testemunhos.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { agruparTestemunhos } from '../src/lib/testemunhos.js'

const lista = [
  { id: 'a', status: 'PENDENTE', criadoEm: '2026-07-03T10:00:00', concluidoEm: null },
  { id: 'b', status: 'PENDENTE', criadoEm: '2026-07-01T10:00:00', concluidoEm: null },
  { id: 'c', status: 'CONCLUIDO', criadoEm: '2026-06-20T10:00:00', concluidoEm: '2026-07-02T10:00:00' },
  { id: 'd', status: 'CONCLUIDO', criadoEm: '2026-06-20T10:00:00', concluidoEm: '2026-07-05T10:00:00' }
]

describe('agruparTestemunhos', () => {
  it('pendentes em fila (mais antigo primeiro)', () => {
    const { pendentes } = agruparTestemunhos(lista)
    expect(pendentes.map((t) => t.id)).toEqual(['b', 'a'])
  })
  it('concluídos por realização mais recente primeiro', () => {
    const { concluidos } = agruparTestemunhos(lista)
    expect(concluidos.map((t) => t.id)).toEqual(['d', 'c'])
  })
})
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `npm run test --workspace apps/web -- testemunhos`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `apps/web/src/lib/testemunhos.js`:

```js
export function agruparTestemunhos(lista) {
  const pendentes = lista
    .filter((t) => t.status === 'PENDENTE')
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))
  const concluidos = lista
    .filter((t) => t.status === 'CONCLUIDO')
    .sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm))
  return { pendentes, concluidos }
}
```

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `npm run test --workspace apps/web -- testemunhos`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/testemunhos.js apps/web/test/testemunhos.test.js
git commit -m "feat(web): agruparTestemunhos (pendentes fila / concluídos recentes)"
```

---

### Task 7: Componente ConfirmDialog

**Files:**
- Create: `apps/web/src/components/ui/ConfirmDialog.jsx`

**Interfaces:**
- Produces: `<ConfirmDialog open, titulo, mensagem, confirmarLabel, onConfirmar, onCancelar, carregando />`. Modal centralizado com overlay; botão de confirmar usa `variant="primary"`, cancelar `variant="secondary"`.

- [ ] **Step 1: Implementar o componente**

Create `apps/web/src/components/ui/ConfirmDialog.jsx`:

```jsx
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './Button.jsx'

export function ConfirmDialog({
  open,
  titulo = 'Confirmar',
  mensagem,
  confirmarLabel = 'Confirmar',
  onConfirmar,
  onCancelar,
  carregando = false
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancelar} aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <motion.div
              role="dialog" aria-modal="true"
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            >
              <h2 className="text-lg font-semibold text-text">{titulo}</h2>
              {mensagem && <p className="mt-2 text-sm text-text-muted">{mensagem}</p>}
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
                <Button variant="primary" loading={carregando} onClick={onConfirmar}>{confirmarLabel}</Button>
              </div>
            </motion.div>
          </div>
        </>
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
git add apps/web/src/components/ui/ConfirmDialog.jsx
git commit -m "feat(web): ConfirmDialog reutilizável"
```

---

### Task 8: Tela Meus Pedidos + PedidoCard

**Files:**
- Create: `apps/web/src/components/PedidoCard.jsx`
- Create: `apps/web/src/pages/MeusPedidos.jsx`
- Modify: `apps/web/src/App.jsx` (rota `/app/pedidos`)

**Interfaces:**
- Consumes: `apiListarPedidos`, `apiExcluirPedido`, `apiTestemunhar` (Task 5); `formatarDataCurta` (Task 5); `ConfirmDialog` (Task 7).
- Produces: rota `/app/pedidos` renderizando a lista; `PedidoCard` recebe `pedido`, `onEditar`, `onExcluir`, `onTestemunhar`.

- [ ] **Step 1: Implementar o PedidoCard**

Create `apps/web/src/components/PedidoCard.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoreVertical, Pencil, Trash2, HandHeart, ChevronDown, ChevronUp } from 'lucide-react'
import { formatarDataCurta } from '../lib/datas.js'

export function PedidoCard({ pedido, onEditar, onExcluir, onTestemunhar }) {
  const [aberto, setAberto] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onClickFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false)
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  const temDetalhes = !!pedido.detalhes

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-text">{pedido.titulo}</h3>
            {pedido.status === 'ATENDIDO' && (
              <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-text-muted">Atendido</span>
            )}
          </div>
          {temDetalhes && (
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
            >
              Ver detalhes {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        <span className="shrink-0 text-xs text-text-muted">{formatarDataCurta(pedido.criadoEm)}</span>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button" aria-label="Opções" onClick={() => setMenu((v) => !v)}
            className="rounded-lg p-1 text-text-muted hover:bg-surface hover:text-text"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface"
                onClick={() => { setMenu(false); onEditar(pedido) }}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              {!pedido.testemunhado && (
                <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface"
                  onClick={() => { setMenu(false); onTestemunhar(pedido) }}>
                  <HandHeart className="h-4 w-4" /> Dar Testemunho
                </button>
              )}
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface"
                onClick={() => { setMenu(false); onExcluir(pedido) }}>
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {aberto && temDetalhes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-surface"
          >
            <p className="whitespace-pre-wrap px-4 py-3 text-sm text-text-muted">{pedido.detalhes}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Implementar a página MeusPedidos**

Create `apps/web/src/pages/MeusPedidos.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { apiListarPedidos, apiExcluirPedido, apiTestemunhar } from '../lib/api.js'
import { PedidoCard } from '../components/PedidoCard.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { Button } from '../components/ui/Button.jsx'

export default function MeusPedidos() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aExcluir, setAExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setPedidos(await apiListarPedidos())
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  async function confirmarExclusao() {
    setExcluindo(true)
    try {
      await apiExcluirPedido(aExcluir.id)
      setPedidos((lista) => lista.filter((p) => p.id !== aExcluir.id))
      setAExcluir(null)
    } finally { setExcluindo(false) }
  }

  async function testemunhar(pedido) {
    await apiTestemunhar(pedido.id)
    await carregar()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Meus Pedidos</h1>
        <div className="w-auto">
          <Button className="!w-auto px-4" onClick={() => navigate('/app/pedidos/novo')}>
            <Plus className="h-4 w-4" /> Novo pedido
          </Button>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : pedidos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-text-muted">Você ainda não tem pedidos de oração.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pedidos.map((p) => (
            <PedidoCard
              key={p.id} pedido={p}
              onEditar={(ped) => navigate(`/app/pedidos/${ped.id}/editar`)}
              onExcluir={(ped) => setAExcluir(ped)}
              onTestemunhar={testemunhar}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!aExcluir}
        titulo="Excluir pedido"
        mensagem="Excluir este pedido de oração? Não dá para desfazer."
        confirmarLabel="Excluir"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setAExcluir(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Registrar a rota**

Modify `apps/web/src/App.jsx`:
- adicionar import: `import MeusPedidos from './pages/MeusPedidos.jsx'`
- dentro do bloco protegido (`<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>`), adicionar:

```jsx
<Route path="/app/pedidos" element={<MeusPedidos />} />
```

- [ ] **Step 4: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/PedidoCard.jsx apps/web/src/pages/MeusPedidos.jsx apps/web/src/App.jsx
git commit -m "feat(web): tela Meus Pedidos com card expansível e exclusão confirmada"
```

---

### Task 9: Card Novo/Editar Pedido (PedidoForm)

**Files:**
- Create: `apps/web/src/pages/PedidoForm.jsx`
- Modify: `apps/web/src/App.jsx` (rotas `/app/pedidos/novo` e `/app/pedidos/:id/editar`)

**Interfaces:**
- Consumes: `apiCriarPedido`, `apiAtualizarPedido`, `apiTestemunhar`, `apiListarPedidos` (Task 5); `formatarDataCurta`; `Button`, `Input`.
- Produces: rotas de criação/edição.

- [ ] **Step 1: Implementar o PedidoForm**

Create `apps/web/src/pages/PedidoForm.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { pedidoCreateSchema } from '@icelula/shared'
import { apiCriarPedido, apiAtualizarPedido, apiTestemunhar, apiListarPedidos } from '../lib/api.js'
import { formatarDataCurta } from '../lib/datas.js'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'

const CITACAO = '"Entregue o seu caminho ao Senhor; confie nele, e ele agirá." – Salmos 37:5'

export default function PedidoForm() {
  const { id } = useParams()
  const editando = !!id
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const {
    register, handleSubmit, watch, reset, formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(pedidoCreateSchema), defaultValues: { titulo: '', detalhes: '' } })

  useEffect(() => {
    if (!editando) return
    apiListarPedidos().then((lista) => {
      const p = lista.find((x) => x.id === id)
      if (p) { setPedido(p); reset({ titulo: p.titulo, detalhes: p.detalhes || '' }) }
    })
  }, [id, editando, reset])

  const titulo = watch('titulo') || ''
  const detalhes = watch('detalhes') || ''

  async function salvar(dados, testemunhar) {
    const payload = { titulo: dados.titulo, detalhes: dados.detalhes || undefined }
    if (editando) {
      await apiAtualizarPedido(id, payload)
      if (testemunhar) await apiTestemunhar(id)
    } else {
      await apiCriarPedido({ ...payload, testemunhar })
    }
    navigate('/app/pedidos')
  }

  const dataExibida = pedido ? formatarDataCurta(pedido.criadoEm) : formatarDataCurta(new Date().toISOString())
  const jaTestemunhado = !!pedido?.testemunhado

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold text-text">{editando ? 'Editar pedido de oração' : 'Novo pedido de oração'}</h1>
      <p className="mt-1 text-sm italic text-text-muted">{CITACAO}</p>

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit((d) => salvar(d, false))}>
        <div>
          <div className="relative">
            <Input id="titulo" placeholder="Título..." maxLength={100} {...register('titulo')} error={errors.titulo?.message} />
            <span className="pointer-events-none absolute right-3 top-3.5 text-xs text-text-muted">{titulo.length}/100</span>
          </div>
        </div>

        <div className="relative">
          <textarea
            id="detalhes" placeholder="Detalhes..." maxLength={500} rows={8}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...register('detalhes')}
          />
          <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-text-muted">{detalhes.length}/500</span>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" loading={isSubmitting} className="!w-auto px-6">Salvar</Button>
          {!jaTestemunhado && (
            <Button type="button" variant="primary" className="!w-auto px-6"
              onClick={handleSubmit((d) => salvar(d, true))}>Dar Testemunho</Button>
          )}
          <span className="ml-auto text-sm text-text-muted">{dataExibida}</span>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Registrar as rotas**

Modify `apps/web/src/App.jsx`:
- import: `import PedidoForm from './pages/PedidoForm.jsx'`
- no bloco protegido, adicionar:

```jsx
<Route path="/app/pedidos/novo" element={<PedidoForm />} />
<Route path="/app/pedidos/:id/editar" element={<PedidoForm />} />
```

- [ ] **Step 3: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/PedidoForm.jsx apps/web/src/App.jsx
git commit -m "feat(web): card de novo/editar pedido de oração"
```

---

### Task 10: Tela Testemunhos + TestemunhoItem (líder)

**Files:**
- Create: `apps/web/src/components/TestemunhoItem.jsx`
- Create: `apps/web/src/pages/Testemunhos.jsx`
- Modify: `apps/web/src/App.jsx` (rota `/app/testemunhos` com gate de LIDER)

**Interfaces:**
- Consumes: `apiListarTestemunhos`, `apiConcluirTestemunho` (Task 5); `agruparTestemunhos` (Task 6); `formatarDataCurta`; `Avatar`; `Button`; `useAuth`.
- Produces: rota `/app/testemunhos`; `TestemunhoItem` recebe `testemunho`, `onConcluir`.

- [ ] **Step 1: Implementar o TestemunhoItem**

Create `apps/web/src/components/TestemunhoItem.jsx`:

```jsx
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Avatar } from './ui/Avatar.jsx'
import { Button } from './ui/Button.jsx'
import { formatarDataCurta } from '../lib/datas.js'

export function TestemunhoItem({ testemunho, onConcluir }) {
  const concluido = testemunho.status === 'CONCLUIDO'
  return (
    <motion.div
      layout
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 ${concluido ? 'opacity-60' : ''}`}
    >
      <Avatar src={testemunho.autor.avatar} nome={testemunho.autor.nome} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text">{testemunho.autor.nome}</p>
        <p className="truncate text-sm text-text-muted">{testemunho.titulo}</p>
        <p className="text-xs text-text-muted">{formatarDataCurta(testemunho.criadoEm)}</p>
      </div>
      {concluido ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs text-text-muted">
          <Check className="h-4 w-4" /> Realizado
        </span>
      ) : (
        <Button className="!w-auto px-4" onClick={() => onConcluir(testemunho)}>Realizado</Button>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Implementar a página Testemunhos**

Create `apps/web/src/pages/Testemunhos.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { apiListarTestemunhos, apiConcluirTestemunho } from '../lib/api.js'
import { agruparTestemunhos } from '../lib/testemunhos.js'
import { TestemunhoItem } from '../components/TestemunhoItem.jsx'

export default function Testemunhos() {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    apiListarTestemunhos().then((t) => { setLista(t); setCarregando(false) })
  }, [])

  async function concluir(testemunho) {
    const atualizado = await apiConcluirTestemunho(testemunho.id)
    setLista((atual) => atual.map((t) => (t.id === testemunho.id ? { ...t, ...atualizado } : t)))
  }

  const { pendentes, concluidos } = agruparTestemunhos(lista)
  const ordenada = [...pendentes, ...concluidos]

  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold text-text">Testemunhos</h1>
      {carregando ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-text-muted">Nenhum testemunho ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenada.map((t) => (
            <TestemunhoItem key={t.id} testemunho={t} onConcluir={concluir} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Registrar a rota com gate de LIDER**

Modify `apps/web/src/App.jsx`:
- import: `import Testemunhos from './pages/Testemunhos.jsx'`
- adicionar um wrapper de papel logo abaixo de `InicioOuCelulas`:

```jsx
function SoLider({ children }) {
  const { usuario } = useAuth()
  return usuario?.papel === 'LIDER' ? children : <Navigate to="/app" replace />
}
```

- no bloco protegido, adicionar:

```jsx
<Route path="/app/testemunhos" element={<SoLider><Testemunhos /></SoLider>} />
```

- [ ] **Step 4: Verificar build**

Run: `npm run build --workspace apps/web`
Expected: build sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TestemunhoItem.jsx apps/web/src/pages/Testemunhos.jsx apps/web/src/App.jsx
git commit -m "feat(web): tela de testemunhos do líder (fila + realizar com reorder)"
```

---

### Task 11: Navegação — drawer mobile, logo clicável, novos itens, aposentar BottomNav

**Files:**
- Create: `apps/web/src/components/NavDrawer.jsx`
- Modify: `apps/web/src/components/TopBar.jsx`
- Modify: `apps/web/src/components/AppLayout.jsx`
- Delete: `apps/web/src/components/BottomNav.jsx`

**Interfaces:**
- Consumes: `linksPorPapel` (movido para dentro de `TopBar` e compartilhado com o drawer); `useAuth`.
- Produces: navegação responsiva — TopBar horizontal no desktop, drawer ☰ no mobile; logo clicável → `/app`.

- [ ] **Step 1: Implementar o NavDrawer**

Create `apps/web/src/components/NavDrawer.jsx`:

```jsx
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

export function NavDrawer({ open, onClose, links }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} aria-hidden="true"
          />
          <motion.nav
            aria-label="Navegação principal"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80%] border-r border-border bg-card p-4 md:hidden"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
          >
            <div className="flex flex-col gap-1 pt-2">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to} to={to} end={end} onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand text-on-brand' : 'text-text-muted hover:bg-surface hover:text-text'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Refatorar a TopBar (logo clicável, novos itens, botão ☰)**

Replace o conteúdo de `apps/web/src/components/TopBar.jsx` por:

```jsx
import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { CalendarDays, Home, Users2, HandHeart, Sparkles, Menu } from 'lucide-react'
import { Logo } from './ui/Logo.jsx'
import { AvatarMenu } from './AvatarMenu.jsx'
import { NavDrawer } from './NavDrawer.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Fonte única dos itens de navegação por papel (consumida pela TopBar e pelo NavDrawer).
export function linksPorPapel(usuario) {
  const { papel, celulaId } = usuario || {}
  if (papel === 'ADMIN') return [{ to: '/app/celulas', label: 'Células', icon: Users2 }]
  if (!celulaId) return []
  const links = [
    { to: '/app', label: 'Início', icon: Home, end: true },
    { to: '/app/calendario', label: 'Calendário', icon: CalendarDays },
    { to: '/app/pedidos', label: 'Pedidos', icon: HandHeart },
  ]
  if (papel === 'LIDER') {
    links.push({ to: `/app/celula/${celulaId}`, label: 'Minha Célula', icon: Users2 })
    links.push({ to: '/app/testemunhos', label: 'Testemunhos', icon: Sparkles })
  }
  return links
}

export function TopBar() {
  const { usuario } = useAuth()
  const links = linksPorPapel(usuario)
  const [drawerAberto, setDrawerAberto] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-2">
        <div className="flex items-center gap-1.5">
          {links.length > 0 && (
            <button
              type="button" aria-label="Abrir menu" onClick={() => setDrawerAberto(true)}
              className="-ml-1 rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link to="/app" aria-label="Ir para o início" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Logo />
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {links.length > 0 && (
            <nav className="mr-2 hidden items-center gap-1 md:flex" aria-label="Navegação principal">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isActive ? 'bg-brand text-on-brand' : 'text-text-muted hover:bg-surface hover:text-text'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
          <AvatarMenu />
        </div>
      </div>

      <NavDrawer open={drawerAberto} onClose={() => setDrawerAberto(false)} links={links} />
    </header>
  )
}
```

- [ ] **Step 3: Remover o BottomNav do layout**

Modify `apps/web/src/components/AppLayout.jsx` para:

```jsx
import { Outlet } from 'react-router-dom'
import { EncontrosProvider } from '../context/EncontrosContext.jsx'
import { TopBar } from './TopBar.jsx'

export function AppLayout() {
  return (
    <EncontrosProvider>
      <div className="min-h-dvh bg-background">
        <TopBar />
        <main className="mx-auto w-full max-w-3xl px-5 py-6"><Outlet /></main>
      </div>
    </EncontrosProvider>
  )
}
```

- [ ] **Step 4: Apagar o arquivo do BottomNav**

Run: `git rm apps/web/src/components/BottomNav.jsx`
Expected: arquivo removido. (Confirme antes que nenhum outro arquivo além do antigo `AppLayout` o importava: `grep -rn "BottomNav" apps/web/src` deve não retornar nada após o Step 3.)

- [ ] **Step 5: Verificar build e a suíte web**

Run: `npm run build --workspace apps/web && npm run test --workspace apps/web`
Expected: build sem erros; testes web PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/NavDrawer.jsx apps/web/src/components/TopBar.jsx apps/web/src/components/AppLayout.jsx
git commit -m "feat(web): navegação com drawer mobile, logo clicável e itens Pedidos/Testemunhos"
```

---

## Verificação final (após todas as tasks)

- [ ] `npm run test --workspace apps/api` — todos os testes da API verdes (161 + pedidos + testemunhos).
- [ ] `npm run test --workspace apps/web` — testes web verdes (datas, testemunhos, e os existentes).
- [ ] `npm run test --workspace packages/shared` — schemas verdes.
- [ ] `npm run build --workspace apps/web` — build limpo.
- [ ] Smoke manual (localhost): criar pedido, expandir detalhes, dar testemunho (vira Atendido), excluir com confirmação; como líder, ver o testemunho e marcar Realizado (desce e escurece); abrir o drawer no mobile e clicar na logo para voltar ao Início.

## Notas de desvio do spec

- **Testes de componente React:** o spec citava "teste de componente do PedidoCard". O projeto web não tem infra de teste de componente (vitest roda em `node`, só `test/**/*.test.js` de funções puras). Em vez de adicionar jsdom/testing-library nesta fatia, a lógica testável foi extraída para funções puras (`formatarDataCurta`, `agruparTestemunhos`) com testes; os componentes são verificados por `build`. Coerente com o padrão atual do projeto.
