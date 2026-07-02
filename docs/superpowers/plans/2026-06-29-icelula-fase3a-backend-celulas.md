# iCélula — Fase 3A: Backend (Células, Cronograma, Encontros, Presença)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a API de gestão de células: CRUD de células (admin), atribuição de líder, cronograma com geração automática de encontros, edição de encontros, marcação de presença (janela do dia + 1) e relatórios de frequência.

**Architecture:** Novos módulos de rota no Fastify (`celulas.js` já existe para o endpoint público — será estendido; novos `encontros.js`, `presenca.js`) + utilitários puros (`lib/cronograma.js`) e um serviço de materialização (`lib/encontros.service.js`). Autorização hierárquica via `requireRole` + verificação de escopo de célula. Tudo testado com Vitest contra o Postgres local.

**Tech Stack:** Fastify 5, Prisma 6 + PostgreSQL, @fastify/jwt, zod 4, Vitest 3 (ESM).

## Global Constraints

- ESM em todo o projeto. Idioma do domínio e mensagens de erro em português.
- Papéis: `MEMBRO ⊂ LIDER ⊂ ADMIN`. Admin = global; Líder = escopo da própria `celulaId`; Membro = só a si.
- Enums já existentes: EncontroStatus `AGENDADO|REALIZADO|CANCELADO`; Papel `MEMBRO|LIDER|ADMIN`.
- **Geração de encontros:** horizonte padrão **90 dias** à frente da data atual; idempotente (unique `celulaId+data`); **nunca** altera/apaga encontros `REALIZADO`/`CANCELADO` nem encontros que já tenham presença.
- **Janela de presença:** um membro pode marcar presença num encontro quando `0 <= (hojeData - encontroData) <= 1` dia de calendário (ou seja, no dia do encontro ou no dia seguinte) e o encontro não está `CANCELADO`. Futuro (`< 0`) e além de 1 dia (`> 1`) são bloqueados.
- `qrToken` da célula: slug único derivado do nome + sufixo curto aleatório-determinístico (sem libs externas; ver Task 3).
- Respostas nunca incluem `senhaHash`. Reaproveitar `publico()` quando devolver usuários.
- Autorização aplicada no servidor em toda rota protegida.
- Commits em português terminando com: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- TDD: teste primeiro (RED), implementação (GREEN), suíte limpa antes de commitar.

## File Structure

```
apps/api/src/
├── lib/
│   ├── cronograma.js            # gerarDatasEncontros() — função pura (Task 1)
│   ├── cronograma.test.js
│   ├── encontros.service.js     # materializarEncontros() + janela de presença (Task 2)
│   ├── encontros.service.test.js
│   └── escopo.js                # podeGerenciarCelula() helper de autorização (Task 3)
├── routes/
│   ├── celulas.js               # ESTENDER: CRUD admin + atribuir líder (Task 3)
│   ├── celulas.test.js          # ESTENDER
│   ├── encontros.js             # listar/editar/avulso/estender (Task 4)
│   ├── encontros.test.js
│   ├── presenca.js              # marcar/desmarcar/listar/frequência (Task 5)
│   └── presenca.test.js
└── app.js                       # registrar encontroRoutes, presencaRoutes (Tasks 4,5)
```

---

### Task 1: Utilitário de cronograma (função pura)

**Files:**
- Create: `apps/api/src/lib/cronograma.js`
- Test: `apps/api/src/lib/cronograma.test.js`

**Interfaces:**
- Produces:
  - `gerarDatasEncontros({ dataPrimeiroEncontro: Date, frequenciaDias: number, ateData: Date }) → Date[]`
    Gera datas a partir de `dataPrimeiroEncontro`, somando `frequenciaDias` a cada passo, **inclusive** até `ateData`. Preserva a hora/minuto da data inicial. Lança `Error('frequenciaDias deve ser > 0')` se `frequenciaDias <= 0`. Se `dataPrimeiroEncontro > ateData`, retorna `[]`.

