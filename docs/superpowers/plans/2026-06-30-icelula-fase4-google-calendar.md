# iCélula — Fase 4: Integração Google Calendar (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vincular contas Google ao iCélula e espelhar, num calendário dedicado "iCélula", os encontros da célula de cada membro vinculado — com sincronização one-way (plataforma→Google) que propaga criações/edições/cancelamentos.

**Architecture:** Backend Fastify/Prisma (ESM). Toda comunicação com a API do Google fica atrás de um **seam injetável** (`google/api.js` → `getGoogleApi()` / `setGoogleApiParaTestes()`), permitindo testes sem rede com um cliente **mockado**. Refresh tokens são cifrados em repouso (AES-256-GCM). A feature fica **desligada por flag** (`GOOGLE_OAUTH_ENABLED`) até as credenciais existirem. O sync é best-effort: falhas no Google nunca quebram a operação principal.

**Tech Stack:** Fastify 5, Prisma 6 + PostgreSQL, `googleapis` (Node), `crypto` nativo (AES-256-GCM), Vitest 3.

## Global Constraints

- ESM. Mensagens/erros em português.
- Feature atrás de `GOOGLE_OAUTH_ENABLED`; quando off, rotas Google → `503 { erro: 'Integração Google não configurada' }` e o front oculta os botões. **Construir e mergear com a flag OFF** (default).
- Escopos OAuth: `openid email profile https://www.googleapis.com/auth/calendar`.
- Refresh token sempre cifrado (AES-256-GCM, `TOKEN_ENC_KEY`); **nunca** retornado em resposta.
- Sync **one-way** plataforma→Google, **best-effort** (try/catch + log; nunca propaga exceção para a rota principal).
- Calendário dedicado **"iCélula"** (timezone `America/Sao_Paulo`); evento: `summary = "Encontro — <nome da célula>"`, início = `encontro.data`, fim = +90min.
- Testes **sem rede**: sempre via `setGoogleApiParaTestes(fake)`. Saída pristine; banco limpo (cleanup FK-safe, guards contra `undefined`).
- Reaproveitar padrões existentes (`requireRole`, `publico()` de `lib/usuarios.js`, validação zod, `app.jwt`).
- Commits em português terminando com: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- TDD: teste primeiro (RED), implementação (GREEN), suíte limpa antes de commitar.

## File Structure

```
apps/api/src/
├── lib/
│   ├── google/
│   │   ├── cripto.js          # cifrar/decifrar (AES-256-GCM)            [T2]
│   │   ├── config.js          # leitura de env + googleHabilitado()      [T3]
│   │   ├── evento.js          # montarEvento(encontro, nomeCelula) puro  [T4]
│   │   └── api.js             # seam injetável + impl. real (googleapis)  [T4]
│   └── sync/
│       └── calendarSync.js    # backfill + propagação                     [T5]
├── routes/
│   ├── config.js              # GET /config → { googleHabilitado }       [T3]
│   └── googleAuth.js          # /auth/google, /callback, DELETE /google  [T6]
├── app.js                     # registrar configRoutes, googleAuthRoutes [T3,T6]
prisma/schema.prisma           # campos no User + GoogleEventoSync         [T1]
apps/web/src/...               # botões Google + página de sucesso        [T8]
```

---

### Task 1: Schema (campos Google no User + GoogleEventoSync) e guarda de login

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/routes/auth.js` (login: tratar conta sem senha)
- Test: `apps/api/src/routes/auth.test.js` (adicionar caso)

**Interfaces:**
- Produces: `User.googleSub?`, `User.googleRefreshTokenEnc?`, `User.googleCalendarId?`,
  `User.googleConectado Boolean @default(false)`, `User.senhaHash` agora **opcional**.
  Novo model `GoogleEventoSync { id, userId, encontroId, googleEventId, criadoEm, @@unique([userId, encontroId]) }`
  com relações `onDelete: Cascade` para `User` e `Encontro`, e back-relations `googleEventos` em ambos.

- [ ] **Step 1: Editar `schema.prisma`** — tornar `senhaHash` opcional e adicionar os campos/relations:

No `model User`, trocar `senhaHash String` por `senhaHash String?` e adicionar:
```prisma
  googleSub             String?  @unique
  googleRefreshTokenEnc String?
  googleCalendarId      String?
  googleConectado       Boolean  @default(false)
  googleEventos         GoogleEventoSync[]
```
No `model Encontro`, adicionar a back-relation:
```prisma
  googleEventos GoogleEventoSync[]
