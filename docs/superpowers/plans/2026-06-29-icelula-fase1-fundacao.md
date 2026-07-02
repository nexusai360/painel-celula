# iCélula — Fase 1: Fundação (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a fundação backend do iCélula — monorepo, banco PostgreSQL, schema Prisma completo, API Fastify e autenticação JWT com papéis (Membro/Líder/Admin) e seed do admin.

**Architecture:** Monorepo com npm workspaces (`apps/api`, `apps/web`, `packages/shared`). A API Fastify (ESM) usa Prisma sobre PostgreSQL (rodando em Docker). Autenticação por JWT próprio (bcryptjs + @fastify/jwt). Schemas de validação (zod) ficam em `packages/shared`, consumidos pela API e, futuramente, pelo frontend. Testes com Vitest usando `fastify.inject()`.

**Tech Stack:** Node 20+ (ambiente atual: Node 24), npm workspaces, Fastify 5, Prisma 6 + PostgreSQL 16, @fastify/jwt, @fastify/cors, bcryptjs, zod 4, Vitest 3, Docker Compose.

## Global Constraints

- Pasta raiz do projeto: `iCelula/` (sem acento). Todo código vive aqui.
- Apenas localhost nesta fase: API em `:3000`, Postgres em `:5432`. Sem deploy/domínio.
- ESM em todo o projeto (`"type": "module"`).
- Papéis exatos (enum): `MEMBRO`, `LIDER`, `ADMIN`. Admin ⊃ Líder ⊃ Membro.
- Hierarquia multi-célula: `MEMBRO` e `LIDER` pertencem a 1 célula (`celulaId`); `ADMIN` é global (`celulaId` nulo).
- Status (enums): Encontro `AGENDADO|REALIZADO|CANCELADO`; PedidoOracao `ATIVO|ATENDIDO`; Testemunho `PENDENTE|CONCLUIDO`.
- Idioma do domínio em português (nomes de campos: `nome`, `senha`, `celulaId` etc.).
- Senhas: hash com bcryptjs, custo 10. Nunca retornar `senhaHash` nas respostas.
- Mensagens de erro e textos voltados ao usuário em português.
- Commits frequentes, um por task no mínimo. Mensagens de commit em português, terminando com:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

```
iCelula/
├── package.json                 # raiz: workspaces + scripts agregados
├── .nvmrc                       # versão do node
├── .gitignore                   # já existe
├── docker-compose.yml           # Postgres local
├── .env.example                 # template de variáveis
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── index.js         # re-exporta tudo
│           └── auth.schemas.js  # zod: register, login
├── apps/
│   └── api/
│       ├── package.json
│       ├── .env                 # local (gitignored)
│       ├── vitest.config.js
│       ├── prisma/
│       │   ├── schema.prisma    # schema completo (todos os modelos)
│       │   └── seed.js          # admin + célula de exemplo
│       └── src/
│           ├── server.js        # entrypoint (listen)
│           ├── app.js           # buildApp() → instância Fastify (testável)
│           ├── prisma.js        # PrismaClient singleton
│           ├── lib/
│           │   ├── password.js  # hash/compare bcrypt
│           │   └── roles.js     # requireRole / hierarquia
│           └── routes/
│               ├── health.js
│               └── auth.js      # /auth/register, /auth/login, /auth/me
```

---

### Task 1: Scaffold do monorepo

**Files:**
- Create: `iCelula/package.json`
- Create: `iCelula/.nvmrc`
- Create: `iCelula/README.md`

**Interfaces:**
- Produces: workspaces npm `apps/*` e `packages/*`; scripts raiz `dev:api`, `test`, `db:up`, `db:down`.

- [ ] **Step 1: Criar `iCelula/.nvmrc`**

```
20
```

- [ ] **Step 2: Criar `iCelula/package.json`**

```json
{
  "name": "icelula",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev:api": "npm run dev --workspace apps/api",
    "test": "npm run test --workspaces --if-present",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "prisma:migrate": "npm run prisma:migrate --workspace apps/api",
    "prisma:seed": "npm run prisma:seed --workspace apps/api"
  }
}
```

- [ ] **Step 3: Criar `iCelula/README.md`**

