# Fase A — Nível de Acesso × Qualificação — Plano de Implementação

> **For agentic workers:** executar com TDD, commits atômicos direto na `main`, `tsc`/`jest` verdes por task.
> Spec: `docs/superpowers/specs/2026-07-02-lideranca-nn-e-segmentacao-publico-design.md` (v5 final).

**Goal:** Separar o eixo único `Papel` em dois eixos ortogonais no `User`: **nível de acesso**
(`USUARIO<ADMIN<SUPER_ADMIN`, permissão) e **qualificação** (`CONVIDADO<MEMBRO<LOUVOR<COLIDER<LIDER<PASTOR`,
função), sem quebrar RBAC, aprovação, guards ou telas.

**Architecture:** RBAC continua com fonte única em `packages/shared`. `roles.js` passa a ser só nível; novo
`qualificacao.js`. Backend: `requireRole` só de nível + novo `requireGestor` (ADMIN+ OU qualificação ≥ LÍDER).
Migração Prisma em passos (banco praticamente vazio: 1 SUPER_ADMIN). Frontend: dois eixos exibidos, card com
tag de qualificação + ícone de nível no hover.

**Tech Stack:** npm workspaces, Fastify, Prisma/Postgres, React 19 + Vite + Tailwind v4, Vitest (web),
node:test (api), zod.

## Global Constraints
- Trabalho direto na `main`; cada task commitada verde (`npm test` web + `npm test -w apps/api` quando o DB
  docker estiver acessível; `tsc`/build web).
- Banco Postgres docker (`icelula-db`); host não alcança o DB — rodar migração via container/entrypoint.
- Marca prata/grafite; UI sempre com padrões existentes; ícones lucide.
- `SUPER_ADMIN` é tratado como `ADMIN` no match/vê tudo; nunca é opção de alvo.
- Não regredir Google login (standby).

---

### Task 1 — Shared: eixo de nível (`roles.js`) + eixo de qualificação (`qualificacao.js`)
**Files:** Modify `packages/shared/src/roles.js`; Create `packages/shared/src/qualificacao.js`; Modify
`packages/shared/src/index.js`; Modify `packages/shared/src/roles.test.js`; Create
`packages/shared/src/qualificacao.test.js`.
- `roles.js`: `NIVEL_RANK={USUARIO:1,ADMIN:2,SUPER_ADMIN:3}`, `ROTULO_NIVEL`, `TODOS_NIVEIS`, `temNivel`,
  `ehAdmin` (≥ADMIN), `ehSuperAdmin`, `podeEditarNivel(editor,atual,novo)` (mexer em ADMIN/SUPER só SUPER;
  promover a ADMIN só ADMIN+), `opcoesDeNivel`, `podeAgirSobreNivel`. Manter export de compat mínimo se
  necessário durante a transição.
- `qualificacao.js`: `QUALIFICACAO_RANK` (CONVIDADO=1…PASTOR=6), `ROTULO_QUALIFICACAO`, `TODAS_QUALIFICACOES`,
  `qualificacaoMinima(q,min)`, `ehGestorQualificacao` (≥LIDER), `podeCriarCelulaQualificacao` (LIDER|PASTOR),
  `podeEditarQualificacao(editorNivel, editorQualif, novo)`, `opcoesDeQualificacao(editorNivel)`.
- `index.js`: exportar ambos.
- Testes: rank/limiares, `ehGestorQualificacao`, `podeEditarNivel`, `podeCriarCelulaQualificacao`.
- TDD: escrever testes → falhar → implementar → passar → commit.

### Task 2 — Prisma: enums + colunas `nivelAcesso`/`qualificacao` (mantém `papel`) + backfill
**Files:** Modify `apps/api/prisma/schema.prisma`; new migration `..._nivel_qualificacao`.
- Add `enum NivelAcesso { USUARIO ADMIN SUPER_ADMIN }`, `enum Qualificacao { CONVIDADO MEMBRO LOUVOR COLIDER LIDER PASTOR }`.
- `User`: `nivelAcesso NivelAcesso @default(USUARIO)`, `qualificacao Qualificacao @default(CONVIDADO)`.
  Manter `papel` por ora.
- Migration SQL idempotente: cria tipos (`DO $$ ... IF NOT EXISTS`), `ADD COLUMN IF NOT EXISTS` com default,
  backfill: `MEMBRO→USUARIO/MEMBRO`, `LIDER→USUARIO/LIDER`, `ADMIN→ADMIN/MEMBRO`, `SUPER_ADMIN→SUPER_ADMIN/MEMBRO`.
- Aplicar via container; verificar `psql` que o super admin virou `SUPER_ADMIN`+`MEMBRO`.
- Commit.

### Task 3 — API `lib/roles.js`: `requireRole` (nível) + `requireAuth` + `requireGestor`
**Files:** Modify `apps/api/src/lib/roles.js`; Test `apps/api/src/lib/roles.test.js` (ou novo guard test).
- `requireRole(nivelMinimo,{permitirPendente})`: `select` inclui `nivelAcesso, qualificacao`; usa
  `temNivel(u.nivelAcesso, nivelMinimo)`; injeta `request.usuario={id,nivelAcesso,qualificacao,celulaId,aprovado}`.
- `requireAuth({permitirPendente})`: só exige sessão válida + ativo (+ aprovado salvo permitirPendente).
- `requireGestor({permitirPendente})`: passa se `ehAdmin(nivelAcesso)` OU `ehGestorQualificacao(qualificacao)`.
- Reexportar helpers de nível e qualificação.
- Testes (node:test) da matriz do guard: ADMIN ok; PASTOR/LIDER ok; MEMBRO/COLIDER → 403.

