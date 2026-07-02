# Reforma UI/RBAC/Células — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans` (execução inline, checkpoints). Frontend SEMPRE com `ui-ux-pro-max`. Steps em checkbox (`- [ ]`).

**Status:** **plano v3 (FINAL)** (v1 → R1 → v2 → R2 → v3 — segue para implementação). **Spec:** `docs/superpowers/specs/2026-07-02-reforma-ui-rbac-celulas-design.md` (v3).

**Goal:** Reformar UI (prata cromado, nível Insights), RBAC (admin nomeia admin; super = dono) e fluxos (aprovação do líder, seleção de célula, cadastro de célula) sem regressão, cada fase deployável na `main`.
**Architecture:** Monorepo npm (`apps/api` Fastify+Prisma; `apps/web` React 19+Vite+Tailwind v4, primitivos próprios). Primitivos primeiro, depois RBAC backend (TDD), depois telas por área. Direto na `main`, commits atômicos.
**Tech Stack:** React 19, Vite, Tailwind v4, framer-motion, react-hook-form, zod, lucide, **vitest (api E web)**, Fastify, Prisma/Postgres.

## 0. Histórico de revisões (v1 → v2, incorpora Review 1 do plano)
- **A1** Guard `PUT /:id` **exempta o próprio usuário** (`id !== request.usuario.id`) — senão quebra auto-edição e o teste "auto-inativa→400". SUPER→SUPER: guard deixa passar (só checa alvo super quando editor≠super — ver 1.2).
- **A2** Coerência dia×data: weekday derivado dos **componentes da string** via `Date.UTC(y,m-1,d).getUTCDay()` (TZ-independente), **não** `new Date(str).getUTCDay()`. Teste noturno sob TZ BRT.
- **A3** Entrypoint chama `garantir-super-admin` **incondicionalmente** (default do script age); script instancia `PrismaClient` e `$disconnect()`.
- **A4** Task de rotas edita **`InicioOuCelulas`** (admin sem célula → `/app/admin/usuarios`) e os `to:` dos links admin, evitando duplo-redirect.
- **P1** Fase 3 reordenada: telas admin **primeiro**; **redirects na última task**.
- **P2/P3/P5/M5** Extrair funções puras testáveis: `opcoesDePapel`/`podeAgirSobre` (RBAC-UI), `mapBackEstadoCivil`, `montarPayloadCelula` — com teste-first.
- **P4** Novo primitivo **`Popover`** (Fase 0) antes de `RoleSelect`; reusado na legenda "?".
- **P6** `AdminUsuarios` quebrada em **3.4a Pendentes** / **3.4b Todos**.
- **P7/M3** `migrate dev` roda contra **DB local**; commita só `migration.sql`; build faz `prisma generate`; **`cep` em `enderecoFields`** (create+update); remover `agente schema-changed` (modo main).
- **P8** 4.x: refine só liga **após** o front mandar wall-clock (ordem: front primeiro, refine depois) — ou aterrissam juntos.
- **P10** `.chrome`/foco (CSS) vira **Task 0.0** (início da Fase 0).
- **M1** Badge de pendências: task com contagem + fiação no switcher, item Usuários e **Sino**.
- **M2** Aprovação em massa = **loop client-side** com erro parcial + Toast agregado (sem endpoint bulk).
- **M4** Task 2.2 removida (admin inativo nem carrega `/me`; fix é operacional em 2.1).
- **B1/B2** vitest (não jest); schema é `updateCelulaSchema`.