```markdown
# iCélula

Plataforma de gestão de células cristãs. Monorepo (npm workspaces).

## Rodar localmente

1. `npm install`
2. `npm run db:up` — sobe o Postgres (Docker)
3. `cp apps/api/.env.example apps/api/.env` (ajuste se necessário)
4. `npm run prisma:migrate` — cria o schema
5. `npm run prisma:seed` — cria admin + célula de exemplo
6. `npm run dev:api` — API em http://localhost:3000

## Estrutura
- `apps/api` — API Fastify + Prisma
- `apps/web` — frontend Vite + React (próximas fases)
- `packages/shared` — schemas zod compartilhados
```

- [ ] **Step 4: Instalar e verificar**

Run: `cd iCelula && npm install`
Expected: cria `node_modules/` e `package-lock.json` sem erros (workspaces ainda vazios é ok).

- [ ] **Step 5: Commit**

```bash
cd iCelula
git add package.json .nvmrc README.md package-lock.json
git commit -m "Fase1: scaffold do monorepo (npm workspaces)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Postgres local (Docker) + variáveis de ambiente

**Files:**
- Create: `iCelula/docker-compose.yml`
- Create: `iCelula/.env.example`
- Create: `iCelula/apps/api/.env.example`

**Interfaces:**
- Produces: Postgres em `localhost:5432`, base `icelula`, usuário `icelula`/senha `icelula`. Variável `DATABASE_URL` e `JWT_SECRET`.

- [ ] **Step 1: Criar `iCelula/docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: icelula-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: icelula
      POSTGRES_PASSWORD: icelula
      POSTGRES_DB: icelula
    ports:
      - "5432:5432"
    volumes:
      - icelula_pgdata:/var/lib/postgresql/data

volumes:
  icelula_pgdata:
```

- [ ] **Step 2: Criar `iCelula/.env.example`** (referência geral)

```
# Banco
DATABASE_URL="postgresql://icelula:icelula@localhost:5432/icelula?schema=public"
# Auth
JWT_SECRET="troque-este-segredo-em-producao"
# API
API_PORT=3000
```

- [ ] **Step 3: Criar `iCelula/apps/api/.env.example`**

```
DATABASE_URL="postgresql://icelula:icelula@localhost:5432/icelula?schema=public"
JWT_SECRET="dev-secret-troque-em-producao"
API_PORT=3000
```

- [ ] **Step 4: Subir o banco e verificar**

Run: `cd iCelula && docker compose up -d && docker compose ps`
Expected: serviço `icelula-db` com status `running` / `healthy`.

- [ ] **Step 5: Commit**

```bash
cd iCelula
git add docker-compose.yml .env.example apps/api/.env.example
git commit -m "Fase1: Postgres local via Docker + templates de .env

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Package `shared` — schemas zod de autenticação

**Files:**
- Create: `iCelula/packages/shared/package.json`
- Create: `iCelula/packages/shared/src/index.js`
- Create: `iCelula/packages/shared/src/auth.schemas.js`
- Test: `iCelula/packages/shared/src/auth.schemas.test.js`

**Interfaces:**
- Produces:
  - `registerSchema` — zod object `{ nome: string(≥2), email: string.email, senha: string(≥6), qrToken?: string }`
  - `loginSchema` — zod object `{ email: string.email, senha: string(≥1) }`
  - Tipos inferidos exportados como JSDoc (projeto é JS, sem TS).

- [ ] **Step 1: Criar `packages/shared/package.json`**

```json
{
  "name": "@icelula/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Escrever o teste que falha — `packages/shared/src/auth.schemas.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from './auth.schemas.js'