- [ ] **Step 1: Escrever o teste — `cronograma.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { gerarDatasEncontros } from './cronograma.js'

describe('gerarDatasEncontros', () => {
  it('gera semanal (7 dias) preservando o horário', () => {
    const datas = gerarDatasEncontros({
      dataPrimeiroEncontro: new Date('2026-07-02T19:30:00'),
      frequenciaDias: 7,
      ateData: new Date('2026-07-23T23:59:59')
    })
    expect(datas.map((d) => d.toISOString())).toEqual([
      new Date('2026-07-02T19:30:00').toISOString(),
      new Date('2026-07-09T19:30:00').toISOString(),
      new Date('2026-07-16T19:30:00').toISOString(),
      new Date('2026-07-23T19:30:00').toISOString()
    ])
  })

  it('gera quinzenal (14 dias)', () => {
    const datas = gerarDatasEncontros({
      dataPrimeiroEncontro: new Date('2026-07-02T19:30:00'),
      frequenciaDias: 14,
      ateData: new Date('2026-08-01T00:00:00')
    })
    expect(datas).toHaveLength(3) // 02/07, 16/07, 30/07
  })

  it('retorna vazio se a primeira data já passou do limite', () => {
    expect(
      gerarDatasEncontros({
        dataPrimeiroEncontro: new Date('2026-09-01T19:30:00'),
        frequenciaDias: 7,
        ateData: new Date('2026-08-01T00:00:00')
      })
    ).toEqual([])
  })

  it('rejeita frequência inválida', () => {
    expect(() =>
      gerarDatasEncontros({
        dataPrimeiroEncontro: new Date('2026-07-02T19:30:00'),
        frequenciaDias: 0,
        ateData: new Date('2026-08-01T00:00:00')
      })
    ).toThrow('frequenciaDias deve ser > 0')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm run test --workspace apps/api` → FALHA (módulo não encontrado).

- [ ] **Step 3: Implementar `cronograma.js`**

```js
const MS_POR_DIA = 24 * 60 * 60 * 1000

export function gerarDatasEncontros({ dataPrimeiroEncontro, frequenciaDias, ateData }) {
  if (!(frequenciaDias > 0)) throw new Error('frequenciaDias deve ser > 0')
  const datas = []
  let atual = new Date(dataPrimeiroEncontro)
  while (atual.getTime() <= ateData.getTime()) {
    datas.push(new Date(atual))
    atual = new Date(atual.getTime() + frequenciaDias * MS_POR_DIA)
  }
  return datas
}
```

- [ ] **Step 4: Rodar e ver passar.** **Step 5: Commit** `Fase3A: utilitário de cronograma (gerarDatasEncontros)`.

---

### Task 2: Serviço de materialização de encontros + janela de presença

**Files:**
- Create: `apps/api/src/lib/encontros.service.js`
- Test: `apps/api/src/lib/encontros.service.test.js`

**Interfaces:**
- Consumes: `prisma` (`../prisma.js`), `gerarDatasEncontros` (`./cronograma.js`).
- Produces:
  - `materializarEncontros(celulaId, { horizonteDias = 90, agora = new Date() }) → Promise<number>`
    Lê a célula; gera datas de `dataPrimeiroEncontro` até `agora + horizonteDias`; cria os `Encontro` faltantes (status `AGENDADO`). **Idempotente**: usa `createMany({ skipDuplicates: true })` apoiado no unique `(celulaId, data)`. Não altera encontros existentes. Retorna a quantidade criada. Se a célula não existe, lança `Error('Célula não encontrada')`.
  - `podeMarcarPresenca(encontro, agora = new Date()) → { ok: boolean, motivo?: string }`
    Regra da janela: bloqueia se `encontro.status === 'CANCELADO'` (`motivo: 'Encontro cancelado'`); calcula `dias = diferençaEmDiasDeCalendario(agora, encontro.data)`; se `dias < 0` → `motivo: 'Encontro ainda não aconteceu'`; se `dias > 1` → `motivo: 'Prazo para marcar presença expirou'`; senão `{ ok: true }`.
  - `diferencaEmDiasDeCalendario(a, b) → number` (exportada; zera horas e divide por dia; resultado = dias de `bData` em relação a `aData`, i.e. `floor((aMeiaNoite - bMeiaNoite)/dia)`).

- [ ] **Step 1: Teste — `encontros.service.test.js`** (parte unitária da janela + parte de materialização contra o banco)

