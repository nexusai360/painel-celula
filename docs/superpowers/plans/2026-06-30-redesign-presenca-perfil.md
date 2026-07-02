# Redesenho imersivo de presença + perfil — Implementation Plan

> Versão: **v3 (pronto para execução)** (double-check v1→v2→**v3**)
> **v1→v2:** testes do backend em `src/**`; Vitest no `apps/web`; remoção do `<AppShell>` de Celulas/CelulaDetalhe; export de `ROTULO_PAPEL`; retornos de `api.js`; navegação admin + índice condicional; handler POST completo; reescrita só do describe do gate; fallback de migração; `prisma.$disconnect()`; pin do import de framer-motion.
> **v2→v3 (após 2ª perícia):** corrigidos os paths da T4 (`src/lib/encontros.service.test.js`, `src/routes/presenca.test.js`); T6 preserva as rotas públicas fora do layout; **stub `Perfil.jsx` criado no T6** (build do Step 7 não quebra); `ProtectedRoute` sem prop `papel` (gate ADMIN segue no backend, como hoje); T4 adiciona só `podeDesmarcarPresenca` ao import existente; imports de `App.jsx` listados; limpeza de imports órfãos (`publico` em auth.js, `AppShell` nas 4 páginas).
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Spec de referência: `docs/superpowers/specs/2026-06-30-redesign-presenca-perfil-design.md`. **Toda UI usa a skill ui-ux-pro-max.**

**Goal:** Transformar a área do membro em uma experiência imersiva (check-in animado da próxima reunião, calendário-mapa de presença, perfil com foto/WhatsApp) com cabeçalho remodelado.

**Architecture:** Backend ganha campos de perfil + endpoint `PUT /perfil`, gate de presença por instante absoluto, e projeções "leves" sem avatar. Frontend reestrutura em layout route com `EncontrosProvider` (fonte de verdade compartilhada entre Início e Calendário, sem refetch), TopBar+BottomNav, e componentes de check-in animado (CSS) + bottom sheet (framer-motion).

**Tech Stack:** Fastify 5, Prisma 6, Postgres, Vitest, zod (packages/shared) · Vite 7, React 19, React Router 7, Tailwind v4, lucide-react, axios, framer-motion ^12.

## Global Constraints

- **Marca:** `--brand #E56A22`; presença/sucesso `--success` (verde); falta `--text-muted`+ícone (nunca vermelho). Tokens CSS existentes; nunca hex cru em componente.
- **Animação:** 150–300ms; só `transform`/`opacity`; `prefers-reduced-motion` respeitado; haptic `navigator.vibrate` quando houver. **Check do herói = CSS puro** (sem framer-motion). framer-motion só no `Sheet`.
- **Toque** ≥44px, gap ≥8px; **a11y** AA, `focus-visible`, `aria-live` em confirmação, cor+ícone+texto.
- **Avatar:** cliente sempre exporta **JPEG** 256² (`data:image/jpeg;base64,`); servidor valida só JPEG (magic `FF D8 FF`); base64 em `Text`; ≤400 KB; nunca em listas (`publicoLeve`) nem no JWT.
- **WhatsApp:** E.164 só dígitos (prefixa `55` se 10–11 dígitos).
- **Gate de presença:** POST exige `agora >= encontro.data` e `status!=CANCELADO`; **DELETE nunca bloqueia**.
- **Migração:** `prisma migrate dev --create-only` → `migrate deploy` → `generate` (colunas nullable, sem TTY).
- **Idioma:** PT-BR com acentuação correta. Commits frequentes por task.
- **Microcopy:** usar as strings fixas da §6 da spec; badge de papel via `ROTULO_PAPEL` existente.

---

## File Structure

**Backend**
- `apps/api/prisma/schema.prisma` — +`avatar`, +`whatsapp` em User (T1).
- `apps/api/src/lib/usuarios.js` — +`publicoLeve`, +`comCelula`, +`COM_CELULA` (T2).
- `apps/api/src/routes/auth.js` — importa helpers extraídos (T2).
- `apps/api/src/routes/presenca.js` — `publicoLeve`, gate por verbo, `totalPresencas` (T2/T4).
- `apps/api/src/routes/celulas.js` — `publicoLeve(lider)` (T2).
- `apps/api/src/routes/encontros.js` — `marcadaEm` na projeção (T4).
- `apps/api/src/lib/encontros.service.js` — `podeMarcarPresenca`/`podeDesmarcarPresenca` (T4).
- `apps/api/src/routes/perfil.js` — novo `PUT /perfil` (T3).
- `apps/api/src/app.js` — registra `perfilRoutes` (T3).
- `packages/shared/src/perfil.schemas.js` + `index.js` — `perfilUpdateSchema` (T3).

**Frontend**
- `apps/web/src/lib/datas.js` — +`chaveDiaLocal` (T5).
- `apps/web/src/lib/proximaReuniao.js` — featured + streak (T5).
- `apps/web/src/lib/whatsapp.js` — normaliza/formata (T5).
- `apps/web/src/lib/imagem.js` — resize+EXIF (T5).
- `apps/web/src/lib/erros.js` — `mapearErroCampos` (T5).
- `apps/web/src/lib/api.js` — +`apiAtualizarPerfil` (T5).
- `apps/web/src/context/AuthContext.jsx` — +`aplicarUsuario` (T5).
- `apps/web/src/context/EncontrosContext.jsx` — `EncontrosProvider` (T6).
- `apps/web/src/components/AppLayout.jsx`, `TopBar.jsx`, `BottomNav.jsx`, `ui/Avatar.jsx`, `lib/papeis.js` (T6).
- `apps/web/src/App.jsx` — layout route + rota perfil + redirect admin (T6); remover `<AppShell>` de Celulas/CelulaDetalhe (T6).
- `apps/web/src/components/ui/Sheet.jsx` (T7).
- `apps/web/src/components/AnimatedCheck.jsx`, `hooks/usePresenca.js` (T7).
- `apps/web/src/components/CheckInHero.jsx`, `MinhaFrequencia.jsx` + `pages/AppHome.jsx` (T8).
- `apps/web/src/components/AttendanceCalendar.jsx`, `DiaDetalheSheet.jsx` + `pages/Calendario.jsx` (T9).
- `apps/web/src/components/AvatarUpload.jsx` + `pages/Perfil.jsx` (T10).

**Dependências:** `npm i framer-motion@^12 -w apps/web` (T7).

---

### Task 1: Schema + migração (avatar, whatsapp)

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model User)

**Interfaces:**
- Produces: colunas `User.avatar String? @db.Text`, `User.whatsapp String?`.

- [ ] **Step 1: Editar o schema** — em `model User`, após `criadoEm`, adicionar:
```prisma
  avatar   String? @db.Text
  whatsapp String?
```

- [ ] **Step 2: Garantir Postgres no ar** — `docker compose up -d` (container `icelula-db`). Conferir `DATABASE_URL` em `apps/api/.env`.