describe('registerSchema', () => {
  it('aceita cadastro válido com qrToken', () => {
    const r = registerSchema.safeParse({
      nome: 'Maria', email: 'maria@ex.com', senha: '123456', qrToken: 'celula-alfa'
    })
    expect(r.success).toBe(true)
  })

  it('aceita cadastro válido sem qrToken', () => {
    const r = registerSchema.safeParse({ nome: 'Ana', email: 'ana@ex.com', senha: '123456' })
    expect(r.success).toBe(true)
  })

  it('rejeita senha curta', () => {
    const r = registerSchema.safeParse({ nome: 'Jo', email: 'jo@ex.com', senha: '123' })
    expect(r.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const r = registerSchema.safeParse({ nome: 'Jo', email: 'nao-email', senha: '123456' })
    expect(r.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('aceita login válido', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', senha: 'x' })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npm install && npm run test --workspace packages/shared`
Expected: FALHA — `Cannot find module './auth.schemas.js'`.

- [ ] **Step 4: Implementar `packages/shared/src/auth.schemas.js`**

```js
import { z } from 'zod'

export const registerSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  qrToken: z.string().min(1).optional()
})

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha')
})
```

- [ ] **Step 5: Criar `packages/shared/src/index.js`**

```js
export * from './auth.schemas.js'
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `npm run test --workspace packages/shared`
Expected: PASS (5 testes).

- [ ] **Step 7: Commit**

```bash
cd iCelula
git add packages/shared package-lock.json
git commit -m "Fase1: package shared com schemas zod de auth (register/login)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Schema Prisma completo + cliente

**Files:**
- Create: `iCelula/apps/api/package.json`
- Create: `iCelula/apps/api/prisma/schema.prisma`
- Create: `iCelula/apps/api/src/prisma.js`

**Interfaces:**
- Produces:
  - Modelos: `User`, `Celula`, `Encontro`, `Presenca`, `PedidoOracao`, `Testemunho`; enums `Papel`, `EncontroStatus`, `PedidoStatus`, `TestemunhoStatus`.
  - `prisma` — PrismaClient singleton exportado de `src/prisma.js`.

- [ ] **Step 1: Criar `apps/api/package.json`**

```json
{
  "name": "@icelula/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate",
    "prisma:seed": "node prisma/seed.js"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "@icelula/shared": "*",
    "@prisma/client": "^6.0.0",
    "bcryptjs": "^2.4.3",
    "fastify": "^5.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Criar `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Papel {
  MEMBRO
  LIDER
  ADMIN
}

enum EncontroStatus {
  AGENDADO
  REALIZADO
  CANCELADO
}

enum PedidoStatus {
  ATIVO
  ATENDIDO
}

enum TestemunhoStatus {
  PENDENTE
  CONCLUIDO
}

model User {
  id           String    @id @default(cuid())
  nome         String
  email        String    @unique
  senhaHash    String
  papel        Papel     @default(MEMBRO)
  celula       Celula?   @relation("MembrosDaCelula", fields: [celulaId], references: [id])
  celulaId     String?
  ativo        Boolean   @default(true)
  ultimoAcesso DateTime?
  criadoEm     DateTime  @default(now())

  celulaLiderada Celula?         @relation("LiderDaCelula")
  presencas      Presenca[]
  pedidos        PedidoOracao[]
  testemunhos    Testemunho[]
}

model Celula {
  id                   String   @id @default(cuid())
  nome                 String
  descricao            String?
  qrToken              String   @unique
  diaSemana            Int      // 0=domingo ... 6=sábado
  frequenciaDias       Int      // ex: 7, 14
  dataPrimeiroEncontro DateTime
  ativa                Boolean  @default(true)
  criadoEm             DateTime @default(now())

  lider     User?   @relation("LiderDaCelula", fields: [liderId], references: [id])
  liderId   String? @unique

  membros     User[]         @relation("MembrosDaCelula")
  encontros   Encontro[]
  pedidos     PedidoOracao[]
  testemunhos Testemunho[]
}

model Encontro {
  id         String         @id @default(cuid())
  celula     Celula         @relation(fields: [celulaId], references: [id], onDelete: Cascade)
  celulaId   String
  data       DateTime
  status     EncontroStatus @default(AGENDADO)
  observacao String?
  criadoEm   DateTime       @default(now())

  presencas Presenca[]

  @@unique([celulaId, data])
}

model Presenca {
  id         String   @id @default(cuid())
  encontro   Encontro @relation(fields: [encontroId], references: [id], onDelete: Cascade)
  encontroId String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  marcadaEm  DateTime @default(now())

  @@unique([encontroId, userId])
}

model PedidoOracao {
  id          String       @id @default(cuid())
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  celula      Celula?      @relation(fields: [celulaId], references: [id], onDelete: SetNull)
  celulaId    String?
  texto       String
  status      PedidoStatus @default(ATIVO)
  criadoEm    DateTime     @default(now())
  atualizadoEm DateTime    @updatedAt
}

model Testemunho {
  id          String           @id @default(cuid())
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  celula      Celula?          @relation(fields: [celulaId], references: [id], onDelete: SetNull)
  celulaId    String?
  status      TestemunhoStatus @default(PENDENTE)
  criadoEm    DateTime         @default(now())
  concluidoEm DateTime?
}
```

- [ ] **Step 3: Criar `apps/api/src/prisma.js`**

```js
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 4: Instalar, gerar cliente e rodar a primeira migração**

Run:
```bash
cd iCelula && npm install
cp apps/api/.env.example apps/api/.env
npm run prisma:migrate --workspace apps/api -- --name init
```
Expected: cria `apps/api/prisma/migrations/*_init/` e aplica no Postgres sem erro; imprime "Your database is now in sync".

- [ ] **Step 5: Commit**

```bash
cd iCelula
git add apps/api/package.json apps/api/prisma apps/api/src/prisma.js package-lock.json
git commit -m "Fase1: schema Prisma completo (User/Celula/Encontro/Presenca/Pedido/Testemunho) + migração init

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: App Fastify + rota de health

**Files:**
- Create: `iCelula/apps/api/src/app.js`
- Create: `iCelula/apps/api/src/server.js`
- Create: `iCelula/apps/api/src/routes/health.js`
- Create: `iCelula/apps/api/vitest.config.js`
- Test: `iCelula/apps/api/src/routes/health.test.js`

**Interfaces:**
- Consumes: nada de tasks anteriores além do package.
- Produces:
  - `buildApp()` → instância Fastify configurada (CORS, JWT, rotas), **sem** `listen`. Usada por testes via `app.inject()`.
  - `GET /health` → `200 { status: 'ok' }`.

- [ ] **Step 1: Criar `apps/api/vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
})
```

- [ ] **Step 2: Escrever o teste que falha — `apps/api/src/routes/health.test.js`**

```js
import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { buildApp } from '../app.js'

let app
beforeAll(async () => { app = buildApp() })
afterAll(async () => { await app.close() })

describe('GET /health', () => {
  it('responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npm run test --workspace apps/api`
Expected: FALHA — `Cannot find module '../app.js'`.

- [ ] **Step 4: Criar `apps/api/src/routes/health.js`**

```js
export async function healthRoutes(app) {
  app.get('/health', async () => ({ status: 'ok' }))
}
```

- [ ] **Step 5: Criar `apps/api/src/app.js`**

```js
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { healthRoutes } from './routes/health.js'

export function buildApp() {
  const app = Fastify({ logger: false })

  app.register(cors, { origin: true })
  app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-troque-em-producao' })

  app.register(healthRoutes)

  return app
}
```

- [ ] **Step 6: Criar `apps/api/src/server.js`**

```js
import { buildApp } from './app.js'

const app = buildApp()
const port = Number(process.env.API_PORT) || 3000

app.listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`iCélula API ouvindo em http://localhost:${port}`))
  .catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 7: Rodar o teste e ver passar**

Run: `npm run test --workspace apps/api`
Expected: PASS (1 teste).

- [ ] **Step 8: Commit**

```bash
cd iCelula
git add apps/api/src apps/api/vitest.config.js
git commit -m "Fase1: app Fastify (buildApp) com CORS, JWT e rota /health

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Utilitário de senha (hash/compare)

**Files:**
- Create: `iCelula/apps/api/src/lib/password.js`
- Test: `iCelula/apps/api/src/lib/password.test.js`

**Interfaces:**
- Produces:
  - `hashSenha(senha: string) → Promise<string>`
  - `verificarSenha(senha: string, hash: string) → Promise<boolean>`

- [ ] **Step 1: Escrever o teste que falha — `apps/api/src/lib/password.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { hashSenha, verificarSenha } from './password.js'

describe('password', () => {
  it('gera hash diferente do texto e valida corretamente', async () => {
    const hash = await hashSenha('segredo123')
    expect(hash).not.toBe('segredo123')
    expect(await verificarSenha('segredo123', hash)).toBe(true)
    expect(await verificarSenha('errada', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test --workspace apps/api`
Expected: FALHA — `Cannot find module './password.js'`.

- [ ] **Step 3: Implementar `apps/api/src/lib/password.js`**

```js
import bcrypt from 'bcryptjs'

const CUSTO = 10

export function hashSenha(senha) {
  return bcrypt.hash(senha, CUSTO)
}

export function verificarSenha(senha, hash) {
  return bcrypt.compare(senha, hash)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test --workspace apps/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd iCelula
git add apps/api/src/lib/password.js apps/api/src/lib/password.test.js
git commit -m "Fase1: utilitário de senha (bcryptjs hash/verify)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Guarda de autenticação e papéis

**Files:**
- Create: `iCelula/apps/api/src/lib/roles.js`
- Test: `iCelula/apps/api/src/lib/roles.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `PAPEL_RANK = { MEMBRO: 1, LIDER: 2, ADMIN: 3 }`
  - `temNivel(papelUsuario, papelMinimo) → boolean` (hierárquico: ADMIN satisfaz LIDER e MEMBRO)
  - `requireRole(papelMinimo) → preHandler Fastify` que: verifica JWT (`request.jwtVerify()`), checa nível e responde `401`/`403` quando falha. Em sucesso, popula `request.usuario = { id, papel, celulaId }` a partir do payload.

- [ ] **Step 1: Escrever o teste que falha — `apps/api/src/lib/roles.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { temNivel, PAPEL_RANK } from './roles.js'

describe('temNivel', () => {
  it('ADMIN satisfaz qualquer nível', () => {
    expect(temNivel('ADMIN', 'MEMBRO')).toBe(true)
    expect(temNivel('ADMIN', 'LIDER')).toBe(true)
    expect(temNivel('ADMIN', 'ADMIN')).toBe(true)
  })
  it('LIDER satisfaz MEMBRO e LIDER, mas não ADMIN', () => {
    expect(temNivel('LIDER', 'MEMBRO')).toBe(true)
    expect(temNivel('LIDER', 'LIDER')).toBe(true)
    expect(temNivel('LIDER', 'ADMIN')).toBe(false)
  })
  it('MEMBRO só satisfaz MEMBRO', () => {
    expect(temNivel('MEMBRO', 'MEMBRO')).toBe(true)
    expect(temNivel('MEMBRO', 'LIDER')).toBe(false)
  })
  it('expõe ranking', () => {
    expect(PAPEL_RANK).toEqual({ MEMBRO: 1, LIDER: 2, ADMIN: 3 })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test --workspace apps/api`
Expected: FALHA — `Cannot find module './roles.js'`.

- [ ] **Step 3: Implementar `apps/api/src/lib/roles.js`**

```js
export const PAPEL_RANK = { MEMBRO: 1, LIDER: 2, ADMIN: 3 }

export function temNivel(papelUsuario, papelMinimo) {
  return (PAPEL_RANK[papelUsuario] || 0) >= (PAPEL_RANK[papelMinimo] || 0)
}

export function requireRole(papelMinimo) {
  return async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ erro: 'Não autenticado' })
    }
    const { id, papel, celulaId } = request.user
    if (!temNivel(papel, papelMinimo)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }
    request.usuario = { id, papel, celulaId }
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test --workspace apps/api`
Expected: PASS (4 asserts no bloco).

- [ ] **Step 5: Commit**

```bash
cd iCelula
git add apps/api/src/lib/roles.js apps/api/src/lib/roles.test.js
git commit -m "Fase1: guarda de papéis (temNivel + requireRole hierárquico)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Rotas de autenticação (register, login, me)

**Files:**
- Create: `iCelula/apps/api/src/routes/auth.js`
- Modify: `iCelula/apps/api/src/app.js` (registrar `authRoutes`)
- Test: `iCelula/apps/api/src/routes/auth.test.js`

**Interfaces:**
- Consumes: `registerSchema`, `loginSchema` (`@icelula/shared`); `hashSenha`, `verificarSenha` (`../lib/password.js`); `requireRole` (`../lib/roles.js`); `prisma` (`../prisma.js`).
- Produces:
  - `POST /auth/register` body `{ nome, email, senha, qrToken? }` → `201 { token, usuario }`. Se `qrToken` informado e válido, vincula `celulaId` e papel `MEMBRO`. E-mail duplicado → `409`. Body inválido → `400`. qrToken inexistente → `404`.
  - `POST /auth/login` body `{ email, senha }` → `200 { token, usuario }`; atualiza `ultimoAcesso`. Credenciais inválidas → `401`. Usuário inativo → `403`.
  - `GET /auth/me` (requer JWT) → `200 { usuario }`.
  - `usuario` nas respostas NUNCA inclui `senhaHash`.
  - `authRoutes(app)` registrado em `buildApp()`.

> **Nota de teste:** este arquivo de teste acessa o banco. Os testes usam e-mails únicos por execução (sufixo de timestamp passado no corpo) para evitar colisão e podem rodar contra o Postgres local já migrado.

- [ ] **Step 1: Escrever o teste que falha — `apps/api/src/routes/auth.test.js`**

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'

let app
const sufixo = Date.now()
const email = `teste${sufixo}@ex.com`

beforeAll(async () => { app = buildApp() })
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } })
  await app.close()
  await prisma.$disconnect()
})

describe('auth', () => {
  it('rejeita cadastro inválido (400)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'X', email: 'nao-email', senha: '123' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('cadastra um membro sem qrToken (201) e não vaza senhaHash', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Teste', email, senha: '123456' }
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toBeTypeOf('string')
    expect(body.usuario.email).toBe(email)
    expect(body.usuario.papel).toBe('MEMBRO')
    expect(body.usuario.senhaHash).toBeUndefined()
  })

  it('rejeita e-mail duplicado (409)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { nome: 'Teste', email, senha: '123456' }
    })
    expect(res.statusCode).toBe(409)
  })

  it('faz login (200) e acessa /auth/me com o token', async () => {
    const login = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email, senha: '123456' }
    })
    expect(login.statusCode).toBe(200)
    const token = login.json().token

    const me = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(me.statusCode).toBe(200)
    expect(me.json().usuario.email).toBe(email)
  })

  it('rejeita login com senha errada (401)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email, senha: 'errada' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('bloqueia /auth/me sem token (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run db:up && npm run test --workspace apps/api`
Expected: FALHA — rota `/auth/register` retorna 404 (não existe).

- [ ] **Step 3: Implementar `apps/api/src/routes/auth.js`**

```js
import { registerSchema, loginSchema } from '@icelula/shared'
import { prisma } from '../prisma.js'
import { hashSenha, verificarSenha } from '../lib/password.js'
import { requireRole } from '../lib/roles.js'

function publico(user) {
  const { senhaHash, ...resto } = user
  return resto
}

function assinarToken(app, user) {
  return app.jwt.sign({ id: user.id, papel: user.papel, celulaId: user.celulaId })
}

export async function authRoutes(app) {
  app.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhes: parsed.error.issues })
    }
    const { nome, email, senha, qrToken } = parsed.data

    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) return reply.code(409).send({ erro: 'E-mail já cadastrado' })

    let celulaId = null
    if (qrToken) {
      const celula = await prisma.celula.findUnique({ where: { qrToken } })
      if (!celula) return reply.code(404).send({ erro: 'Célula não encontrada' })
      celulaId = celula.id
    }

    const user = await prisma.user.create({
      data: { nome, email, senhaHash: await hashSenha(senha), papel: 'MEMBRO', celulaId }
    })
    return reply.code(201).send({ token: assinarToken(app, user), usuario: publico(user) })
  })

  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { email, senha } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(401).send({ erro: 'Credenciais inválidas' })
    if (!user.ativo) return reply.code(403).send({ erro: 'Usuário desativado' })
    if (!(await verificarSenha(senha, user.senhaHash))) {
      return reply.code(401).send({ erro: 'Credenciais inválidas' })
    }

    const atualizado = await prisma.user.update({
      where: { id: user.id }, data: { ultimoAcesso: new Date() }
    })
    return reply.send({ token: assinarToken(app, atualizado), usuario: publico(atualizado) })
  })

  app.get('/auth/me', { preHandler: requireRole('MEMBRO') }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.usuario.id } })
    if (!user) return reply.code(404).send({ erro: 'Usuário não encontrado' })
    return reply.send({ usuario: publico(user) })
  })
}
```

- [ ] **Step 4: Registrar as rotas em `apps/api/src/app.js`**

Substituir o bloco de registro de rotas para incluir `authRoutes`:

```js
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'