## 0b. Histórico v2 → v3 (incorpora Review 2 do plano)
- **R2#1 [bloqueante]** Front sem infra de teste React: `apps/web/vitest.config.js` é `environment:'node'`, `include:['test/**/*.test.js']`, **sem jsdom/@testing-library**, e não coleta `src/**`. → nova **Task 0.-1** instala `@testing-library/react`+`jsdom`+`jest-dom`, ajusta `vitest.config.js` (`jsdom`, `include: ['src/**/*.test.{js,jsx}','test/**/*.test.{js,jsx}']`, `setupFiles`). **Local canônico dos testes: co-locado em `src/`.**
- **R2#2 [bloqueante]** `.refine` recebe Date já coagida (`z.coerce.date`) → `getUTCDay` reintroduz fuso (quarta 21:00 BRT→400). → no **create schema**, `dataPrimeiroEncontro: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)`; refine dá split da string → `new Date(Date.UTC(y,mo-1,d)).getUTCDay()`; **handler** grava `new Date(Date.UTC(y,mo-1,d,hh,mm))` (consistente com materialização). Ver Task 4.2.
- **R2#3** RBAC único em `@icelula/shared`: mover `podeEditarPapel` para o pacote shared; derivar `opcoesDePapel`/`podeAgirSobre` lá; front e back **importam** (mata a cópia órfã em `Usuarios.jsx:86` e evita divergência). Testar a matriz no shared.
- **R2#4** Guard `PUT` super↔super: usar `(alvo.papel==='SUPER_ADMIN' && editor!=='SUPER_ADMIN')` (deixa SUPER editar SUPER, coerente com `podeEditarPapel`); teste "SUPER edita SUPER→200".
- **R2#5** Cortar "alimentar o Sino" (scope creep no modelo `Notificacao`): badge de pendências fica **só** no `ContextSwitcher` + item "Usuários" (satisfaz P8). Sino apenas **preservado** (verificar no browser).
- **R2#6** Task 0.14 ganha `ErrorState` (variante com "Tentar de novo") — §4.3.8/§8.10.
- **R2#8** Bug `string→number` **já corrigido no front** (`Celulas.jsx:48-49` usa `Number`); o coerce no backend (4.2) é **hardening** direto na API, não repro pela tela.