- [ ] **Step 3: Criar a migration sem aplicar (sem TTY)**
Run (cwd `apps/api`): `npx prisma migrate dev --create-only --name perfil_avatar_whatsapp`
Expected: cria `prisma/migrations/<ts>_perfil_avatar_whatsapp/migration.sql` com dois `ALTER TABLE "User" ADD COLUMN ... NULL`, sem prompt.
**Fallback (se pedir TTY por drift):** criar a pasta e gerar o SQL via diff —
```bash
mkdir -p prisma/migrations/000_perfil_avatar_whatsapp
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/000_perfil_avatar_whatsapp/migration.sql
```
(O conteúdo deve ser só os dois `ALTER TABLE ... ADD COLUMN ... NULL`; se o diff trouxer mais, editar para conter apenas isso.)

- [ ] **Step 4: Aplicar e gerar o client**
Run: `npx prisma migrate deploy && npx prisma generate`
Expected: migration aplicada; client regenerado.

- [ ] **Step 5: Verificar coluna**
Run: `docker exec icelula-db psql -U icelula -d icelula -c '\d "User"'`
Expected: linhas `avatar | text` e `whatsapp | text`.

- [ ] **Step 6: Commit**
```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(perfil): colunas avatar e whatsapp em User"
```

---

### Task 2: Refator de helpers de usuário + projeção leve (anti-vazamento de avatar)

**Files:**
- Modify: `apps/api/src/lib/usuarios.js`
- Modify: `apps/api/src/routes/auth.js`
- Modify: `apps/api/src/routes/presenca.js`
- Modify: `apps/api/src/routes/celulas.js`
- Test: `apps/api/src/lib/usuarios.test.js` (**novo** arquivo unitário, ao lado do código — o Vitest da API usa `include: ['src/**/*.test.js']`; **não** confundir com `src/routes/usuarios.test.js`, que é de integração)

**Interfaces:**
- Produces: `publico(user)`, `publicoLeve(user)` (sem `avatar`), `COM_CELULA`, `comCelula(user)` — todos exportados de `lib/usuarios.js`.
- Consumes (T3): `comCelula`, `COM_CELULA` em `perfil.js`.

- [ ] **Step 1: Escrever teste de não-vazamento** em `apps/api/src/lib/usuarios.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { publico, publicoLeve } from './usuarios.js'

const base = { id:'u1', nome:'Ana', email:'a@x.com', senhaHash:'h', googleRefreshTokenEnc:'e', googleSub:'g', avatar:'data:image/jpeg;base64,AAAA', whatsapp:'5562999999999' }

describe('projeções de usuário', () => {
  it('publico remove segredos e mantém avatar/whatsapp', () => {
    const p = publico(base)
    expect(p.senhaHash).toBeUndefined()
    expect(p.googleRefreshTokenEnc).toBeUndefined()
    expect(p.avatar).toBe(base.avatar)
    expect(p.whatsapp).toBe(base.whatsapp)
  })
  it('publicoLeve remove avatar (anti-inflação em listas)', () => {
    const p = publicoLeve(base)
    expect(p.avatar).toBeUndefined()
    expect(p.senhaHash).toBeUndefined()
    expect(p.nome).toBe('Ana')
    expect(p.whatsapp).toBe('5562999999999')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -w apps/api -- usuarios` → FAIL (`publicoLeve` não existe).

- [ ] **Step 3: Implementar em `lib/usuarios.js`**:
```js
export function publico(user) {
  if (!user) return null
  const { senhaHash, googleRefreshTokenEnc, googleSub, ...resto } = user
  return resto
}

export function publicoLeve(user) {
  if (!user) return null
  const { avatar, ...resto } = publico(user)
  return resto
}

export const COM_CELULA = { include: { celula: { select: { nome: true } } } }

export function comCelula(user) {
  const { celula, ...rest } = publico(user)
  return { ...rest, celulaNome: celula?.nome ?? null }
}
```

- [ ] **Step 4: Migrar `auth.js`** para importar os helpers (remover as definições locais de `COM_CELULA`/`comCelula`):
```js
import { COM_CELULA, comCelula } from '../lib/usuarios.js'
```
(Manter `assinarToken` local em auth.js. Após mover `comCelula`, o `import { publico }` em auth.js fica órfão — **removê-lo**.)

- [ ] **Step 5: Aplicar `publicoLeve` nas listas** — em `routes/presenca.js` trocar `publico(p.user)` por `publicoLeve(p.user)` no `GET /encontros/:id/presencas`; em `routes/celulas.js:~144` trocar `publico(celula.lider)` por `publicoLeve(celula.lider)`. Ajustar imports.