```js
import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../prisma.js'
import {
  materializarEncontros,
  podeMarcarPresenca,
  diferencaEmDiasDeCalendario
} from './encontros.service.js'

const sufixo = Date.now()
const qrToken = `qr-svc-${sufixo}`
let celulaId

afterAll(async () => {
  await prisma.encontro.deleteMany({ where: { celulaId } })
  await prisma.celula.deleteMany({ where: { id: celulaId } })
  await prisma.$disconnect()
})

describe('podeMarcarPresenca (janela do dia + 1)', () => {
  const base = new Date('2026-07-10T19:30:00')
  it('permite no dia do encontro', () => {
    expect(podeMarcarPresenca({ status: 'AGENDADO', data: base }, new Date('2026-07-10T21:00:00')).ok).toBe(true)
  })
  it('permite no dia seguinte', () => {
    expect(podeMarcarPresenca({ status: 'AGENDADO', data: base }, new Date('2026-07-11T08:00:00')).ok).toBe(true)
  })
  it('bloqueia 2 dias depois', () => {
    const r = podeMarcarPresenca({ status: 'AGENDADO', data: base }, new Date('2026-07-12T08:00:00'))
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/expirou/i)
  })
  it('bloqueia no futuro', () => {
    const r = podeMarcarPresenca({ status: 'AGENDADO', data: base }, new Date('2026-07-09T08:00:00'))
    expect(r.ok).toBe(false)
  })
  it('bloqueia encontro cancelado', () => {
    expect(podeMarcarPresenca({ status: 'CANCELADO', data: base }, base).ok).toBe(false)
  })
})

describe('diferencaEmDiasDeCalendario', () => {
  it('mesmo dia = 0; dia seguinte = 1', () => {
    expect(diferencaEmDiasDeCalendario(new Date('2026-07-10T23:00:00'), new Date('2026-07-10T01:00:00'))).toBe(0)
    expect(diferencaEmDiasDeCalendario(new Date('2026-07-11T00:30:00'), new Date('2026-07-10T23:00:00'))).toBe(1)
  })
})

describe('materializarEncontros', () => {
  it('cria encontros idempotentemente e não duplica', async () => {
    const c = await prisma.celula.create({
      data: {
        nome: 'Célula Svc', qrToken, diaSemana: 4, frequenciaDias: 7,
        dataPrimeiroEncontro: new Date('2026-07-02T19:30:00')
      }
    })
    celulaId = c.id
    const agora = new Date('2026-07-20T00:00:00')
    const criados1 = await materializarEncontros(celulaId, { horizonteDias: 90, agora })
    expect(criados1).toBeGreaterThan(0)
    const criados2 = await materializarEncontros(celulaId, { horizonteDias: 90, agora })
    expect(criados2).toBe(0) // idempotente
    const total = await prisma.encontro.count({ where: { celulaId } })
    expect(total).toBe(criados1)
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Implementar `encontros.service.js`**

```js
import { prisma } from '../prisma.js'
import { gerarDatasEncontros } from './cronograma.js'

const MS_POR_DIA = 24 * 60 * 60 * 1000

export function diferencaEmDiasDeCalendario(a, b) {
  const meiaNoite = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((meiaNoite(a) - meiaNoite(b)) / MS_POR_DIA)
}

export function podeMarcarPresenca(encontro, agora = new Date()) {
  if (encontro.status === 'CANCELADO') return { ok: false, motivo: 'Encontro cancelado' }
  const dias = diferencaEmDiasDeCalendario(agora, new Date(encontro.data))
  if (dias < 0) return { ok: false, motivo: 'Encontro ainda não aconteceu' }
  if (dias > 1) return { ok: false, motivo: 'Prazo para marcar presença expirou' }
  return { ok: true }
}