## Global Constraints (verbatim)
- Direto na `main`; deploy por push; `docker/entrypoint.sh` já roda `prisma:deploy` antes do boot; cada fase deployável.
- Marca **prata cromada** (`--brand #64748b`/`#b9c1cd`); Inter/Sora; dark por classe.
- Chip: `bg-{cor}-500/10 border border-{cor}-500/30 text-{cor}-700 dark:text-{cor}-400` + ícone + texto. Papéis: Membro zinc/Eye, Líder amber/Shield, Admin blue/ShieldCheck, Super purple/Crown. Status: Em aprovação amber/Clock, Ativo emerald/UserCheck, Inativo red/UserX.
- Foco único: `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
- Larguras: admin `max-w-6xl`; forms `max-w-2xl`; membro `max-w-3xl`. 150–300ms; reduced-motion; toque ≥44px.
- Frontend sempre `ui-ux-pro-max`. Local `npm run app:up`→http://localhost:3200. `npm test` verde antes do commit de fase.
- Não mover `materializarEncontros`; não validar `diaSemana` no check-in; estado civil grava só em transição.

---

## FASE 0 — Fundação de UI

### Task 0.-1: Infra de teste React no `apps/web` (R2#1 — bloqueante) — Modify `apps/web/package.json`, `apps/web/vitest.config.js`; Create `apps/web/test/setup.js`
- [ ] **Step 1:** Instalar devDeps: `npm i -D -w apps/web @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom jsdom`.
- [ ] **Step 2:** `vitest.config.js`: `test:{ environment:'jsdom', globals:true, setupFiles:'./test/setup.js', include:['src/**/*.test.{js,jsx}','test/**/*.test.{js,jsx}'] }`.
- [ ] **Step 3:** `test/setup.js`: `import '@testing-library/jest-dom'`.
- [ ] **Step 4:** Smoke test `src/lib/_smoke.test.js` (`expect(1+1).toBe(2)`) + um render trivial com `@testing-library/react` → `npm test -w apps/web` PASS; remover o smoke depois.
- [ ] **Step 5:** Confirmar que os testes web existentes em `test/*.test.js` continuam verdes sob jsdom.
- [ ] **Step 6:** Commit `chore(web): infra de teste React (jsdom + testing-library)`.

### Task 0.0: `index.css` — `.chrome` + util de foco (mover pro início, P10)
**Files:** Modify `apps/web/src/index.css`.
- [ ] **Step 1:** Adicionar `.chrome { background-image: linear-gradient(180deg,#8b95a5 0%,#6b7280 45%,#515e70 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 -1px 2px rgba(0,0,0,.18); color: var(--on-brand);}` + `.dark .chrome { background-image: linear-gradient(180deg,#e6ebf1 0%,#c3ccd7 50%,#aab4c2 100%);}` + `.foco { @apply outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background; }`.
- [ ] **Step 2:** Verificar no browser (dark/light) que `.chrome` fica metálico e texto AA.
- [ ] **Step 3:** Commit `feat(ui): acabamento cromado (.chrome) + util de foco`.

### Task 0.1: Extrair `useOverlayDismiss` do Sheet (F2)
**Files:** Create `apps/web/src/hooks/useOverlayDismiss.js`; Modify `components/ui/Sheet.jsx`; Test `hooks/useOverlayDismiss.test.jsx`.
**Interfaces:** Produces `useOverlayDismiss(open, onClose, panelRef): void` — scroll-lock `document.body`, focus-trap (Tab/Shift+Tab) em `panelRef`, Esc→onClose, restaura foco anterior no close.
- [ ] Step 1: teste (abrir→overflow hidden; Tab cicla; Esc→onClose; fechar→overflow e foco restaurados). Step 2: FAIL. Step 3: mover a lógica inline de `Sheet.jsx` (useEffect 17–74) para o hook. Step 4: refatorar Sheet consumindo o hook, mantendo drag e `tituloId`. Step 5: testes Sheet+novo PASS; verificar drag no browser. Step 6: Commit `refactor(ui): extrai useOverlayDismiss do Sheet`.
- [ ] **CHECKPOINT (P9):** Sheet sem regressão de drag/restore antes de seguir.

### Task 0.2: `lib/papeis.js` — CORES_PAPEL/CORES_STATUS + ehLider/ehGestor + funções RBAC-UI (P2)
**Files:** Modify `lib/papeis.js`; Test `lib/papeis.test.js`.
**Interfaces:** `CORES_PAPEL`, `CORES_STATUS` (`{chip,icon,label}`), `ehLider`, `ehGestor`; **`opcoesDePapel(editorPapel, alvoPapel): Papel[]`** (papéis que o editor pode atribuir ao alvo, via `podeEditarPapel`) e **`podeAgirSobre(editorPapel, alvo): boolean`** (pode ativar/desativar/editar: false se alvo é si, super, ou admin quando editor≠super).
- [ ] Step 1: testes — `ehGestor('LIDER')` true; `CORES_PAPEL.ADMIN.chip` tem `blue`/`text-blue-700 dark:text-blue-400`; `opcoesDePapel('ADMIN','MEMBRO')` inclui `MEMBRO,LIDER,ADMIN` e **não** `SUPER_ADMIN`; `opcoesDePapel('ADMIN','ADMIN')` **não** permite rebaixar (só super); `podeAgirSobre('ADMIN', {papel:'ADMIN',id:'x'})` false; `podeAgirSobre('SUPER_ADMIN',{papel:'ADMIN'})` true.
- [ ] Step 2: FAIL. Step 3: `opcoesDePapel`/`podeAgirSobre` **derivam de `podeEditarPapel` importado de `@icelula/shared`** (R2#3 — fonte única; NÃO replicar a regra). `lib/papeis.js` só re-exporta + adiciona cores/ícones. **Remover a cópia órfã** de `podeEditarPapel` em `pages/Usuarios.jsx:86`. Step 4: PASS. Step 5: Commit `feat(ui): cores/roles + opcoesDePapel/podeAgirSobre (via @icelula/shared)`.
  > Depende da Task 1.1 ter movido `podeEditarPapel` para `@icelula/shared` — se a Fase 1 vier depois, mova o RBAC para o shared já nesta task (a Task 1.1 então só importa).

### Task 0.3: `lib/mascaras.js` (CEP/telefone) — Create+test
`mascaraCep`(→`00000-000`), `mascaraTelefone`(→`(00) 00000-0000`), `soDigitos`. Teste com entrada suja. FAIL→impl→PASS→commit.

### Task 0.4: `lib/avatarCor.js` (P3) — Create+test
`corDoNome(nome)→{bg:'hsl(h,22%,42%)',fg}` determinístico (hash charCodes%360). Teste determinismo. FAIL→impl→PASS→commit.

### Task 0.5: `lib/cidades.js` — Create+test
`CIDADES` (capitais + municípios GO/BR comuns, ~120), `filtrarCidades(q)`. Teste `filtrarCidades('goi')` inclui `Goiânia`. FAIL→impl→PASS→commit.

### Task 0.6: `Checkbox.jsx` — Create+test
`<Checkbox checked onChange label id disabled/>` (input nativo estilizado, `.foco`, 44px). Teste `getByLabelText`+espaço alterna. FAIL→impl→PASS→commit.

### Task 0.7: `Popover.jsx` (P4) — Create+test
**Interfaces:** `<Popover trigger content open onOpenChange align/>` — âncora + outside-click + Esc + foco + `role`, reposiciona em colisão de borda. Base de `RoleSelect` (desktop) e legenda "?".
- [ ] Step 1: teste — abre no click do trigger; outside-click/Esc fecham; conteúdo tem foco. FAIL→impl→PASS→commit.

### Task 0.8: `Tabs.jsx` — Create+test
`Tabs/List/Trigger/Content` (`value/onValueChange`, pill). A11y `tablist/tab/tabpanel`, `aria-selected`, ←→/Home/End, roving tabindex. Teste click+seta. FAIL→impl→PASS→commit.

### Task 0.9: `Modal.jsx` (usa 0.1) — Create+test
`<Modal open onClose titulo footer size children/>` overlay `bg-black/60 backdrop-blur-sm`, painel `rounded-2xl ring-1`, `aria-modal`/`aria-labelledby`, foco inicial+restore, framer scale+fade. Teste open/Esc/overlay-click. FAIL→impl→PASS→commit.

### Task 0.10: `Combobox.jsx` — Create+test
`<Combobox value onChange options placeholder allowCustom renderMobileAsSheet/>`. `role=combobox`, `aria-expanded/controls/activedescendant`, type-ahead, `allowCustom` injeta livre; mobile→Sheet. Teste filtro/escolha/custom/teclado. FAIL→impl→PASS→commit.

### Task 0.11: `RoleBadge`+`StatusBadge` — Create+test
Usam `CORES_PAPEL`/`CORES_STATUS`. Super Admin `.chrome`. Teste classes. FAIL→impl→PASS→commit.

### Task 0.12: `RoleSelect.jsx` (P7, usa 0.7/0.11) — Create+test
`<RoleSelect value opcoes onChange readOnly/>` — trigger=`RoleBadge` clicável hit-area ≥44px, `aria-haspopup=listbox`, `Popover` desktop/`Sheet` mobile, `readOnly`→`RoleBadge` estático. `opcoes` já filtradas pelo chamador (`opcoesDePapel`). Teste abrir/escolher/readOnly/teclado. FAIL→impl→PASS→commit.

### Task 0.13: `ContextSwitcher.jsx` (P9 spec, usa Sheet mobile) — Create+test
`<ContextSwitcher contexto onChange podeAdmin temCelula badge/>` — Segmented ícone+rótulo, ativo `.chrome`, aba "Minha célula" disabled se `!temCelula` (F13), badge de pendências no segmento Administração; `<md` colapsa em botão→Sheet; não renderiza se `!podeAdmin`; **limpa preferência no logout** (expor helper `limparContexto(id)`). Teste disabled/onChange/badge. FAIL→impl→PASS→commit.

### Task 0.14: `Skeleton`+`EmptyState`+`ErrorState` (R2#6) — Create+test
`<Skeleton/>` (shimmer, reduced-motion, `aria-hidden`), `<SkeletonLinhas n/>`, `<EmptyState icon titulo subtitulo acao/>`, `<ErrorState mensagem onRetry/>` (botão "Tentar de novo"). Teste render (incl. `onRetry` chamado no click). FAIL→impl→PASS→commit.

### Task 0.15: `Toast` + provider — Create+test; Modify `App.jsx`
`useToast()→{sucesso,erro,info}`, `aria-live=polite`, não rouba foco, auto-dismiss 4s, reduced-motion. Montar `<ToastProvider>` no App. Teste (fake timers). FAIL→impl→PASS→commit.

> **CHECKPOINT Fase 0:** `npm test` verde; `tsc`/lint web ok; primitivos renderizam. Commit de fecho.

---

## FASE 1 — RBAC / hierarquia (backend)

### Task 1.1: `podeEditarPapel` novo em `@icelula/shared` (F6, R2#3) — Modify `packages/shared` (mover a função) + `apps/api/src/lib/roles.js` (re-exporta/importa); Test no shared
**Interfaces:** `podeEditarPapel(editor, atual, novo): boolean` (fonte única no shared); `opcoesDePapel`/`podeAgirSobre` derivadas (usadas por 0.2).
- [ ] Step 1: matriz completa no shared — ADMIN: MEMBRO→LIDER ✓, MEMBRO→ADMIN ✓, ADMIN→MEMBRO ✗, →SUPER ✗, edita SUPER ✗; SUPER: tudo ✓ (inclui SUPER→SUPER ✓).
- [ ] Step 2: FAIL. Step 3: implementar em `@icelula/shared` (ordem spec §4.1: novo/atual super→super; atual admin→super; novo admin→admin+; default admin+); `apps/api/src/lib/roles.js` passa a **importar** do shared (mantém `requireRole`/`temNivel` locais). Step 4: PASS (roles.test.js api verde). Step 5: Commit.

### Task 1.2: Guard `PUT /usuarios/:id` com self-exempt (A1) — Modify `routes/usuarios.js`; Test
- [ ] Step 1: testes — ADMIN edita OUTRO admin→403; ADMIN edita SUPER→403; **SUPER edita outro SUPER→200** (R2#4); ADMIN **auto-inativa→400** (guard não preempta); ADMIN edita próprio nome→200; SUPER edita admin→200.
- [ ] Step 2: FAIL (ver que sem self-exempt o teste 400 quebra). Step 3: após `findUnique`, `const ed=request.usuario.papel; if (id !== request.usuario.id && ((alvo.papel==='SUPER_ADMIN' && ed!=='SUPER_ADMIN') || (alvo.papel==='ADMIN' && ed!=='SUPER_ADMIN'))) return reply.code(403).send({erro:'Sem permissão'})` (R2#4: super pode editar super). Step 4: PASS + existentes verdes. Step 5: Commit.

### Task 1.3: `garantir-super-admin.js` + entrypoint (A3, F4) — Create script; Modify `package.json`, `docker/entrypoint.sh`
- [ ] Step 1: script: `import { PrismaClient }`; `const prisma=new PrismaClient()`; `const email=process.env.SUPER_ADMIN_EMAIL||'nexusai360@gmail.com'`; `await prisma.user.updateMany({where:{email},data:{papel:'SUPER_ADMIN',ativo:true,aprovado:true}})`; log; `await prisma.$disconnect()`. Não cria do zero.
- [ ] Step 2: `package.json` `"admin:super":"node prisma/garantir-super-admin.js"`.
- [ ] Step 3: `entrypoint.sh` após `migrate deploy`: `npm run admin:super -w apps/api || true` (**incondicional**, não-fatal).
- [ ] Step 4: local `npm run admin:super -w apps/api`; conferir `papel=SUPER_ADMIN` (idempotente). Step 5: Commit.

> **CHECKPOINT Fase 1:** `npm test` api verde; deployável.

---

## FASE 2 — Diagnóstico "admin não vê usuários" (F12)

### Task 2.1: Reproduzir + corrigir (operacional)
- [ ] Step 1: `SELECT papel,aprovado,ativo FROM "User" WHERE papel IN ('ADMIN','SUPER_ADMIN')` (admin de teste `ativo=false`). Step 2: confirmar que `requireRole` 401 conta inativa (causa operacional, não bug). Step 3: reativar via tela de Usuários (super, Fase 3) ou `UPDATE`; registrar no PROGRESSO. Sem commit de código (é operacional) — documentar no STATUS.

> **CHECKPOINT Fase 2:** diagnóstico registrado; sem regressão.

---

## FASE 3 — Shell Admin + Usuários + Aprovações (telas ANTES dos redirects, P1)

### Task 3.1: Rota `/app/aprovacoes` do líder (F1) — Create `pages/Aprovacoes.jsx`; Modify `App.jsx`, `TopBar.jsx`
- [ ] Step 1: rota `<Route path="/app/aprovacoes" element={<SoLider><Aprovacoes/></SoLider>}/>`. Step 2: link "Aprovações" do líder → `/app/aprovacoes`. Step 3: `Aprovacoes` (só Pendentes; `apiUsuariosPendentes`; Aprovar/Recusar via `ConfirmDialog`; Toast; Skeleton/EmptyState). Step 4: browser (líder). Step 5: Commit.

### Task 3.2: `AdminLayout` + route-group `/app/admin/*` (telas reais, sem redirects ainda)
**Files:** Create `pages/admin/AdminLayout.jsx`, `pages/admin/AdminAvisos.jsx`; Modify `App.jsx`.
- [ ] Step 1: `AdminLayout` (rail lateral `lg+`/abas `<lg`: Usuários·Células·Avisos; `<Outlet/>`; `max-w-6xl`). Step 2: grupo `<Route element={<SoAdmin><AdminLayout/></SoAdmin>}>` com `/app/admin/celulas` (→`Celulas` existente), `/app/admin/avisos` (→`AdminAvisos` novo). **Ainda não** mexer em `/app/usuarios`/`/app/celulas` antigos. Step 3: `AdminAvisos` (reusa `apiBannerAdmin/apiSalvarBanner`; textarea+Checkbox+Salvar+Toast+preview). Step 4: browser. Step 5: Commit.

### Task 3.3: `ContextSwitcher` + badge de pendências (M1) — Modify `TopBar.jsx`
- [ ] Step 1: montar `ContextSwitcher` (derivado do papel atual; storage por `usuario.id`; `limparContexto` no logout). Step 2: contagem de pendentes (`apiUsuariosPendentes().length`) alimenta **badge no segmento Administração + item "Usuários"** (R2#5 — **NÃO** tocar no `NotificacoesSino`/modelo `Notificacao`). Step 3: links dos dois contextos. Step 4: browser (super/admin/líder/membro) — **confirmar que o `NotificacoesSino` continua renderizando/funcionando** após montar o switcher no TopBar (§8.11). Step 5: Commit.

### Task 3.4a: `AdminUsuarios` — aba Pendentes (P6) — Create `pages/admin/AdminUsuarios.jsx`
**Frontend: `ui-ux-pro-max`.**
- [ ] Step 1: legenda dos níveis em `Popover` "?"; `Tabs` Pendentes/Todos (Todos placeholder por ora). Step 2: Pendentes — cards + **seleção múltipla** + "Aprovar selecionados" (**loop client-side** com erro parcial + Toast agregado, M2); Recusar via `ConfirmDialog` "irreversível". Step 3: Skeleton/EmptyState. Step 4: rota `/app/admin/usuarios` → `AdminUsuarios`. Step 5: browser + Commit.

### Task 3.4b: `AdminUsuarios` — aba Todos (linha de dados, RoleSelect, gating)
- [ ] Step 1: **linha de dados** (`md+` grid `Avatar+Nome·Email·StatusBadge·RoleSelect·Ação`, `divide-y`, `hover:bg-surface`, `h-14`; card no mobile). Step 2: busca via `Combobox`(allowCustom/query); `RoleSelect` com `opcoes=opcoesDePapel(eu.papel, u.papel)`; Ativar/Desativar via `podeAgirSobre` (oculto quando não pode). Step 3: teste de componente cobrindo ocultação de ação e opções por papel (usa 0.2). Step 4: browser. Step 5: Commit.

### Task 3.5: Ativar redirects (ÚLTIMA task, P1/A4) — Modify `App.jsx`, `TopBar.jsx`
- [ ] Step 1: `InicioOuCelulas`: admin sem célula → `/app/admin/usuarios` (não `/app/celulas`). Step 2: trocar `to:` dos links admin em `linksPorPapel` para `/app/admin/*`. Step 3: redirects `/app/usuarios`→`/app/admin/usuarios`, `/app/celulas`→`/app/admin/celulas` (`<Navigate replace>`); remover rota `/app/usuarios` antiga (SoGestor/Usuarios). Step 4: browser (todos os papéis; sem duplo-redirect/loop/órfão). Step 5: Commit.
- [ ] **CHECKPOINT (P9):** navegação por papel ok; líder tem Aprovações; nenhuma rota órfã.

> **CHECKPOINT Fase 3:** `npm test` verde; deployável.

---

## FASE 4 — Células (front primeiro, depois refine — P8)

### Task 4.1: `montarPayloadCelula` puro + front multi-step (P5) — Modify `Celulas.jsx`, `lib/api.js`; Create `lib/celulaPayload.js`+test. **`ui-ux-pro-max`.**
- [ ] Step 1: teste `montarPayloadCelula(form)` → `diaSemana:Number`, `frequenciaDias:Number`, `dataPrimeiroEncontro:'YYYY-MM-DDTHH:mm'` (**não** `toISOString`; caso 21:00 não vira dia seguinte), `cep`, `numero`. Step 2: FAIL. Step 3: implementar puro. Step 4: PASS. Step 5: usar no `Celulas.jsx`; `Modal` multi-step (Identificação→Encontro→Endereço, progresso, placeholders, "Data e horário…"); CEP `mascaraCep`+autofill ViaCEP (`AbortController`+timeout 4s+debounce)→**Cidade Combobox**(allowCustom)/Bairro/Rua/Número+`Checkbox "Sem número"`(→`S/N`). Step 6: browser + Commit.

### Task 4.2: Backend schema — coerção + `cep` + refine coerência (A2, M3, F9) — Modify `schema.prisma`, `routes/celulas.js`; Create migration; Test
- [ ] Step 1: testes — POST `diaSemana:"3"`→201; POST dia incoerente c/ data→400; **POST quarta 21:00 (BRT) → 201 (sem falso-positivo de fuso)**; PUT parcial (só nome) em célula legada incoerente→200; PUT com `cep`→aceita.
- [ ] Step 2: FAIL.
- [ ] Step 3 (R2#2 — TZ-independente, sem `z.coerce.date` no create): `schema.prisma` `cep String?`; `npx prisma migrate dev --name cep` (**DB local**; commitar só `migration.sql`). `enderecoFields` compartilhado ganha `cep: z.string().regex(/^\d{5}-?\d{3}$/).optional()` (cobre create+update, M3). `diaSemana/frequenciaDias`→`z.coerce.number()`. **No create schema**, `dataPrimeiroEncontro: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)`; `.refine` faz `const [y,mo,d]=data.dataPrimeiroEncontro.slice(0,10).split('-').map(Number); return data.diaSemana===new Date(Date.UTC(y,mo-1,d)).getUTCDay()` (msg "Dia da semana incompatível…"). **No handler**, construir a Date armazenada UTC-pinada: `const [y,mo,d]=...; const [hh,mm]=hora...; const dt=new Date(Date.UTC(y,mo-1,d,hh,mm))` antes de `prisma.celula.create` (consistente com `materializarEncontros`). O `updateCelulaSchema` mantém `z.coerce.date()` opcional e **sem** o refine.
- [ ] Step 4: PASS + existentes. Step 5: Commit. (Sem `agente schema-changed` — modo main.)
- [ ] **CHECKPOINT (P9):** migration aplicada; `prisma generate` no build; criar célula funciona (repro do bug → verde).

### Task 4.3: Definir líder via Combobox — Modify `Celulas.jsx`
- [ ] Steps: substituir busca ad-hoc por `Combobox`; commit.

> **CHECKPOINT Fase 4:** cria célula sem bug; `npm test` verde; deployável.

---

## FASE 5 — Perfil + /cadastro

### Task 5.1: `mapBackEstadoCivil` puro + Perfil (P3/M5, F7) — Create `lib/estadoCivil.js`+test; Modify `Perfil.jsx`, `ConjugeSecao.jsx`
- [ ] Step 1: teste `mapBackEstadoCivil(inicialMarcado, marcadoAgora)`: (marcado,marcado)→`undefined`; (marcado,desmarcado)→`'SOLTEIRO'`; (desmarcado,marcado)→`'CASADO'`; e `ehCasadoInicial(estadoCivil)` = `∈{CASADO,UNIAO_ESTAVEL}`. Step 2: FAIL. Step 3: implementar puro. Step 4: PASS.
- [ ] Step 5: `Perfil.jsx`: `Checkbox "Sou casado(a)"` (inicial via `ehCasadoInicial`); payload usa `mapBackEstadoCivil` (omite chave se `undefined`); `ConjugeSecao` revelada quando marcado (animada); WhatsApp `mascaraTelefone`; layout em seções (ícone-caixinha); Toast. Step 6: browser + Commit.

### Task 5.2: `/cadastro` reformulado — Modify `Register.jsx`. **`ui-ux-pro-max`.**
- [ ] Steps: card centrado, hierarquia, placeholders, senha toggle, CTA cromado; commit.

> **CHECKPOINT Fase 5:** `npm test` verde; deployável.

---

## FASE 6 — Onboarding & seleção

### Task 6.1: `CelulaPicker` bonito sem foto/líder (P3, F8) — Create `components/CelulaPicker.jsx`; Modify `SelecionarCelula.jsx`. **`ui-ux-pro-max`.**
- [ ] Steps: card header ícone-caixinha + monograma/cor do **nome da célula** (`corDoNome`); `Avatar` líder cor determinística (destaque + `+N`); chip **"Líder a definir"** sem líder; `Dia·Horário·Frequência`+bairro; anel brand selecionado. Integrar em `SelecionarCelula`; verificar com dado real (sem líder/foto). Commit.

### Task 6.2: `Aguardando` refresh — Modify `Aguardando.jsx`
- [ ] Steps: `StatusBadge "Em aprovação"`+nome célula+"Atualizar status"(`apiMe`→`aplicarUsuario`)+"Completar perfil". Commit.

> **CHECKPOINT Fase 6:** fluxo bonito; deployável.

---

## FASE 7 — QR (ramo "com conta")

### Task 7.1: ramo "com conta" + mensagens — Modify `QrLanding.jsx`, `Login.jsx`
- [ ] Steps: usuário logado/que loga ao ler QR chama `apiCheckinQr` e vê Toast/tela "Presença registrada"/"Não há reunião hoje"/"Disponível a partir do horário". **Não** tocar no check-in backend. Verificar 2 ramos no browser. Commit.

> **CHECKPOINT Fase 7:** deployável.

---

## FASE 8 — Polimento, migração de crus & design system

### Task 8.1: Migrar `<select>/<input>/<textarea>` crus → primitivos (P10 spec) — `CronogramaForm` (CelulaDetalhe), Calendário, Pedidos, Testemunhos, filtros. Unificar aparência Select/Combobox. Commit por arquivo. **`ui-ux-pro-max`.**
### Task 8.2: Passe UI/UX + cromado + responsividade — checklist `ui-ux-pro-max` (a11y/contraste/foco/reduced-motion/375–1440); dark/light.
### Task 8.3: E2E manual + verdes — `npm test` (api+web) verde; `tsc`/lint; E2E de TODOS os fluxos contra `localhost:3200`.
### Task 8.4: Destilar `design-system/MASTER.md` da UI nova (corrige o obsoleto/laranja). Commit.

> **CHECKPOINT Fase 8:** tudo verde, E2E ok, relatório final ao dono.

---

## Self-Review (cobertura)
Papéis/permissões §4.1 → 1.1,1.2,0.2,3.4b. Super admin → 1.3. Nav/contexto §4.2 → 3.1–3.5. Primitivos+a11y §4.3 → 0.0–0.15. Cromado §4.6 → 0.0,8.2. Fluxos §4.4 → 3.1,6.1,7.1. Backend células §4.5 → 4.2. Estado civil → 5.1. Telas §5 → 3.4,4.1,5.x,6.x. Bug célula §6 → 4.1/4.2. Badge/Sino P8 → 3.3. Massa → 3.4a. Crus/design system → 8.1,8.4. Deploy → checkpoints + entrypoint (1.3). Sem placeholder de código em passos de lógica (RBAC/máscara/hook/refine/map-back/payload têm código ou função pura testada).