- [ ] **Step 6: Rodar suíte** — `npm test -w apps/api` → PASS (usuarios novo + auth/celulas/presenca existentes verdes).

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/lib/usuarios.js apps/api/src/lib/usuarios.test.js apps/api/src/routes/auth.js apps/api/src/routes/presenca.js apps/api/src/routes/celulas.js
git commit -m "refactor(api): helpers comCelula/publicoLeve compartilhados; avatar fora de listas"
```

---

### Task 3: `perfilUpdateSchema` (shared) + `PUT /perfil`

**Files:**
- Create: `packages/shared/src/perfil.schemas.js`
- Modify: `packages/shared/src/index.js`
- Create: `apps/api/src/routes/perfil.js`
- Modify: `apps/api/src/app.js`
- Create: `apps/api/src/routes/perfil.test.js` (ao lado do código, dentro do glob `src/**`)

**Interfaces:**
- Consumes: `COM_CELULA`, `comCelula` (T2); `requireRole` (`lib/roles.js`); `prisma`.
- Produces: rota `PUT /perfil` → `200 { usuario }` | `400 { erro, detalhes? }`. `perfilUpdateSchema`, `normalizarWhatsapp(v)`.

- [ ] **Step 1: Schema zod em `packages/shared/src/perfil.schemas.js`**:
```js
import { z } from 'zod'

export function normalizarWhatsapp(valor) {
  if (valor == null || valor === '') return null
  const d = String(valor).replace(/\D/g, '')
  if (d.length >= 12 && d.length <= 13) return d           // já tem país
  if (d.length === 10 || d.length === 11) return '55' + d  // BR sem país
  return null // inválido → schema rejeita
}

const AVATAR_PREFIXO = /^data:image\/jpeg;base64,/
const AVATAR_MAX = 400 * 1024

export const perfilUpdateSchema = z.object({
  nome: z.string().trim().min(1).max(80).optional(),
  whatsapp: z.union([z.string(), z.null()]).optional(),
  avatar: z.union([
    z.string().regex(AVATAR_PREFIXO, 'Avatar deve ser JPEG base64').max(AVATAR_MAX, 'Imagem muito grande'),
    z.null()
  ]).optional()
})
```

- [ ] **Step 2: Re-exportar** em `packages/shared/src/index.js`: `export * from './perfil.schemas.js'`.

- [ ] **Step 3: Escrever testes** em `apps/api/src/routes/perfil.test.js` (seguir o padrão dos testes existentes — `buildApp()`, `app.ready()`, `app.jwt.sign`):
```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'

let app, token, userId
const jpeg = 'data:image/jpeg;base64,' + Buffer.from([0xFF,0xD8,0xFF,0x00]).toString('base64')

beforeAll(async () => {
  app = buildApp(); await app.ready()
  const u = await prisma.user.create({ data: { nome:'Teste', email:`p${Date.now()}@x.com`, senhaHash:'h', papel:'MEMBRO' } })
  userId = u.id
  token = app.jwt.sign({ id:u.id, papel:'MEMBRO', celulaId:null })
})
afterAll(async () => { await prisma.user.delete({ where:{ id:userId } }).catch(()=>{}); await app.close(); await prisma.$disconnect() })

function put(body) {
  return app.inject({ method:'PUT', url:'/perfil', headers:{ authorization:`Bearer ${token}` }, payload: body })
}

describe('PUT /perfil', () => {
  it('atualiza nome e normaliza whatsapp para E.164', async () => {
    const r = await put({ nome:'Ana Maria', whatsapp:'(62) 99999-9999' })
    expect(r.statusCode).toBe(200)
    const { usuario } = r.json()
    expect(usuario.nome).toBe('Ana Maria')
    expect(usuario.whatsapp).toBe('5562999999999')
    expect('celulaNome' in usuario).toBe(true)
    expect(usuario.senhaHash).toBeUndefined()
  })
  it('aceita avatar JPEG válido e limpa com null', async () => {
    expect((await put({ avatar: jpeg })).statusCode).toBe(200)
    const r = await put({ avatar: null }); expect(r.statusCode).toBe(200)
    expect(r.json().usuario.avatar).toBeNull()
  })
  it('rejeita avatar não-JPEG (prefixo) com 400', async () => {
    const png = 'data:image/png;base64,' + Buffer.from([0x89,0x50]).toString('base64')
    expect((await put({ avatar: png })).statusCode).toBe(400)
  })
  it('rejeita avatar com magic-bytes inválido (prefixo JPEG mas bytes errados)', async () => {
    const fake = 'data:image/jpeg;base64,' + Buffer.from([0x00,0x01,0x02]).toString('base64')
    const r = await put({ avatar: fake }); expect(r.statusCode).toBe(400)
    expect(r.json().erro).toBe('Imagem inválida')
  })
  it('exige autenticação', async () => {
    const r = await app.inject({ method:'PUT', url:'/perfil', payload:{ nome:'X' } })
    expect(r.statusCode).toBe(401)
  })
})
```

- [ ] **Step 4: Rodar e ver falhar** — `npm test -w apps/api -- perfil` → FAIL (rota inexistente).

- [ ] **Step 5: Implementar `routes/perfil.js`**:
```js
import { perfilUpdateSchema, normalizarWhatsapp } from '@icelula/shared'
import { prisma } from '../prisma.js'
import { requireRole } from '../lib/roles.js'
import { COM_CELULA, comCelula } from '../lib/usuarios.js'

function magicJpegOk(dataUrl) {
  const b64 = dataUrl.split(',')[1] ?? ''
  const buf = Buffer.from(b64, 'base64')
  return buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
}

export async function perfilRoutes(app) {
  app.put('/perfil', {
    preHandler: requireRole('MEMBRO'),
    bodyLimit: 700 * 1024
  }, async (request, reply) => {
    const parsed = perfilUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ erro:'Dados inválidos', detalhes: parsed.error.issues })

    const data = {}
    if (parsed.data.nome !== undefined) data.nome = parsed.data.nome
    if (parsed.data.whatsapp !== undefined) {
      if (parsed.data.whatsapp === null || parsed.data.whatsapp === '') data.whatsapp = null
      else {
        const w = normalizarWhatsapp(parsed.data.whatsapp)
        if (!w) return reply.code(400).send({ erro:'WhatsApp inválido' })
        data.whatsapp = w
      }
    }
    if (parsed.data.avatar !== undefined) {
      if (parsed.data.avatar === null || parsed.data.avatar === '') data.avatar = null
      else {
        if (!magicJpegOk(parsed.data.avatar)) return reply.code(400).send({ erro:'Imagem inválida' })
        data.avatar = parsed.data.avatar
      }
    }

    const user = await prisma.user.update({ where:{ id: request.usuario.id }, data, ...COM_CELULA })
    return reply.send({ usuario: comCelula(user) })
  })
}
```

- [ ] **Step 6: Registrar em `app.js`** — `import { perfilRoutes } from './routes/perfil.js'` e `app.register(perfilRoutes)` junto das demais rotas.

- [ ] **Step 7: Rodar testes** — `npm test -w apps/api -- perfil` → PASS. Depois `npm test -w apps/api` (suíte completa) → PASS.

- [ ] **Step 8: Commit**
```bash
git add packages/shared/src/perfil.schemas.js packages/shared/src/index.js apps/api/src/routes/perfil.js apps/api/src/app.js apps/api/src/routes/perfil.test.js
git commit -m "feat(api): PUT /perfil com validação de avatar JPEG e WhatsApp E.164"
```

---

### Task 4: Gate de presença por instante + `marcadaEm`/`totalPresencas`

**Files:**
- Modify: `apps/api/src/lib/encontros.service.js`
- Modify: `apps/api/src/routes/presenca.js`
- Modify: `apps/api/src/routes/encontros.js`
- Test: `apps/api/src/lib/encontros.service.test.js` (reescrever só o describe do gate), `apps/api/src/routes/presenca.test.js` (ajustar asserts)

**Interfaces:**
- Produces: `podeMarcarPresenca(encontro, agora?)` (instante), `podeDesmarcarPresenca()` (`{ok:true}`); POST→`{presenca,totalPresencas}`, DELETE→`200 {totalPresencas}`; `GET encontros` expõe `marcadaEm`.

- [ ] **Step 1: Reescrever SÓ o describe do gate** em `src/lib/encontros.service.test.js`. O arquivo **já importa** `podeMarcarPresenca` (junto de `diferencaEmDiasDeCalendario`/`materializarEncontros`) e tem `afterAll` com `prisma.$disconnect()`. **NÃO criar segunda linha de import** (geraria binding duplicado/SyntaxError): apenas **acrescentar `podeDesmarcarPresenca`** ao import existente. **Preservar** os describes de `diferencaEmDiasDeCalendario`/`materializarEncontros` e o `afterAll`. Substituir apenas o describe de `podeMarcarPresenca` por:
```js
// import existente passa a ser, p.ex.:
//   import { podeMarcarPresenca, podeDesmarcarPresenca, diferencaEmDiasDeCalendario, materializarEncontros } from './encontros.service.js'

const data = new Date('2026-07-09T19:00:00.000Z')
const ag = (iso) => new Date(iso)

describe('podeMarcarPresenca (instante)', () => {
  it('bloqueia futuro (dia seguinte antes)', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-08T20:00:00Z')).ok).toBe(false)
  })
  it('bloqueia no mesmo dia antes do horário', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-09T15:00:00Z')).ok).toBe(false)
  })
  it('libera exatamente no horário', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-09T19:00:00Z')).ok).toBe(true)
  })
  it('libera retroativo (semana seguinte)', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-16T10:00:00Z')).ok).toBe(true)
  })
  it('bloqueia cancelado', () => {
    expect(podeMarcarPresenca({ data, status:'CANCELADO' }, ag('2026-07-10T10:00:00Z')).ok).toBe(false)
  })
})
describe('podeDesmarcarPresenca', () => {
  it('sempre permite (inclusive cancelado/futuro)', () => {
    expect(podeDesmarcarPresenca().ok).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -w apps/api -- encontros.service` → FAIL.

- [ ] **Step 3: Implementar gates** em `encontros.service.js` (substituir `podeMarcarPresenca`, manter `diferencaEmDiasDeCalendario` e `materializarEncontros`):
```js
export function podeMarcarPresenca(encontro, agora = new Date()) {
  if (encontro.status === 'CANCELADO') return { ok:false, motivo:'Reunião cancelada' }
  if (agora.getTime() < new Date(encontro.data).getTime()) {
    return { ok:false, motivo:'Disponível a partir do horário da reunião' }
  }
  return { ok:true }
}

export function podeDesmarcarPresenca() {
  return { ok:true }
}
```

- [ ] **Step 4: Ajustar `presenca.js`** — POST continua chamando `podeMarcarPresenca`; **DELETE deixa de chamar o gate** (remove o bloco do gate/403; mantém 404 e membership 403). Reescrever o final do handler **POST** sem `return` antecipado (o atual retorna cedo no ramo "já existe"):
```js
  // ...após validar encontro, membership e podeMarcarPresenca:
  const existing = await prisma.presenca.findUnique({
    where: { encontroId_userId: { encontroId: id, userId: usuario.id } }
  })
  let presenca = existing
  let criou = false
  if (!existing) {
    presenca = await prisma.presenca.create({ data: { encontroId: id, userId: usuario.id } })
    criou = true
  }
  const totalPresencas = await prisma.presenca.count({ where: { encontroId: id } })
  return reply.code(criou ? 201 : 200).send({ presenca, totalPresencas })
```
E no **DELETE**, após `deleteMany`:
```js
  const totalPresencas = await prisma.presenca.count({ where: { encontroId: id } })
  return reply.code(200).send({ totalPresencas })
```

- [ ] **Step 5: Projeção `marcadaEm`** em `routes/encontros.js` — trocar o `select:{id:true}` da subquery de presenças por `select:{ marcadaEm:true }` e expor:
```js
const comFlag = encontros.map(({ presencas, ...e }) => ({
  ...e,
  marcadoPorMim: presencas.length > 0,
  marcadaEm: presencas[0]?.marcadaEm ?? null
}))
```

- [ ] **Step 6: Ajustar `src/routes/presenca.test.js`** — atualizar asserts de DELETE (linhas ~341/355/364) de `204` para `200` + `{ totalPresencas }`; POST passa a conter `totalPresencas`. Manter o caso "POST antes do horário → 403" (já existe ~273-283). Realinhar qualquer caso que assumia bloqueio "dia inteiro".

- [ ] **Step 7: Rodar suíte** — `npm test -w apps/api` → PASS.

- [ ] **Step 8: Commit**
```bash
git add apps/api/src/lib/encontros.service.js apps/api/src/lib/encontros.service.test.js apps/api/src/routes/presenca.js apps/api/src/routes/presenca.test.js apps/api/src/routes/encontros.js
git commit -m "feat(api): gate de presença por instante; DELETE livre; marcadaEm/totalPresencas"
```

---

### Task 5: Libs do frontend (datas, próxima reunião, whatsapp, imagem, erros, api, auth)

**Files:**
- Modify: `apps/web/src/lib/datas.js` (+`chaveDiaLocal`)
- Create: `apps/web/src/lib/proximaReuniao.js`, `lib/whatsapp.js`, `lib/imagem.js`, `lib/erros.js`
- Modify: `apps/web/src/lib/api.js` (+`apiAtualizarPerfil`)
- Modify: `apps/web/src/context/AuthContext.jsx` (+`aplicarUsuario`)
- Test: `apps/web/test/proximaReuniao.test.js`, `apps/web/test/whatsapp.test.js`, `apps/web/test/datas.test.js`

**Interfaces:**
- Produces: `chaveDiaLocal(d)→'AAAA-MM-DD'`; `proximaReuniao(encontros, agora?)→encontro|null`; `minhaFrequencia(encontros, agora?)→{presentes,total,streak}`; `formatarWhatsapp(e164)`, `paraWhatsappLink(e164)`; `redimensionarImagem(file)→Promise<dataUrlJpeg>`; `mapearErroCampos(detalhes)→{campo:msg}`; `apiAtualizarPerfil(payload)→usuario`; `aplicarUsuario(usuario)`.

- [ ] **Step 0: Configurar Vitest no `apps/web`** (hoje NÃO existe runner/script de teste no front):
```bash
npm i -D vitest@^3 -w apps/web
```
Criar `apps/web/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', include: ['test/**/*.test.js'] } })
```
Adicionar ao `apps/web/package.json` em `scripts`: `"test": "vitest run"`.
(Os testes deste task — `proximaReuniao`, `whatsapp` — são funções puras; `environment: 'node'` basta. `imagem.js`/componentes não têm teste automatizado: dependem de `canvas`/`document`, verificados manualmente no T10.)

- [ ] **Step 1: Teste de `chaveDiaLocal` e `proximaReuniao`** em `apps/web/test/proximaReuniao.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { proximaReuniao, minhaFrequencia } from '../src/lib/proximaReuniao.js'