export async function materializarEncontros(celulaId, { horizonteDias = 90, agora = new Date() } = {}) {
  const celula = await prisma.celula.findUnique({ where: { id: celulaId } })
  if (!celula) throw new Error('Célula não encontrada')
  const ateData = new Date(agora.getTime() + horizonteDias * MS_POR_DIA)
  const datas = gerarDatasEncontros({
    dataPrimeiroEncontro: celula.dataPrimeiroEncontro,
    frequenciaDias: celula.frequenciaDias,
    ateData
  })
  if (datas.length === 0) return 0
  const res = await prisma.encontro.createMany({
    data: datas.map((data) => ({ celulaId, data })),
    skipDuplicates: true
  })
  return res.count
}
```

- [ ] **Step 4: GREEN.** **Step 5: Commit** `Fase3A: serviço de materialização de encontros + janela de presença`.

---

### Task 3: Rotas de células (CRUD admin + atribuir líder) + helper de escopo

**Files:**
- Create: `apps/api/src/lib/escopo.js`
- Modify: `apps/api/src/routes/celulas.js` (já existe com o endpoint público)
- Modify: `apps/api/src/routes/celulas.test.js`

**Interfaces:**
- Consumes: `prisma`, `requireRole`, `materializarEncontros`, `temNivel`.
- Produces (`escopo.js`):
  - `podeGerenciarCelula(usuario, celula) → boolean` — `true` se `usuario.papel === 'ADMIN'`, ou se `usuario.papel === 'LIDER'` e `celula.liderId === usuario.id`.
  - `slugify(nome) → string` — minúsculas, sem acento, hífens; sem libs externas.
  - `gerarQrToken(nome, sufixo) → string` — `slugify(nome) + '-' + sufixo` (sufixo curto fornecido pelo chamador, ex.: derivado do id criado).
- Produces (rotas, todas além do `GET /public/celula/:qrToken` já existente):
  - `POST /celulas` (ADMIN) body `{ nome, descricao?, diaSemana, frequenciaDias, dataPrimeiroEncontro, liderId? }` → 201 `{ celula }`. Gera `qrToken` único (slug do nome + sufixo do `id`/contador até ser único). Se `liderId` informado, valida o usuário e o promove a `LIDER` daquela célula (seta `papel='LIDER'`, `celulaId`). Após criar, chama `materializarEncontros(celula.id)`. Body inválido → 400.
  - `GET /celulas` (LIDER+) → ADMIN vê todas; LIDER vê só a(s) que lidera. Cada item inclui contagem de membros e de encontros.
  - `GET /celulas/:id` (escopo) → `{ celula }` com líder (público) e contadores; 403 se fora do escopo; 404 se não existe.
  - `PUT /celulas/:id` (escopo) → atualiza `nome|descricao|diaSemana|frequenciaDias|dataPrimeiroEncontro|ativa`. Se mudar `frequenciaDias`/`dataPrimeiroEncontro`, **re-materializa** encontros futuros: apaga encontros `AGENDADO` futuros SEM presença e chama `materializarEncontros` de novo (não toca em `REALIZADO`/`CANCELADO`/com presença). → `{ celula }`.
  - `POST /celulas/:id/lider` (ADMIN) body `{ userId }` → promove o usuário a `LIDER` da célula e rebaixa o líder anterior, se houver, a `MEMBRO`. → `{ celula }`.
  - `DELETE /celulas/:id` (ADMIN) → remove a célula (cascateia encontros/presenças via schema). → 204.

> O implementador deve seguir o padrão de `auth.js` (validação com zod inline ou schema, `reply.code().send({ erro })`, `requireRole`). Criar schemas zod locais para o corpo de célula (campos e tipos acima). Carregar a célula e checar `podeGerenciarCelula` nas rotas de escopo.

- [ ] **Step 1: Testes em `celulas.test.js`** (manter os 2 testes públicos existentes e ADICIONAR), cobrindo: criar célula como admin (201, gera qrToken, materializa encontros > 0); negar criação para membro (403); atribuir líder (POST /lider promove e o usuário vira LIDER); LIDER vê só a própria em GET /celulas; LIDER não acessa célula de outro (403); editar frequência re-materializa; deletar (204). Usar dados únicos por execução e limpar tudo no `afterAll` (encontros → presenças → usuários → células, em ordem FK-safe). Logar via `app.inject` com tokens assinados (criar admin/líder/membro de teste via prisma + `app.jwt.sign`, ou reaproveitar /auth para obter tokens).

- [ ] **Step 2: RED.** **Step 3: Implementar** `escopo.js` e as rotas em `celulas.js`. **Step 4: GREEN** (todos os testes de célula + suíte). **Step 5: Commit** `Fase3A: CRUD de células (admin), atribuição de líder e helper de escopo`.

---

### Task 4: Rotas de encontros (listar, editar, avulso, estender)

**Files:**
- Create: `apps/api/src/routes/encontros.js`
- Modify: `apps/api/src/app.js` (registrar `encontroRoutes`)
- Test: `apps/api/src/routes/encontros.test.js`

**Interfaces:**
- Consumes: `prisma`, `requireRole`, `podeGerenciarCelula` (`../lib/escopo.js`), `materializarEncontros` (`../lib/encontros.service.js`).
- Produces:
  - `GET /celulas/:id/encontros` (MEMBRO+ no escopo da célula; membro só se for da célula) query `?desde&ate` opcional → `{ encontros }` ordenados por data, cada um com contagem de presenças. Membro da célula pode listar; líder/admin no escopo também.
  - `PUT /encontros/:id` (LIDER/ADMIN no escopo) body `{ data?, status?, observacao? }` → atualiza um encontro (mover data, marcar `REALIZADO`/`CANCELADO`, observação). 403 fora de escopo. → `{ encontro }`.
  - `POST /celulas/:id/encontros` (LIDER/ADMIN no escopo) body `{ data, observacao? }` → cria encontro avulso (status `AGENDADO`); 409 se já existe encontro naquela data (unique). → 201 `{ encontro }`.
  - `POST /celulas/:id/encontros/estender` (LIDER/ADMIN) body `{ horizonteDias? }` (default 90) → chama `materializarEncontros` → `{ criados }`.
  - `encontroRoutes(app)` registrado em `buildApp()`.

- [ ] **Step 1: Testes** cobrindo: listar encontros de uma célula (membro da célula consegue; estranho 403/empty); editar encontro como líder (status→REALIZADO); membro não edita (403); criar avulso (201) e duplicado (409); estender gera mais quando horizonte aumenta. Limpeza FK-safe no `afterAll`.
- [ ] **Step 2: RED.** **Step 3: Implementar** `encontros.js` + registrar em `app.js`. **Step 4: GREEN.** **Step 5: Commit** `Fase3A: rotas de encontros (listar/editar/avulso/estender)`.

---

### Task 5: Rotas de presença (marcar, desmarcar, listar, frequência)

**Files:**
- Create: `apps/api/src/routes/presenca.js`
- Modify: `apps/api/src/app.js` (registrar `presencaRoutes`)
- Test: `apps/api/src/routes/presenca.test.js`

**Interfaces:**
- Consumes: `prisma`, `requireRole`, `podeMarcarPresenca` (`../lib/encontros.service.js`), `podeGerenciarCelula`.
- Produces:
  - `POST /encontros/:id/presenca` (MEMBRO+; marca a PRÓPRIA presença) → valida a janela com `podeMarcarPresenca`; 403 com `{ erro: motivo }` se fora da janela; exige que o usuário pertença à célula do encontro (senão 403); idempotente (já marcou → 200 com a presença existente). → 201 `{ presenca }`.
  - `DELETE /encontros/:id/presenca` (MEMBRO+; remove a própria) → 204. (Permitido só dentro da mesma janela.)
  - `GET /encontros/:id/presencas` (LIDER/ADMIN no escopo) → `{ presencas }` com usuário público (nome) e total.
  - `GET /celulas/:id/frequencia` (LIDER/ADMIN no escopo) → relatório:
    `{ totalEncontrosRealizados, porPessoa: [{ userId, nome, presencas, percentual }], ranking: [...desc por presencas], ausentes: [{ userId, nome }] }`.
    Considera encontros já ocorridos (`data <= agora` ou status `REALIZADO`). `ausentes` = membros da célula sem nenhuma presença.
  - `presencaRoutes(app)` registrado em `buildApp()`.

- [ ] **Step 1: Testes** cobrindo: membro marca presença num encontro de hoje (201) e repetido é idempotente (200); marcar em encontro futuro → 403 com motivo; marcar fora da janela (2+ dias) → 403; membro de outra célula → 403; líder lista presenças (vê o nome, sem senhaHash); frequência retorna contagem/ranking/ausentes coerentes. Criar encontros com datas controladas via prisma e passar "agora" — como as rotas usam `new Date()` real, criar encontros com `data` = hoje (no teste, `new Date()`), garantindo a janela. Limpeza FK-safe.
- [ ] **Step 2: RED.** **Step 3: Implementar** `presenca.js` + registrar. **Step 4: GREEN** (suíte completa). **Step 5: Commit** `Fase3A: rotas de presença (marcar/desmarcar/listar) e relatório de frequência`.

---

## Self-Review

**1. Cobertura (Fase 3A vs decisões):**
- Geração 90 dias + idempotente + preserva realizados/cancelados/com presença → Tasks 2, 3 (re-materialização no PUT). ✅
- Estender → Task 4. ✅
- Janela de presença dia + 1 → Task 2 (`podeMarcarPresenca`) usada na Task 5. ✅
- Admin CRUD célula + atribuir líder → Task 3. ✅
- Líder escopo próprio (cronograma/encontros/presença/frequência) → Tasks 3,4,5 via `podeGerenciarCelula`. ✅
- Membro marca própria presença + lista encontros da sua célula → Tasks 4,5. ✅
- Relatórios (frequência/ranking/ausentes) → Task 5. ✅

**2. Placeholders:** Código completo nas funções de lógica (cronograma, materialização, janela). Rotas: contratos exatos (endpoints, papéis, corpos, status, regras) + padrão de referência (`auth.js`) — o implementador segue o padrão existente do repo. Sem "TBD".

**3. Consistência de tipos/nomes:** `gerarDatasEncontros` (T1) → usado em `materializarEncontros` (T2) → usado em Tasks 3,4. `podeMarcarPresenca`/`diferencaEmDiasDeCalendario` (T2) → Task 5. `podeGerenciarCelula`/`slugify`/`gerarQrToken` (T3) → Tasks 4,5. `encontroRoutes`/`presencaRoutes` registrados em `app.js` (Tasks 4,5). Enums e `publico()` reaproveitados.

Pronto para execução.