### Task 4 — Scripts de provisionamento gravam os dois eixos
**Files:** Modify `apps/api/prisma/seed.js`, `criar-admin.js`, `garantir-super-admin.js`.
- Substituir `papel:'X'` por `nivelAcesso`+`qualificacao` coerentes (super admin→SUPER_ADMIN/MEMBRO;
  admins→ADMIN/MEMBRO; líderes de seed→USUARIO/LIDER; membros→USUARIO/MEMBRO). Manter `papel` sincronizado
  enquanto a coluna existir (até Task 9).
- Verificar `garantir-super-admin` no entrypoint.

### Task 5 — Rotas: trocar guards e desacoplar célula↔papel (nível/qualificação)
**Files:** Modify `apps/api/src/routes/{celulas,usuarios,notificacoes,presenca,encontros,auth,perfil}.js`,
`apps/api/src/lib/escopo.js`.
- `requireRole('MEMBRO')`→`requireAuth`; `requireRole('LIDER')`→`requireGestor` nas 13 rotas.
- `escopo.js:podeGerenciarCelula`: `ehAdmin(usuario.nivelAcesso)` OU líder da célula (Fase A: `celula.liderId===usuario.id`).
- `celulas.js:129,357`: parar de escrever `papel`; escrever `qualificacao:'LIDER'` (promoção) sem tocar nível.
- `usuarios.js`: `aprovar` aceita `qualificacao` (default MEMBRO); `recusar` reseta `qualificacao:'MEMBRO'`;
  `PATCH /:id/papel` → `PATCH /:id/nivel` (podeEditarNivel) e `PATCH /:id/qualificacao` (podeEditarQualificacao);
  `PUT /:id` aceita só nome/whatsapp/ativo; `podeGerenciarPendente` inalterado na Fase A (celulaId escalar).
- `encontros.js`: `usuario.papel==='LIDER'/'MEMBRO'`→ via `podeGerenciarCelula`/nível.
- `auth.js`/`googleAuth.js`: register grava `nivelAcesso:'USUARIO'`+`qualificacao:'MEMBRO'`; JWT assina `nivelAcesso`.
- Atualizar zod: `usuario.schemas.js` (+ schema de `nivel`/`qualificacao`/aprovar).
- Testes de rota (rodam no CI): aprovar-com-qualificação; PATCH nivel/qualificação; guards.

### Task 6 — Frontend `lib/papeis.js`: `CORES_NIVEL` + `CORES_QUALIFICACAO` + helpers
**Files:** Modify `apps/web/src/lib/papeis.js`; Modify `apps/web/src/lib/papeis.test.js`.
- `CORES_NIVEL` (USUARIO: neutro; ADMIN: azul; SUPER_ADMIN: chrome) com ícone/label.
- `CORES_QUALIFICACAO` (6 valores, ícones lucide + cores próprias na marca).
- Reexportar helpers de nível+qualificação do shared; manter `CORES_STATUS`, `statusDeUsuario`.

### Task 7 — Frontend componentes: `NivelBadge`/`NivelSelect` + `QualificacaoBadge`/`QualificacaoSelect`
**Files:** Modify `apps/web/src/components/ui/RoleBadge.jsx` (generalizar) e `RoleSelect.jsx`; Create
`QualificacaoBadge`/`QualificacaoSelect` (ou parametrizar). Test `components/ui/selects.test.jsx`.
- Badge genérico por dicionário de cores; selects que recebem opções filtradas por permissão.

### Task 8 — Telas: Usuários (card + aprovação + editar), guards, Perfil/AvatarMenu
**Files:** Modify `apps/web/src/pages/admin/AdminUsuarios.jsx`, `App.jsx`, `pages/Perfil.jsx`,
`components/AvatarMenu.jsx`, `pages/CelulaDetalhe.jsx`, `pages/admin/AdminAvisos.jsx`, `lib/api.js`.
- Card "Todos": **tag de QUALIFICAÇÃO**; para ADMIN/SUPER, **ícone de nível** (cor própria) antes da tag, com
  hover (tooltip/title) mostrando o rótulo.
- Aprovação: seletor de qualificação (default MEMBRO) em `CardPendente` + lote; agrupar pendentes por célula.
- Modal "editar usuário": nome/whatsapp/ativo (PUT) + nível/qualificação (PATCH), conforme permissão.
- `App.jsx`: `SoLider`/`SoGestor` por **qualificação**; `SoAdmin`/`InicioOuCelulas` por **nível**.
- `Perfil`/`AvatarMenu`: exibir os dois eixos; admin/super troca a própria qualificação.
- `CelulaDetalhe.jsx:301`/`AdminAvisos.jsx:21`: `ehAdmin(nivelAcesso)`.

### Task 9 — Drop `papel` e enum `Papel`
**Files:** Modify `apps/api/prisma/schema.prisma`; new migration `..._drop_papel`; grep final por `papel`/`Papel`.
- Remover `User.papel` e `enum Papel` após confirmar que nada mais os usa (grep em api+web+shared).
- Migration `DROP COLUMN IF EXISTS "papel"` + `DROP TYPE IF EXISTS "Papel"`.
- Rodar suíte completa; build web; deploy só ao fim de TODAS as fases (A→B→C).

## Self-review (coverage)
Cobre: enums+migração (T2,T9), shared 2 eixos (T1), guards requireGestor/requireAuth (T3,T5), desacoplar
célula↔papel (T5), aprovação com qualificação + agrupamento (T5,T8), PATCH nivel/qualificacao + PUT (T5,T8),
frontend cores/badges/selects/card/guards/perfil (T6,T7,T8), scripts (T4). Ordem segura: shared→schema→guards→
rotas→frontend→drop. Testes por task.