const mk = (iso, extra={}) => ({ id:iso, data:iso, status:'AGENDADO', marcadoPorMim:false, _count:{presencas:0}, ...extra })

describe('proximaReuniao', () => {
  const agora = new Date('2026-07-09T21:00:00')
  it('no dia da reunião, retorna a de hoje mesmo após o horário', () => {
    const enc = [mk('2026-07-02T19:00:00'), mk('2026-07-09T19:00:00'), mk('2026-07-16T19:00:00')]
    expect(proximaReuniao(enc, agora).id).toBe('2026-07-09T19:00:00')
  })
  it('pula a próxima cancelada', () => {
    const enc = [mk('2026-07-09T19:00:00',{status:'CANCELADO'}), mk('2026-07-16T19:00:00')]
    expect(proximaReuniao(enc, agora).id).toBe('2026-07-16T19:00:00')
  })
  it('retorna null se não há hoje/futuro', () => {
    expect(proximaReuniao([mk('2026-07-02T19:00:00')], agora)).toBeNull()
  })
})
describe('minhaFrequencia', () => {
  it('conta presentes/total em passados não-cancelados e streak do mais recente', () => {
    const agora = new Date('2026-07-20T10:00:00')
    const enc = [
      mk('2026-07-02T19:00:00',{marcadoPorMim:true}),
      mk('2026-07-09T19:00:00',{marcadoPorMim:false}),
      mk('2026-07-16T19:00:00',{marcadoPorMim:true}),
      mk('2026-07-23T19:00:00',{marcadoPorMim:false}) // futuro, ignora
    ]
    const r = minhaFrequencia(enc, agora)
    expect(r.total).toBe(3); expect(r.presentes).toBe(2); expect(r.streak).toBe(1)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -w apps/web -- proximaReuniao` → FAIL.

- [ ] **Step 3: `chaveDiaLocal` em `datas.js`**:
```js
const pad2 = (n) => String(n).padStart(2, '0')
export function chaveDiaLocal(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad2(x.getMonth()+1)}-${pad2(x.getDate())}`
}
```

- [ ] **Step 4: `proximaReuniao.js`**:
```js
import { chaveDiaLocal } from './datas.js'

export function proximaReuniao(encontros, agora = new Date()) {
  const hoje = chaveDiaLocal(agora)
  return [...encontros]
    .sort((a,b) => new Date(a.data) - new Date(b.data))
    .find(e => e.status !== 'CANCELADO' && chaveDiaLocal(e.data) >= hoje) ?? null
}

export function minhaFrequencia(encontros, agora = new Date()) {
  const hoje = chaveDiaLocal(agora)
  const passados = encontros
    .filter(e => e.status !== 'CANCELADO' && chaveDiaLocal(e.data) < hoje)
    .sort((a,b) => new Date(b.data) - new Date(a.data)) // mais recente primeiro
  const presentes = passados.filter(e => e.marcadoPorMim).length
  let streak = 0
  for (const e of passados) { if (e.marcadoPorMim) streak++; else break }
  return { presentes, total: passados.length, streak }
}
```

- [ ] **Step 5: Teste + impl de `whatsapp.js`** (`apps/web/test/whatsapp.test.js`):
```js
import { describe, it, expect } from 'vitest'
import { formatarWhatsapp, paraWhatsappLink } from '../src/lib/whatsapp.js'
describe('whatsapp', () => {
  it('formata E.164 BR para exibição', () => {
    expect(formatarWhatsapp('5562999999999')).toBe('(62) 99999-9999')
  })
  it('gera link wa.me', () => {
    expect(paraWhatsappLink('5562999999999')).toBe('https://wa.me/5562999999999')
  })
})
```
Impl `whatsapp.js`:
```js
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
```

- [ ] **Step 6: `imagem.js`** (resize+EXIF; testado manualmente no T10):
```js
export async function redimensionarImagem(file, tamanho = 256, qualidade = 0.8) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const lado = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - lado) / 2, sy = (bitmap.height - lado) / 2
  const canvas = document.createElement('canvas')
  canvas.width = tamanho; canvas.height = tamanho
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, tamanho, tamanho)
  let q = qualidade, url = canvas.toDataURL('image/jpeg', q)
  while (url.length > 400 * 1024 && q > 0.4) { q -= 0.1; url = canvas.toDataURL('image/jpeg', q) }
  return url
}
```

- [ ] **Step 7: `erros.js`**:
```js
export function mapearErroCampos(detalhes) {
  const out = {}
  if (Array.isArray(detalhes)) for (const i of detalhes) {
    const campo = i.path?.[0]; if (campo && !out[campo]) out[campo] = i.message
  }
  return out
}
```

- [ ] **Step 8: `api.js` + `AuthContext`** — em `api.js`:
```js
export async function apiAtualizarPerfil(payload) {
  const { data } = await api.put('/perfil', payload)
  return data.usuario
}
```
Em `AuthContext.jsx`, adicionar `aplicarUsuario` e expor no value:
```js
const aplicarUsuario = (u) => setUsuario(u)
// ...no value: { usuario, carregando, entrar, cadastrar, sair, aplicarToken, aplicarUsuario }
```

- [ ] **Step 9: Rodar testes** — `npm test -w apps/web` → PASS. `npm run build -w apps/web` → ok.

- [ ] **Step 10: Commit**
```bash
git add apps/web/src/lib apps/web/src/context/AuthContext.jsx apps/web/test apps/web/package.json
git commit -m "feat(web): libs de próxima reunião, whatsapp, imagem(EXIF), erros e apiAtualizarPerfil"
```

---

### Task 6: Shell — layout route + EncontrosProvider + TopBar + BottomNav + rotas

**Files:**
- Create: `apps/web/src/context/EncontrosContext.jsx`, `components/AppLayout.jsx`, `components/TopBar.jsx`, `components/BottomNav.jsx`, `components/ui/Avatar.jsx`, `lib/papeis.js`
- Modify: `apps/web/src/App.jsx`, `apps/web/src/pages/AppHome.jsx`, `apps/web/src/pages/Calendario.jsx`, `apps/web/src/pages/Celulas.jsx`, `apps/web/src/pages/CelulaDetalhe.jsx` (todas: remover o wrapper `<AppShell>`, passam a renderizar só o conteúdo dentro do `<main>` do layout)

**Interfaces:**
- Produces: `useEncontros()` → `{ encontros, carregando, erro, recarregar, atualizarPresenca(encontroId, marcado, totalPresencas) }`. `AppLayout` (renderiza TopBar + Outlet + BottomNav, dentro de EncontrosProvider).
- Consumes: `apiListarEncontros` (api.js), `useAuth` (avatar, papel, celulaId).

- [ ] **Step 1: `EncontrosContext.jsx`**:
```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { apiListarEncontros } from '../lib/api.js'

const Ctx = createContext(null)
export const useEncontros = () => useContext(Ctx)

export function EncontrosProvider({ children }) {
  const { usuario } = useAuth()
  const celulaId = usuario?.celulaId ?? null
  const [encontros, setEncontros] = useState(null)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    if (!celulaId) { setEncontros([]); return }
    try { setEncontros(await apiListarEncontros(celulaId)) }
    catch { setErro('Não foi possível carregar as reuniões.') }
  }, [celulaId])

  useEffect(() => { setEncontros(null); setErro(''); recarregar() }, [recarregar])

  const atualizarPresenca = useCallback((encontroId, marcado, totalPresencas) => {
    setEncontros(prev => (prev ?? []).map(e => e.id === encontroId
      ? { ...e, marcadoPorMim: marcado, marcadaEm: marcado ? (e.marcadaEm ?? new Date().toISOString()) : null,
          _count: { ...e._count, presencas: totalPresencas ?? e._count?.presencas } }
      : e))
  }, [])

  return <Ctx.Provider value={{ encontros, carregando: encontros === null && !!celulaId, erro, recarregar, atualizarPresenca }}>{children}</Ctx.Provider>
}
```

- [ ] **Step 1b: Extrair `ROTULO_PAPEL`** — hoje é `const` privado em `AppShell.jsx`. Criar `apps/web/src/lib/papeis.js`:
```js
export const ROTULO_PAPEL = { MEMBRO: 'Membro', LIDER: 'Líder', ADMIN: 'Administrador' }
```
(Conferir os rótulos reais no `AppShell.jsx` atual e replicar.) Quem precisar do rótulo importa daqui.

- [ ] **Step 1c: `ui/Avatar.jsx` (mínimo)** — props `{ src, nome, size=40 }`: se `src`, `<img>` redondo `object-cover` com `alt={nome}`; senão iniciais (1ª letra do 1º e do 2º nome) sobre `bg-brand text-on-brand`, redondo. (Enriquecido no T10 se preciso.)

- [ ] **Step 2: `TopBar.jsx`** — sticky, `Logo` à esquerda; à direita `ThemeToggle` + botão de avatar (`ui/Avatar` com `usuario.avatar`/iniciais; alvo ≥44px) navegando para `/app/perfil`. Em ≥768px (`hidden md:flex`), mostrar links de navegação conforme o papel: membro/líder = mesmos itens da BottomNav; **admin = link "Células" (`Users2` → `/app/celulas`)**. Sem tag de papel, sem logout. ui-ux-pro-max; focus-visible.

- [ ] **Step 3: `BottomNav.jsx`** — fixo no rodapé (mobile `<768px`), só quando `usuario.celulaId`. Itens por papel (ícones lucide + rótulo, ativo destacado, safe-area `pb-[env(safe-area-inset-bottom)]`):
  - Membro: Início (`Home`,`/app`), Calendário (`CalendarDays`,`/app/calendario`), Perfil (`User`,`/app/perfil`).
  - Líder: + Minha Célula (`Users2`,`/app/celula/${usuario.celulaId}`) antes de Perfil.
  Usar `NavLink` com `end` na Início.

- [ ] **Step 4: `AppLayout.jsx`**:
```jsx
import { Outlet } from 'react-router-dom'
import { EncontrosProvider } from '../context/EncontrosContext.jsx'
import { TopBar } from './TopBar.jsx'
import { BottomNav } from './BottomNav.jsx'

export function AppLayout() {
  return (
    <EncontrosProvider>
      <div className="min-h-dvh bg-background">
        <TopBar />
        <main className="mx-auto w-full max-w-3xl px-5 py-6 pb-24 md:pb-6"><Outlet /></main>
        <BottomNav />
      </div>
    </EncontrosProvider>
  )
}
```

- [ ] **Step 4b: Criar stub `pages/Perfil.jsx`** (será substituído no T10; necessário para o build do Step 7 não quebrar):
```jsx
export default function Perfil() { return <div>Perfil</div> }
```

- [ ] **Step 5: Reestruturar `App.jsx`** — **PRESERVAR todas as rotas públicas** fora do layout (`/` Navigate→`/entrar`, `/c/:qrToken` QrLanding, `/entrar` Login, `/cadastro` Register, `/auth/google/sucesso` GoogleSucesso, `*` NotFound). Envolver **apenas** as rotas `/app*` num **layout route pathless** com filhas de **path absoluto** (sem `/app` duplicado). Adicionar imports no topo: `import { useAuth } from './context/AuthContext.jsx'`, `import { AppLayout } from './components/AppLayout.jsx'`, `import Perfil from './pages/Perfil.jsx'`. Criar `InicioOuCelulas` (decide o índice por papel):
```jsx
function InicioOuCelulas() {
  const { usuario } = useAuth()
  return usuario?.papel === 'ADMIN' ? <Navigate to="/app/celulas" replace /> : <AppHome />
}
// ...dentro de <Routes>, MANTENDO as rotas públicas existentes, e agrupando só as autenticadas:
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/app" element={<InicioOuCelulas />} />
  <Route path="/app/calendario" element={<Calendario />} />
  <Route path="/app/perfil" element={<Perfil />} />
  <Route path="/app/celulas" element={<Celulas />} />
  <Route path="/app/celula/:id" element={<CelulaDetalhe />} />
</Route>
```
(`ProtectedRoute` é só `({children})` — **sem** prop de papel; o gate de ADMIN para `/app/celulas` permanece **no backend** via `requireRole('ADMIN')`, como hoje. `ProtectedRoute` envolve o `AppLayout`, que tem `<Outlet/>`. `Navigate` já é importado hoje; senão importar de `react-router-dom`.)

- [ ] **Step 6: Ajustar `AppHome.jsx`/`Calendario.jsx`** — remover `<AppShell>` wrapper (renderizam só o conteúdo, dentro do `<main>` do layout). `Calendario` passa a ler `useEncontros()` em vez de fetch próprio.

- [ ] **Step 6b: Remover `<AppShell>` de `Celulas.jsx` e `CelulaDetalhe.jsx`** — senão renderizam header/nav DUPLICADOS dentro do `AppLayout`. Em `Celulas.jsx`, trocar o wrapper `<AppShell>…</AppShell>` por um fragmento/`<div>` com o conteúdo. Em `CelulaDetalhe.jsx`, fazer o mesmo nos **3 estados** (loading, erro, conteúdo). **Remover a linha `import { AppShell }` das 4 páginas** (AppHome, Calendario, Celulas, CelulaDetalhe) **antes** de apagar o arquivo. Conferir que `AppShell` não é mais importado (`grep -rn AppShell apps/web/src`); então deletar `AppShell.jsx` (o `ROTULO_PAPEL` já foi extraído para `lib/papeis.js` no Step 1b).

- [ ] **Step 7: Build + smoke** — `npm run build -w apps/web` → ok. Subir web (`npm run dev -w apps/web`) e conferir: navegação entre Início/Calendário não pisca; admin vai para Células; avatar abre Perfil (placeholder).

- [ ] **Step 8: Commit**
```bash
git add apps/web/src/context/EncontrosContext.jsx apps/web/src/components/AppLayout.jsx apps/web/src/components/TopBar.jsx apps/web/src/components/BottomNav.jsx apps/web/src/components/ui/Avatar.jsx apps/web/src/lib/papeis.js apps/web/src/App.jsx apps/web/src/pages/AppHome.jsx apps/web/src/pages/Calendario.jsx apps/web/src/pages/Celulas.jsx apps/web/src/pages/CelulaDetalhe.jsx
git commit -m "feat(web): layout route com EncontrosProvider, TopBar e BottomNav (remove AppShell duplicado)"
```

---

### Task 7: `framer-motion` + `ui/Sheet` + `AnimatedCheck` (CSS) + `usePresenca`

**Files:**
- Modify: `apps/web/package.json` (dep framer-motion)
- Create: `apps/web/src/components/ui/Sheet.jsx`, `components/AnimatedCheck.jsx`, `hooks/usePresenca.js`

**Interfaces:**
- Produces: `<Sheet open onClose aria-labelledby>`; `<AnimatedCheck marcado onToggle disabled />` (dispara animação CSS no toggle); `usePresenca(encontro)` → `{ marcado, salvando, erro, alternar, marcavel, motivo }`.
- Consumes: `useEncontros().atualizarPresenca`, `apiMarcarPresenca`/`apiDesmarcarPresenca`.

- [ ] **Step 1: Instalar framer-motion** — `npm i framer-motion@^12 -w apps/web`. Import correto na v12: `import { motion, AnimatePresence } from 'framer-motion'` (NÃO `motion/react`). Build para confirmar compat React 19.

- [ ] **Step 1b: Ajustar retornos em `api.js`** (consumidos pelo `usePresenca`):
```js
export async function apiMarcarPresenca(encontroId) {
  const { data } = await api.post(`/encontros/${encontroId}/presenca`)
  return data            // { presenca, totalPresencas }
}
export async function apiDesmarcarPresenca(encontroId) {
  const { data } = await api.delete(`/encontros/${encontroId}/presenca`)
  return data            // { totalPresencas }
}
```
(Único consumidor atual, `AppHome.jsx`, será reescrito no T8; não depende do retorno antigo.)

- [ ] **Step 2: `usePresenca.js`** (disable-durante-inflight + ignore-on-unmount + reconcilia ao servidor; sem refetch):
```jsx
import { useEffect, useRef, useState } from 'react'
import { apiMarcarPresenca, apiDesmarcarPresenca } from '../lib/api.js'
import { useEncontros } from '../context/EncontrosContext.jsx'

export function usePresenca(encontro) {
  const { atualizarPresenca } = useEncontros()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const vivo = useRef(true)
  useEffect(() => () => { vivo.current = false }, [])

  const marcado = !!encontro?.marcadoPorMim
  const agoraOk = encontro && new Date() >= new Date(encontro.data) && encontro.status !== 'CANCELADO'
  const marcavel = marcado || agoraOk // pode desmarcar sempre; marcar só se aberto
  const motivo = encontro?.status === 'CANCELADO' ? 'Reunião cancelada' : 'Disponível a partir do horário da reunião'

  async function alternar() {
    if (salvando || !encontro) return
    if (!marcado && !agoraOk) { setErro(motivo); return }
    setSalvando(true); setErro('')
    try {
      if (marcado) { const { totalPresencas } = await apiDesmarcarPresenca(encontro.id); if (vivo.current) atualizarPresenca(encontro.id, false, totalPresencas) }
      else { const { totalPresencas } = await apiMarcarPresenca(encontro.id); if (vivo.current) atualizarPresenca(encontro.id, true, totalPresencas) }
    } catch (e) {
      if (vivo.current) setErro(e?.response?.data?.erro || 'Não foi possível atualizar a presença.')
    } finally { if (vivo.current) setSalvando(false) }
  }
  return { marcado, salvando, erro, alternar, marcavel, motivo }
}
```

- [ ] **Step 3: `AnimatedCheck.jsx`** — botão acessível com animação **CSS pura**. Estrutura: `<button aria-pressed={marcado}>` + SVG de check com `stroke-dasharray`/`stroke-dashoffset` animado por classe quando `marcado`; overlay de partículas (spans) com keyframes; `navigator.vibrate?.(12)` no marcar; região `aria-live="polite"` montada sempre. `@media (prefers-reduced-motion: reduce)` desliga overlay/partículas. CSS no `index.css` (keyframes `desenhar-check`, `crescer-circulo`, `particula`). Props: `{ marcado, disabled, onToggle }`.

- [ ] **Step 4: `ui/Sheet.jsx`** — bottom sheet com framer-motion (`AnimatePresence`, slide+fade do rodapé, drag-to-dismiss `dragConstraints`/`onDragEnd`), `role="dialog"` `aria-modal` `aria-labelledby`, scrim `bg-black/50` tap-to-dismiss, **Esc** fecha, **scroll-lock** (`document.body.style.overflow='hidden'` enquanto aberto), focus-trap simples (focar o sheet ao abrir, restaurar ao fechar), respeita reduced-motion (sem drag/slide → fade simples). Props `{ open, onClose, tituloId, children }`.

- [ ] **Step 5: Build** — `npm run build -w apps/web` → ok.

- [ ] **Step 6: Commit**
```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/components/ui/Sheet.jsx apps/web/src/components/AnimatedCheck.jsx apps/web/src/hooks/usePresenca.js apps/web/src/lib/api.js apps/web/src/index.css
git commit -m "feat(web): Sheet (framer-motion), AnimatedCheck (CSS) e usePresenca"
```

---

### Task 8: Início — CheckInHero + MinhaFrequencia

**Files:**
- Create: `apps/web/src/components/CheckInHero.jsx`, `components/MinhaFrequencia.jsx`
- Modify: `apps/web/src/pages/AppHome.jsx`

**Interfaces:**
- Consumes: `useEncontros()`, `proximaReuniao`/`minhaFrequencia`, `usePresenca`, `AnimatedCheck`.

- [ ] **Step 1: `CheckInHero.jsx`** — recebe `encontro` (featured). Deriva estado: LOCKED (`now < data`), OPEN (`now>=data && !marcado`), CONFIRMED (`marcado`), CANCELLED. Mostra nome da célula, dia relativo (helper local conforme §6), horário grande (figuras tabulares `tabular-nums`), `_count.presencas`. No estado **CONFIRMED**, exibir "Presença confirmada" + (se `encontro.marcadaEm`) "às {formatarHora(marcadaEm)}". Usa `AnimatedCheck`/`usePresenca` para marcar/desmarcar. LOCKED: cadeado + "Abre {diaRelativo} às {hora}" + regressiva (<24h) com `setInterval` de 30s atualizando minuto (limpar no unmount). **Keyed por `encontro.id`**; effects dependem de `encontro.id`/`marcadoPorMim`/`_count.presencas`. Microcopy §6. Visual imersivo via ui-ux-pro-max (gradiente sutil da marca, card grande, hierarquia). Estado vazio (sem `encontro`): card "Nenhuma reunião agendada".

- [ ] **Step 2: `MinhaFrequencia.jsx`** — recebe `{presentes,total,streak}`; renderiza "Você esteve em X das últimas Y reuniões" + barra de progresso (largura `presentes/total`) + "{streak} seguidas" (oculto se streak<2). Discreto, estilo habit-tracker. Some se `total===0`.

- [ ] **Step 3: Reescrever `AppHome.jsx`** — usa `useEncontros()`; estados de carregando (Spinner) e sem-célula (estado vazio §6). Para membro/líder com célula: saudação (§6) + `CheckInHero encontro={proximaReuniao(encontros)}` + `MinhaFrequencia {...minhaFrequencia(encontros)}` + atalho "Ver todas as reuniões" → `/app/calendario`. (Admin já é redirecionado no T6.)

- [ ] **Step 4: Build + smoke** — `npm run build -w apps/web` → ok. Logar como `ana@icelula.app`/`123456`: herói marca com animação; desmarca; LOCKED em reunião futura; reflete no calendário sem piscar.

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/CheckInHero.jsx apps/web/src/components/MinhaFrequencia.jsx apps/web/src/pages/AppHome.jsx
git commit -m "feat(web): Início imersiva com CheckInHero e MinhaFrequencia"
```

---

### Task 9: Calendário — AttendanceCalendar + DiaDetalheSheet

**Files:**
- Create: `apps/web/src/components/AttendanceCalendar.jsx`, `components/DiaDetalheSheet.jsx`
- Modify: `apps/web/src/pages/Calendario.jsx`
- Delete: `apps/web/src/components/MiniCalendario.jsx` (substituído)

**Interfaces:**
- Consumes: `useEncontros()`, `chaveDiaLocal`, `usePresenca`, `AnimatedCheck`, `Sheet`.

- [ ] **Step 1: `AttendanceCalendar.jsx`** — grade mensal com navegação prev/próximo clampada (do mês do 1º encontro ao mês do último materializado). Mapa `chaveDiaLocal(data)→encontro`. Estados por dia (cor+ícone): Presente (marcado, passado/hoje) realce marca+check; Falta (passado, não-marcado, não-cancelado) contorno tracejado neutro; Futuro contorno tênue; Cancelado riscado; Hoje anel extra. Contorno dos dias de reunião na cor da marca. Toque num dia de reunião → `onSelecionar(encontro)`. Legenda (Presente/Faltou/Próxima/Cancelada) cor+ícone+texto. Acessível (botões com `aria-label` data+estado).

- [ ] **Step 2: `DiaDetalheSheet.jsx`** — usa `Sheet`; recebe `encontro`. Mostra data/hora, status, contagem, e `AnimatedCheck`/`usePresenca` (mesma trava: futuro → desabilitado com `motivo`). `tituloId` para `aria-labelledby`.

- [ ] **Step 3: Reescrever `Calendario.jsx`** — `useEncontros()`; estados carregando/sem-célula; `<AttendanceCalendar encontros onSelecionar={setSel} />` + `<DiaDetalheSheet open={!!sel} encontro={sel} onClose=... />` + `<CartaoGoogleCalendar/>` abaixo. Remover import/uso de `MiniCalendario`.

- [ ] **Step 4: Apagar `MiniCalendario.jsx`** e conferir que nada mais o importa (`grep -r MiniCalendario apps/web/src`).

- [ ] **Step 5: Build + smoke** — calendário mostra fui/faltei de relance; sheet marca retroativo com animação; reflete no herói ao voltar à Início (sem piscar).

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/components/AttendanceCalendar.jsx apps/web/src/components/DiaDetalheSheet.jsx apps/web/src/pages/Calendario.jsx
git rm apps/web/src/components/MiniCalendario.jsx
git commit -m "feat(web): calendário-mapa de presença com marcação retroativa via sheet"
```

---

### Task 10: Perfil — pages/Perfil + AvatarUpload + ui/Avatar

**Files:**
- Modify: `apps/web/src/components/ui/Avatar.jsx` (criado no T6 — enriquecer se necessário)
- Create: `apps/web/src/components/AvatarUpload.jsx`, `pages/Perfil.jsx`
- Modify: `apps/web/src/App.jsx` (trocar placeholder de `/app/perfil` por `Perfil`)

**Interfaces:**
- Consumes: `useAuth()` (usuario, aplicarUsuario, sair), `apiAtualizarPerfil`, `redimensionarImagem`, `formatarWhatsapp`, `mapearErroCampos`, `ROTULO_PAPEL` (de `lib/papeis.js`, criado no T6).

- [ ] **Step 1: Enriquecer `ui/Avatar.jsx`** (já criado no T6) se precisar de tamanho maior/variações para a tela de perfil; senão reutilizar como está.

- [ ] **Step 2: `AvatarUpload.jsx`** — `Avatar` grande + botão "Trocar foto" (input file `accept="image/*"` oculto) → `redimensionarImagem(file)` → preview + callback `onChange(dataUrl)`. Botão "Remover foto" (→ `onChange(null)`) quando há foto. Valida tamanho (já clampado em imagem.js); erro "Imagem muito grande" se necessário.

- [ ] **Step 3: `pages/Perfil.jsx`** — form (react-hook-form ou estado local): `AvatarUpload`, `Input` nome, `Input` whatsapp (`type="tel"`, placeholder "(62) 99999-9999", exibe `formatarWhatsapp` do valor salvo), e-mail read-only, badge papel (`ROTULO_PAPEL`). Salvar → `apiAtualizarPerfil({nome,whatsapp,avatar})`; sucesso "Salvo!"; erro via `mapearErroCampos` por campo + erro geral. Atualiza `aplicarUsuario(usuario)`. Seção "Preferências" com `ThemeToggle`. Botão "Sair" (logout) separado ao final. Mobile-first, ui-ux-pro-max.

- [ ] **Step 4: Rota** — em `App.jsx`, `/app/perfil` → `<Perfil/>`.

- [ ] **Step 5: Build + smoke** — sobe foto (testar foto de celular girada → sai na orientação certa), salva nome/WhatsApp; avatar aparece na TopBar; "Sair" funciona.

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/components/ui/Avatar.jsx apps/web/src/components/AvatarUpload.jsx apps/web/src/pages/Perfil.jsx apps/web/src/App.jsx
git commit -m "feat(web): tela de perfil com avatar (EXIF), nome e WhatsApp"
```

---

### Task 11: QA — build, a11y, responsividade, light/dark, reduced-motion

**Files:** nenhum novo (ajustes pontuais conforme achados).

- [ ] **Step 1: Suíte completa** — `npm test -w apps/api` e `npm test -w apps/web` → PASS. `npm run build -w apps/web` → ok.
- [ ] **Step 2: Responsividade** — DevTools em 375/768/1024: TopBar/BottomNav corretos por breakpoint; sem scroll horizontal; safe-area no rodapé.
- [ ] **Step 3: Light/dark** — alternar tema; conferir contraste AA do herói, calendário (estados), perfil, sheet.
- [ ] **Step 4: Reduced-motion** — ativar "Reduzir movimento"; check sem overlay/partículas, sheet sem slide; feedback textual mantido.
- [ ] **Step 5: A11y do sheet** — Esc fecha, foco preso, scroll-lock, `aria-modal`; teclado no herói (`button`, Enter/Space).
- [ ] **Step 6: Fluxos por papel** — membro (`ana@`), líder (`lider@`), admin (`admin@icelula.app/admin123`): navegação coerente; admin → Células; líder marca presença e acessa Minha Célula.
- [ ] **Step 7: Não-vazamento** — `GET /celulas/:id/encontros` e `/encontros/:id/presencas` não trazem `avatar`; resposta de presentes enxuta.
- [ ] **Step 8: Commit final**
```bash
git add -A
git commit -m "chore(web): ajustes de QA (a11y, responsividade, light/dark, reduced-motion)"
```

---

## Self-review (cobertura da spec)

- Gate por instante + DELETE livre → T4. Próxima reunião/streak → T5/T8. Avatar/WhatsApp + PUT /perfil → T1/T3/T10. publicoLeve (presença+células) → T2. marcadaEm/totalPresencas → T4. Estado compartilhado sem piscar (EncontrosProvider + layout route) → T6. TopBar/BottomNav por papel + redirect admin → T6. Check CSS + Sheet framer-motion + usePresenca → T7. Calendário-mapa + sheet retroativo → T9. EXIF → T5/T10. Migração sem TTY → T1. Microcopy §6 → T8/T9/T10. A11y/reduced-motion/responsivo → T11. Testes do gate reescritos → T4.