export function buildApp() {
  const app = Fastify({ logger: false })

  app.register(cors, { origin: true })
  app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-troque-em-producao' })

  app.register(healthRoutes)
  app.register(authRoutes)

  return app
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run test --workspace apps/api`
Expected: PASS (todos os testes de health + auth).

- [ ] **Step 6: Commit**

```bash
cd iCelula
git add apps/api/src/routes/auth.js apps/api/src/app.js apps/api/src/routes/auth.test.js
git commit -m "Fase1: rotas de autenticação (register/login/me) com JWT e vínculo de célula via qrToken

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Seed do admin + célula de exemplo

**Files:**
- Create: `iCelula/apps/api/prisma/seed.js`

**Interfaces:**
- Consumes: `prisma` (`../src/prisma.js`), `hashSenha` (`../src/lib/password.js`).
- Produces: ao rodar o seed, garante (idempotente) um `ADMIN` (`admin@icelula.app` / senha `admin123`) e uma `Celula` de exemplo `qrToken = 'celula-exemplo'`.

- [ ] **Step 1: Implementar `apps/api/prisma/seed.js`**

```js
import { prisma } from '../src/prisma.js'
import { hashSenha } from '../src/lib/password.js'

async function main() {
  const adminEmail = 'admin@icelula.app'
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nome: 'Administrador',
      email: adminEmail,
      senhaHash: await hashSenha('admin123'),
      papel: 'ADMIN'
    }
  })

  await prisma.celula.upsert({
    where: { qrToken: 'celula-exemplo' },
    update: {},
    create: {
      nome: 'Célula Exemplo',
      descricao: 'Célula criada pelo seed para testes',
      qrToken: 'celula-exemplo',
      diaSemana: 4, // quinta-feira
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2026-07-02T19:30:00')
    }
  })

  console.log(`Seed concluído. Admin: ${admin.email} / senha: admin123`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
```

- [ ] **Step 2: Rodar o seed**

Run: `npm run prisma:seed --workspace apps/api`
Expected: imprime "Seed concluído. Admin: admin@icelula.app / senha: admin123".

- [ ] **Step 3: Verificar login do admin manualmente (servidor em outra aba)**

Run:
```bash
npm run dev:api &
sleep 2
curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@icelula.app","senha":"admin123"}' | head -c 200
```
Expected: JSON com `token` e `usuario.papel = "ADMIN"`. (Encerrar o servidor depois.)

- [ ] **Step 4: Commit**

```bash
cd iCelula
git add apps/api/prisma/seed.js
git commit -m "Fase1: seed idempotente (admin + célula de exemplo)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Cobertura do spec (Fase 1):**
- Monorepo (web/api/shared) → Tasks 1, 3, 4 (web entra na Fase 2). ✅
- Docker Postgres → Task 2. ✅
- Modelo de dados completo (6 modelos + enums) → Task 4. ✅
- Papéis hierárquicos (Membro/Líder/Admin, Admin⊃Líder⊃Membro) → Task 7. ✅
- Auth JWT + bcrypt, sem vazar senha → Tasks 6, 8. ✅
- Fluxo QR Code (vínculo de célula no cadastro via qrToken) → Task 8 (backend); UI na Fase 2. ✅
- Seed inicial do admin → Task 9. ✅
- localhost only, sem deploy → Constraints + Task 2/5. ✅
- Itens de Pedidos/Testemunhos/Encontros/Presença/Dashboards: **fora da Fase 1** por design (Fases 3–5), mas o schema que os suporta já é criado na Task 4. ✅

**2. Placeholders:** Nenhum "TBD/TODO". Todo código está presente. ✅

**3. Consistência de tipos/nomes:**
- `buildApp()` definido na Task 5, consumido nas Tasks 5 e 8. ✅
- `hashSenha`/`verificarSenha` (Task 6) consumidos em Task 8 e 9. ✅
- `requireRole` (Task 7) consumido em Task 8 (`/auth/me`). ✅
- `registerSchema`/`loginSchema` (Task 3) consumidos em Task 8. ✅
- `prisma` (Task 4) consumido em Tasks 8 e 9. ✅
- Campos do schema (`senhaHash`, `celulaId`, `qrToken`, `papel`, `ativo`, `ultimoAcesso`) usados consistentemente. ✅

Plano consistente. Pronto para execução.