```
Novo model ao final:
```prisma
model GoogleEventoSync {
  id            String   @id @default(cuid())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String
  encontro      Encontro @relation(fields: [encontroId], references: [id], onDelete: Cascade)
  encontroId    String
  googleEventId String
  criadoEm      DateTime @default(now())

  @@unique([userId, encontroId])
}
```

- [ ] **Step 2: Criar a migração**

Run: `npm run prisma:migrate --workspace apps/api -- --name google_calendar`
Expected: cria `prisma/migrations/*_google_calendar/` e "Your database is now in sync".

- [ ] **Step 3: Escrever o teste de login passwordless — adicionar em `auth.test.js`**

```js
it('login de conta sem senha (Google) orienta a entrar com Google (401)', async () => {
  const emailG = `google-only-${sufixo}@ex.com`
  await prisma.user.create({
    data: { nome: 'Conta Google', email: emailG, papel: 'MEMBRO', googleConectado: true }
  })
  const res = await app.inject({
    method: 'POST', url: '/auth/login', payload: { email: emailG, senha: 'qualquer' }
  })
  expect(res.statusCode).toBe(401)
  expect(res.json().erro).toMatch(/Google/i)
  await prisma.user.deleteMany({ where: { email: emailG } })
})
```

- [ ] **Step 4: Rodar e ver falhar** — `npm run db:up && npm run test --workspace apps/api` → o login provavelmente quebra (compara `verificarSenha` com `null`).

- [ ] **Step 5: Ajustar `auth.js` login** — antes de comparar a senha, tratar conta sem `senhaHash`:

```js
    if (!user.senhaHash) {
      return reply.code(401).send({ erro: 'Esta conta usa login com Google. Entre com Google.' })
    }
```
(inserir logo após o check de `!user.ativo` e antes de `verificarSenha`).

- [ ] **Step 6: Rodar e ver passar.** **Step 7: Commit** `Fase4: schema Google (User + GoogleEventoSync) + guarda de login sem senha`.

---

### Task 2: Cifragem de refresh token (AES-256-GCM)

**Files:**
- Create: `apps/api/src/lib/google/cripto.js`
- Test: `apps/api/src/lib/google/cripto.test.js`

**Interfaces:**
- Produces:
  - `cifrar(texto: string, chaveHex: string) → string` — formato `ivHex:tagHex:cipherHex`.
  - `decifrar(blob: string, chaveHex: string) → string`.
  - `chaveDeAmbiente() → Buffer` — lê `TOKEN_ENC_KEY` (hex de 32 bytes); lança se ausente/curta.

- [ ] **Step 1: Teste — `cripto.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { cifrar, decifrar } from './cripto.js'

const CHAVE = '0'.repeat(64) // 32 bytes em hex

describe('cripto AES-256-GCM', () => {
  it('cifra e decifra de volta (round-trip)', () => {
    const blob = cifrar('refresh-token-secreto', CHAVE)
    expect(blob).not.toContain('refresh-token-secreto')
    expect(blob.split(':')).toHaveLength(3)
    expect(decifrar(blob, CHAVE)).toBe('refresh-token-secreto')
  })

  it('produz saídas diferentes a cada chamada (IV aleatório)', () => {
    expect(cifrar('x', CHAVE)).not.toBe(cifrar('x', CHAVE))
  })

  it('falha ao decifrar com chave errada', () => {
    const blob = cifrar('x', CHAVE)
    expect(() => decifrar(blob, '1'.repeat(64))).toThrow()
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Implementar `cripto.js`**

```js
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'

export function cifrar(texto, chaveHex) {
  const chave = Buffer.from(chaveHex, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, chave, iv)
  const enc = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decifrar(blob, chaveHex) {
  const chave = Buffer.from(chaveHex, 'hex')
  const [ivHex, tagHex, encHex] = blob.split(':')
  const decipher = createDecipheriv(ALGO, chave, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8')
}

export function chaveDeAmbiente() {
  const k = process.env.TOKEN_ENC_KEY || ''
  if (k.length < 64) throw new Error('TOKEN_ENC_KEY ausente ou curta (esperado 32 bytes em hex)')
  return k
}
```

- [ ] **Step 4: GREEN.** **Step 5: Commit** `Fase4: cifragem AES-256-GCM de refresh tokens`.

---

### Task 3: Config/feature-flag + rota GET /config

**Files:**
- Create: `apps/api/src/lib/google/config.js`
- Create: `apps/api/src/routes/config.js`
- Modify: `apps/api/src/app.js` (registrar `configRoutes`)
- Test: `apps/api/src/routes/config.test.js`

**Interfaces:**
- Produces:
  - `googleHabilitado() → boolean` — `true` se `GOOGLE_OAUTH_ENABLED === 'true'` e `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` presentes.
  - `googleConfig() → { clientId, clientSecret, redirectUri, webUrl }` (lê env).
  - `GET /config` → `200 { googleHabilitado: boolean }` (público).

- [ ] **Step 1: Teste — `config.test.js`**

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'

let app
beforeAll(async () => { app = buildApp(); await app.ready() })
afterAll(async () => { await app.close() })

describe('GET /config', () => {
  it('expõe googleHabilitado como boolean', async () => {
    const res = await app.inject({ method: 'GET', url: '/config' })
    expect(res.statusCode).toBe(200)
    expect(typeof res.json().googleHabilitado).toBe('boolean')
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Implementar `config.js`**

```js
export function googleHabilitado() {
  return (
    process.env.GOOGLE_OAUTH_ENABLED === 'true' &&
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET
  )
}

export function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    webUrl: process.env.WEB_URL || 'http://localhost:5173'
  }
}
```

- [ ] **Step 4: Implementar `routes/config.js`**

```js
import { googleHabilitado } from '../lib/google/config.js'

export async function configRoutes(app) {
  app.get('/config', async () => ({ googleHabilitado: googleHabilitado() }))
}
```

- [ ] **Step 5: Registrar em `app.js`** — `import { configRoutes } from './routes/config.js'` e `app.register(configRoutes)`.

- [ ] **Step 6: GREEN.** **Step 7: Commit** `Fase4: feature-flag googleHabilitado + GET /config`.

---

### Task 4: Seam do cliente Google (`api.js`) + montagem de evento (`evento.js`)

**Files:**
- Create: `apps/api/src/lib/google/evento.js`
- Create: `apps/api/src/lib/google/api.js`
- Test: `apps/api/src/lib/google/evento.test.js`

**Interfaces:**
- Produces (`evento.js`):
  - `montarEvento(encontro, nomeCelula) → { summary, description, start, end }` (puro).
    `summary = "Encontro — <nomeCelula>"`; `start.dateTime = encontro.data` ISO, `timeZone='America/Sao_Paulo'`;
    `end.dateTime = data + 90min`; `description = encontro.observacao || ''`.
- Produces (`api.js`): um objeto com a interface abaixo, e os hooks de injeção:
  - `getGoogleApi() → GoogleApi` (retorna o mock se setado, senão a impl. real).
  - `setGoogleApiParaTestes(fake)` e `limparGoogleApiParaTestes()`.
  - **GoogleApi** (métodos `async`):
    - `montarAuthUrl({ state }) → string`
    - `trocarCode(code) → { sub, email, nome, refreshToken }`
    - `accessTokenDe(refreshToken) → string`
    - `garantirCalendario(accessToken, calendarIdExistente?) → calendarId`
    - `criarEvento(accessToken, calendarId, evento) → googleEventId`
    - `atualizarEvento(accessToken, calendarId, googleEventId, evento) → void`
    - `removerEvento(accessToken, calendarId, googleEventId) → void`

> A implementação **real** em `api.js` é glue fino sobre `googleapis` (OAuth2 + Calendar v3) e **não** é coberta por testes unitários (precisa de rede); ela só é exercitada quando as credenciais reais existirem. Tudo que a consome é testado via `setGoogleApiParaTestes`.

- [ ] **Step 1: Teste — `evento.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { montarEvento } from './evento.js'

describe('montarEvento', () => {
  it('monta o evento com título, fuso e duração de 90min', () => {
    const ev = montarEvento(
      { data: new Date('2026-07-02T19:30:00Z'), observacao: 'Tema: gratidão' },
      'Célula Esperança'
    )
    expect(ev.summary).toBe('Encontro — Célula Esperança')
    expect(ev.description).toBe('Tema: gratidão')
    expect(ev.start.timeZone).toBe('America/Sao_Paulo')
    expect(new Date(ev.end.dateTime) - new Date(ev.start.dateTime)).toBe(90 * 60 * 1000)
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Implementar `evento.js`**

```js
const TZ = 'America/Sao_Paulo'
const DURACAO_MS = 90 * 60 * 1000

export function montarEvento(encontro, nomeCelula) {
  const inicio = new Date(encontro.data)
  const fim = new Date(inicio.getTime() + DURACAO_MS)
  return {
    summary: `Encontro — ${nomeCelula}`,
    description: encontro.observacao || '',
    start: { dateTime: inicio.toISOString(), timeZone: TZ },
    end: { dateTime: fim.toISOString(), timeZone: TZ }
  }
}
```

- [ ] **Step 4: Implementar `api.js`** (seam + impl. real)

```js
import { google } from 'googleapis'
import { googleConfig } from './config.js'

const ESCOPOS = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar']

function oauthClient() {
  const { clientId, clientSecret, redirectUri } = googleConfig()
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

const googleApiReal = {
  async montarAuthUrl({ state }) {
    return oauthClient().generateAuthUrl({
      access_type: 'offline', prompt: 'consent', scope: ESCOPOS, state
    })
  },
  async trocarCode(code) {
    const cli = oauthClient()
    const { tokens } = await cli.getToken(code)
    cli.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: cli })
    const { data } = await oauth2.userinfo.get()
    return { sub: data.id, email: data.email, nome: data.name, refreshToken: tokens.refresh_token }
  },
  async accessTokenDe(refreshToken) {
    const cli = oauthClient()
    cli.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await cli.refreshAccessToken()
    return credentials.access_token
  },
  async garantirCalendario(accessToken, calendarIdExistente) {
    if (calendarIdExistente) return calendarIdExistente
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    const { data } = await cal.calendars.insert({
      requestBody: { summary: 'iCélula', timeZone: 'America/Sao_Paulo' }
    })
    return data.id
  },
  async criarEvento(accessToken, calendarId, evento) {
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    const { data } = await cal.events.insert({ calendarId, requestBody: evento })
    return data.id
  },
  async atualizarEvento(accessToken, calendarId, googleEventId, evento) {
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    await cal.events.update({ calendarId, eventId: googleEventId, requestBody: evento })
  },
  async removerEvento(accessToken, calendarId, googleEventId) {
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    await cal.events.delete({ calendarId, eventId: googleEventId }).catch(() => {})
  }
}

let apiInjetada = null
export function getGoogleApi() { return apiInjetada || googleApiReal }
export function setGoogleApiParaTestes(fake) { apiInjetada = fake }
export function limparGoogleApiParaTestes() { apiInjetada = null }
```

- [ ] **Step 5: Instalar `googleapis`** — `npm install googleapis --workspace apps/api`.

- [ ] **Step 6: GREEN** (`evento.test.js`).  **Step 7: Commit** `Fase4: seam injetável do cliente Google + montagem de evento`.

---

### Task 5: Motor de sincronização (`calendarSync.js`)

**Files:**
- Create: `apps/api/src/lib/sync/calendarSync.js`
- Test: `apps/api/src/lib/sync/calendarSync.test.js`

**Interfaces:**
- Consumes: `prisma`, `getGoogleApi()` (`../google/api.js`), `montarEvento` (`../google/evento.js`),
  `decifrar` (`../google/cripto.js`), `googleConfig` (`../google/config.js`).
- Produces (todas `async`, **best-effort**: capturam exceção por usuário/evento e seguem):
  - `sincronizarMembro(userId)` — backfill: cria evento Google p/ cada encontro não-cancelado da célula do membro vinculado que ainda não tem `GoogleEventoSync`.
  - `sincronizarEncontro(encontroId)` — para o encontro, percorre membros vinculados da célula: cria/atualiza o evento; se `CANCELADO`, remove.
  - `removerEncontro(encontroId)` — remove os eventos Google de todos os membros e os `GoogleEventoSync` do encontro.
  - `removerMembro(userId)` — remove os eventos Google do membro e seus `GoogleEventoSync`.
  - `accessTokenDoMembro(user) → string|null` — decifra o refresh token e obtém access token (helper interno exportado p/ teste).

> Só processa membros com `googleConectado === true` e `googleCalendarId` + `googleRefreshTokenEnc` presentes. Se `accessTokenDe` falhar (token revogado), marca `googleConectado=false` e pula.

- [ ] **Step 1: Teste — `calendarSync.test.js`** (fake api + DB real)

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../../prisma.js'
import { setGoogleApiParaTestes, limparGoogleApiParaTestes } from '../google/api.js'
import { sincronizarMembro, sincronizarEncontro, removerEncontro } from './calendarSync.js'
import { cifrar } from '../google/cripto.js'

const CHAVE = '0'.repeat(64)
const sufixo = Date.now()
let chamadas
let celulaId, membroId, encontroId

function fakeApi() {
  return {
    async accessTokenDe() { return 'access-fake' },
    async criarEvento() { chamadas.criar++; return `gev-${chamadas.criar}` },
    async atualizarEvento() { chamadas.atualizar++ },
    async removerEvento() { chamadas.remover++ }
  }
}

beforeEach(async () => {
  process.env.TOKEN_ENC_KEY = CHAVE
  chamadas = { criar: 0, atualizar: 0, remover: 0 }
  setGoogleApiParaTestes(fakeApi())
  const celula = await prisma.celula.create({
    data: { nome: 'Cél Sync', qrToken: `qr-sync-${sufixo}-${Math.floor(performance.now())}`,
      diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: new Date() }
  })
  celulaId = celula.id
  const membro = await prisma.user.create({
    data: { nome: 'M', email: `m-${sufixo}-${chamadas.criar}-${celulaId}@ex.com`, senhaHash: 'x',
      papel: 'MEMBRO', celulaId, googleConectado: true, googleCalendarId: 'cal-icelula',
      googleRefreshTokenEnc: cifrar('refresh', CHAVE) }
  })
  membroId = membro.id
  const enc = await prisma.encontro.create({ data: { celulaId, data: new Date() } })
  encontroId = enc.id
})

afterEach(async () => {
  await prisma.googleEventoSync.deleteMany({ where: { userId: membroId } }).catch(() => {})
  await prisma.encontro.deleteMany({ where: { celulaId } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: membroId } }).catch(() => {})
  await prisma.celula.deleteMany({ where: { id: celulaId } }).catch(() => {})
  limparGoogleApiParaTestes()
})

describe('calendarSync', () => {
  it('sincronizarMembro cria evento e grava GoogleEventoSync (idempotente)', async () => {
    await sincronizarMembro(membroId)
    expect(chamadas.criar).toBe(1)
    const map = await prisma.googleEventoSync.findFirst({ where: { userId: membroId, encontroId } })
    expect(map.googleEventId).toBe('gev-1')
    await sincronizarMembro(membroId) // não recria
    expect(chamadas.criar).toBe(1)
  })

  it('sincronizarEncontro atualiza quando já existe mapeamento', async () => {
    await sincronizarMembro(membroId)
    await sincronizarEncontro(encontroId)
    expect(chamadas.atualizar).toBe(1)
  })

  it('removerEncontro apaga evento e mapeamento', async () => {
    await sincronizarMembro(membroId)
    await removerEncontro(encontroId)
    expect(chamadas.remover).toBe(1)
    const map = await prisma.googleEventoSync.findFirst({ where: { encontroId } })
    expect(map).toBeNull()
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Implementar `calendarSync.js`**

```js
import { prisma } from '../../prisma.js'
import { getGoogleApi } from '../google/api.js'
import { montarEvento } from '../google/evento.js'
import { decifrar, chaveDeAmbiente } from '../google/cripto.js'

function vinculado(user) {
  return user?.googleConectado && user.googleCalendarId && user.googleRefreshTokenEnc
}

export async function accessTokenDoMembro(user) {
  if (!vinculado(user)) return null
  try {
    const refresh = decifrar(user.googleRefreshTokenEnc, chaveDeAmbiente())
    return await getGoogleApi().accessTokenDe(refresh)
  } catch {
    await prisma.user.update({ where: { id: user.id }, data: { googleConectado: false } }).catch(() => {})
    return null
  }
}

export async function sincronizarMembro(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!vinculado(user) || !user.celulaId) return
  const token = await accessTokenDoMembro(user)
  if (!token) return
  const celula = await prisma.celula.findUnique({ where: { id: user.celulaId } })
  const encontros = await prisma.encontro.findMany({
    where: { celulaId: user.celulaId, status: { not: 'CANCELADO' } }
  })
  const api = getGoogleApi()
  for (const enc of encontros) {
    const existe = await prisma.googleEventoSync.findUnique({
      where: { userId_encontroId: { userId, encontroId: enc.id } }
    })
    if (existe) continue
    try {
      const gid = await api.criarEvento(token, user.googleCalendarId, montarEvento(enc, celula.nome))
      await prisma.googleEventoSync.create({ data: { userId, encontroId: enc.id, googleEventId: gid } })
    } catch (e) { console.error('sync criar falhou', e?.message) }
  }
}

export async function sincronizarEncontro(encontroId) {
  const enc = await prisma.encontro.findUnique({ where: { id: encontroId }, include: { celula: true } })
  if (!enc) return
  if (enc.status === 'CANCELADO') return removerEncontro(encontroId)
  const membros = await prisma.user.findMany({ where: { celulaId: enc.celulaId, googleConectado: true } })
  const api = getGoogleApi()
  for (const user of membros) {
    const token = await accessTokenDoMembro(user)
    if (!token) continue
    const map = await prisma.googleEventoSync.findUnique({
      where: { userId_encontroId: { userId: user.id, encontroId } }
    })
    const evento = montarEvento(enc, enc.celula.nome)
    try {
      if (map) {
        await api.atualizarEvento(token, user.googleCalendarId, map.googleEventId, evento)
      } else {
        const gid = await api.criarEvento(token, user.googleCalendarId, evento)
        await prisma.googleEventoSync.create({ data: { userId: user.id, encontroId, googleEventId: gid } })
      }
    } catch (e) { console.error('sync encontro falhou', e?.message) }
  }
}

export async function removerEncontro(encontroId) {
  const maps = await prisma.googleEventoSync.findMany({
    where: { encontroId }, include: { user: true }
  })
  const api = getGoogleApi()
  for (const map of maps) {
    const token = await accessTokenDoMembro(map.user)
    if (token) {
      try { await api.removerEvento(token, map.user.googleCalendarId, map.googleEventId) }
      catch (e) { console.error('sync remover falhou', e?.message) }
    }
  }
  await prisma.googleEventoSync.deleteMany({ where: { encontroId } })
}

export async function removerMembro(userId) {
  const maps = await prisma.googleEventoSync.findMany({ where: { userId } })
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const token = user ? await accessTokenDoMembro(user) : null
  const api = getGoogleApi()
  if (token) {
    for (const map of maps) {
      try { await api.removerEvento(token, user.googleCalendarId, map.googleEventId) }
      catch (e) { console.error('sync remover membro falhou', e?.message) }
    }
  }
  await prisma.googleEventoSync.deleteMany({ where: { userId } })
}
```

- [ ] **Step 4: GREEN** (suíte completa).  **Step 5: Commit** `Fase4: motor de sincronização Google Calendar (backfill + propagação)`.

---

### Task 6: Rotas de OAuth (`googleAuth.js`)

**Files:**
- Create: `apps/api/src/routes/googleAuth.js`
- Modify: `apps/api/src/app.js` (registrar `googleAuthRoutes`)
- Test: `apps/api/src/routes/googleAuth.test.js`

**Interfaces:**
- Consumes: `getGoogleApi()`, `googleHabilitado`/`googleConfig`, `cifrar`/`chaveDeAmbiente`,
  `requireRole`, `prisma`, `app.jwt`, `sincronizarMembro` (`../lib/sync/calendarSync.js`).
- Produces:
  - `GET /auth/google?contexto=login|conectar&qrToken=...` → se flag off, `503`. Monta `state`
    assinado (`app.jwt.sign({ contexto, qrToken?, userId? }, { expiresIn:'10m' })`; para `conectar`
    exige JWT do usuário e embute `userId`) e retorna `200 { url }` (a `url` vem de `montarAuthUrl`).
  - `GET /auth/google/callback?code&state` → valida `state` (`app.jwt.verify`); `trocarCode(code)`;
    resolve usuário (por `googleSub`; senão por `email`; senão cria `MEMBRO` com `celulaId` do `qrToken`,
    sem senha); cifra e salva `googleRefreshTokenEnc`; `garantirCalendario` → salva `googleCalendarId`;
    `googleConectado=true`. Dispara `sincronizarMembro(user.id)` best-effort. Emite JWT do iCélula e
    **redireciona 302** para `${webUrl}/auth/google/sucesso#token=<jwt>`.
  - `DELETE /google` (requireRole('MEMBRO')) → `removerMembro` best-effort, limpa
    `googleRefreshTokenEnc`/`googleCalendarId`/`googleSub?`/`googleConectado=false`. → `200 { ok: true }`.
  - Quando flag off, todas → `503 { erro: 'Integração Google não configurada' }`.

> Padrão: seguir `auth.js`. Não vazar `senhaHash`/tokens. Validar `contexto` com zod.

- [ ] **Step 1: Teste — `googleAuth.test.js`** (fake api; setar env da flag dentro do teste)

```js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { setGoogleApiParaTestes, limparGoogleApiParaTestes } from '../lib/google/api.js'

let app
const sufixo = Date.now()
const subGoogle = `sub-${sufixo}`
const emailGoogle = `novo-${sufixo}@gmail.com`

beforeAll(async () => {
  process.env.GOOGLE_OAUTH_ENABLED = 'true'
  process.env.GOOGLE_CLIENT_ID = 'cid'
  process.env.GOOGLE_CLIENT_SECRET = 'sec'
  process.env.TOKEN_ENC_KEY = '0'.repeat(64)
  process.env.WEB_URL = 'http://localhost:5173'
  app = buildApp(); await app.ready()
})
beforeEach(() => {
  setGoogleApiParaTestes({
    async montarAuthUrl({ state }) { return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` },
    async trocarCode() { return { sub: subGoogle, email: emailGoogle, nome: 'Novo Usuário', refreshToken: 'rt' } },
    async accessTokenDe() { return 'at' },
    async garantirCalendario() { return 'cal-icelula' },
    async criarEvento() { return 'gev' },
    async atualizarEvento() {}, async removerEvento() {}
  })
})
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: emailGoogle } })
  await app.close(); limparGoogleApiParaTestes()
  delete process.env.GOOGLE_OAUTH_ENABLED
})

describe('OAuth Google', () => {
  it('GET /auth/google retorna a url de consentimento', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
    expect(res.statusCode).toBe(200)
    expect(res.json().url).toContain('accounts.google.com')
  })

  it('callback cria usuário novo e redireciona com token no fragmento', async () => {
    const inicio = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
    const state = new URL(inicio.json().url).searchParams.get('state')
    const res = await app.inject({ method: 'GET', url: `/auth/google/callback?code=abc&state=${state}` })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toMatch(/\/auth\/google\/sucesso#token=/)
    const user = await prisma.user.findUnique({ where: { email: emailGoogle } })
    expect(user.googleConectado).toBe(true)
    expect(user.googleCalendarId).toBe('cal-icelula')
    expect(user.googleRefreshTokenEnc).not.toContain('rt') // cifrado
  })

  it('com a flag desligada retorna 503', async () => {
    process.env.GOOGLE_OAUTH_ENABLED = 'false'
    const res = await app.inject({ method: 'GET', url: '/auth/google?contexto=login' })
    expect(res.statusCode).toBe(503)
    process.env.GOOGLE_OAUTH_ENABLED = 'true'
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Implementar `googleAuth.js`** seguindo os contratos acima (montar state com `app.jwt.sign`, validar no callback com `app.jwt.verify`, resolver/criar usuário nos 3 casos, cifrar refresh token com `cifrar(..., chaveDeAmbiente())`, `garantirCalendario`, disparar `sincronizarMembro` em `.catch(()=>{})`, redirecionar 302). Guardar todas as rotas atrás de `if (!googleHabilitado()) return reply.code(503).send({ erro: 'Integração Google não configurada' })`.

- [ ] **Step 4: Registrar em `app.js`** — `app.register(googleAuthRoutes)`.

- [ ] **Step 5: GREEN.** **Step 6: Commit** `Fase4: rotas OAuth Google (entrar/conectar/desconectar)`.

---

### Task 7: Disparar o sync nas mutações de encontro/célula

**Files:**
- Modify: `apps/api/src/routes/encontros.js` (após criar/editar/estender)
- Modify: `apps/api/src/routes/celulas.js` (após re-materializar no PUT; ao deletar)
- Test: `apps/api/src/routes/encontros.test.js` (1 caso com fake api contando chamadas)

**Interfaces:**
- Consumes: `sincronizarEncontro`, `removerEncontro` (`../lib/sync/calendarSync.js`).
- Produces: após cada mutação bem-sucedida, dispara o sync correspondente **sem await bloqueante**
  e com `.catch(()=>{})` (best-effort): `PUT /encontros/:id` → `sincronizarEncontro(id)` (ou
  `removerEncontro` se virou CANCELADO — `sincronizarEncontro` já trata isso); `POST .../encontros`
  → `sincronizarEncontro(novo.id)`; `POST .../estender` → `sincronizarEncontro` para cada novo (ou
  `sincronizarMembro` de cada membro vinculado — escolher `sincronizarEncontro` por id criado).

> Como `materializarEncontros` retorna só a contagem, para o `estender` disparar um
> `sincronizarMembro(userId)` para cada membro vinculado da célula é mais simples e idempotente.

- [ ] **Step 1: Teste — adicionar em `encontros.test.js`** um caso: com `setGoogleApiParaTestes`
  contando `criar/atualizar`, editar um encontro de uma célula com 1 membro vinculado e verificar
  que o contador subiu (aguardando o disparo). Como o disparo é best-effort/não-bloqueante, expor uma
  forma testável: a função de rota deve **await**ar o sync quando `process.env.NODE_ENV === 'test'` —
  OU simplesmente chamar `await sincronizarEncontro(...)` dentro de um `try/catch` (await + catch ainda é
  best-effort para erros, e fica testável). **Decisão:** usar `try { await sincronizarEncontro(id) } catch {}`
  — mantém best-effort e é testável de forma determinística.

```js
it('editar encontro dispara sincronização para membros vinculados', async () => {
  let criados = 0
  setGoogleApiParaTestes({
    async accessTokenDe() { return 'at' },
    async criarEvento() { criados++; return 'gev' },
    async atualizarEvento() {}, async removerEvento() {},
    async garantirCalendario() { return 'cal' }, async montarAuthUrl() { return '' },
    async trocarCode() { return {} }
  })
  // ... cria célula + membro vinculado (googleConectado, calendarId, refresh cifrado) + encontro,
  // faz PUT /encontros/:id como líder, e espera criados >= 1
  limparGoogleApiParaTestes()
})
```
(O implementador completa o seed do caso seguindo o padrão dos outros testes; usar `TOKEN_ENC_KEY` no env do arquivo.)

- [ ] **Step 2: RED.** **Step 3: Implementar os disparos** com `try { await ... } catch {}` nas rotas citadas. **Step 4: GREEN** (suíte completa). **Step 5: Commit** `Fase4: dispara sincronização Google nas mutações de encontro/célula`.

---

### Task 8: Toques no frontend (botões Google + página de sucesso)

**Files:**
- Modify: `apps/web/src/lib/api.js` (apiConfig, apiGoogleAuthUrl, apiDesconectarGoogle)
- Create: `apps/web/src/context/ConfigContext.jsx` (carrega `GET /config`)
- Create: `apps/web/src/pages/GoogleSucesso.jsx` (lê token do fragmento, persiste, vai p/ /app)
- Create: `apps/web/src/components/BotaoGoogle.jsx`
- Modify: `apps/web/src/pages/Login.jsx`, `Register.jsx`, `QrLanding.jsx` (botão "Entrar com Google")
- Modify: `apps/web/src/pages/AppHome.jsx` (cartão "Conectar Google Calendar" p/ membro)
- Modify: `apps/web/src/App.jsx` (rota `/auth/google/sucesso`, envolver com ConfigProvider)

**Interfaces:**
- `apiConfig()` → `{ googleHabilitado }`; `apiGoogleAuthUrl(contexto, qrToken?)` → `{ url }` (GET);
  `apiDesconectarGoogle()` → DELETE /google.
- `BotaoGoogle({ contexto, qrToken })` — visível só se `googleHabilitado`; ao clicar, busca a `url` e faz `window.location.href = url`.
- `GoogleSucesso` — lê `window.location.hash` (`#token=...`), chama `setToken`, recarrega o usuário e navega para `/app`.

> Sem testes unitários de frontend (padrão do projeto). Verificação: `npm run build --workspace apps/web` compila; com a flag OFF os botões não aparecem.

- [ ] **Step 1:** Implementar `api.js` (3 funções), `ConfigContext` (busca `/config` no mount, expõe `googleHabilitado`), `BotaoGoogle`, `GoogleSucesso`.
- [ ] **Step 2:** Adicionar `<BotaoGoogle contexto="login" />` em Login/Register e `contexto="login"` com `qrToken` na QrLanding; cartão "Conectar/Desconectar Google Calendar" na AppHome (usa `usuario.googleConectado` — **incluir `googleConectado` no `publico()`/`/auth/me`**: ajustar `lib/usuarios.js`? Não — `publico` remove só `senhaHash`; `googleConectado` já passa. Garantir que `/auth/me` retorne o campo).
- [ ] **Step 3:** Rota `/auth/google/sucesso` no `App.jsx` e `ConfigProvider` no topo.
- [ ] **Step 4: Verificar** — `npm run build --workspace apps/web` compila; subir local e confirmar que, com flag OFF, nenhum botão Google aparece e o app segue normal.
- [ ] **Step 5: Commit** `Fase4: frontend — botões Google (login/cadastro/QR), conectar/desconectar e página de sucesso`.

---

## Self-Review

**1. Cobertura do spec:**
- OAuth (entrar/conectar/desconectar) → Tasks 6, 8. ✅
- Calendário "iCélula" dedicado → `garantirCalendario` (T4) usado no callback (T6). ✅
- Sync one-way + propagação (criar/editar/cancelar + backfill) → Tasks 5, 7. ✅
- Modelo de dados (campos User + GoogleEventoSync + senhaHash opcional) → Task 1. ✅
- Refresh token cifrado → Tasks 2, 5, 6. ✅
- Feature-flag + GET /config → Task 3; rotas 503 com flag off → Task 6. ✅
- Testes com mock sem rede → seam de injeção (T4) usado em T5/T6/T7. ✅
- Toques no front + página de sucesso (token no fragmento) → Task 8. ✅
- Login passwordless orienta a usar Google → Task 1. ✅

**2. Placeholders:** Código completo nas unidades testáveis (cripto, evento, sync, config). Rotas OAuth e frontend descritas por contrato preciso + snippets, seguindo padrões existentes (`auth.js`, Fase 2/3B). Sem "TBD".

**3. Consistência de nomes/tipos:** `getGoogleApi/setGoogleApiParaTestes/limparGoogleApiParaTestes` (T4) usados em T5/T6/T7. `cifrar/decifrar/chaveDeAmbiente` (T2) em T5/T6. `montarEvento` (T4) em T5. `googleHabilitado/googleConfig` (T3) em T4/T6. `sincronizarMembro/sincronizarEncontro/removerEncontro/removerMembro` (T5) em T6/T7/T8. Campos Prisma (`googleSub/googleRefreshTokenEnc/googleCalendarId/googleConectado`, `GoogleEventoSync.userId_encontroId`) consistentes entre T1 e T5/T6.

Pronto para execução (com a flag OFF; ativar quando o Ian fornecer as credenciais Google).
