# Reforma UI/RBAC/Células — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans` (execução inline nesta sessão, com checkpoints). Frontend SEMPRE com `ui-ux-pro-max`. Steps usam checkbox (`- [ ]`).

**Status:** **plano v1** (segue ciclo v1 → R1 → v2 → R2 → v3 antes de executar).
**Spec:** `docs/superpowers/specs/2026-07-02-reforma-ui-rbac-celulas-design.md` (v3 final).

**Goal:** Reformar a UI (prata cromado, nível Insights), o RBAC (admin nomeia admin; super = dono) e os fluxos (aprovação do líder, seleção de célula, cadastro de célula) do Painel de Célula, sem regressão e com cada fase deployável na `main`.

**Architecture:** Monorepo npm (`apps/api` Fastify+Prisma; `apps/web` React 19+Vite+Tailwind v4, primitivos próprios). Fundação de primitivos de UI primeiro, depois RBAC no backend com testes, depois telas por área. Trabalho direto na `main`, TDD, commits atômicos.

**Tech Stack:** React 19, Vite, Tailwind v4 (sem shadcn/base-ui), framer-motion, react-hook-form, zod, lucide, vitest (web) / jest (api), Fastify, Prisma/Postgres.

## Global Constraints (verbatim da spec)
- Trabalho **direto na `main`** (sem worktree). Deploy por push (CI→GHCR→Shepherd); `docker/entrypoint.sh` já roda `prisma:deploy` antes do boot. Cada fase **deployável**.
- Marca **prata cromada** (`--brand #64748b` light / `#b9c1cd` dark); **não** trocar por azul/violeta. Fontes **Inter/Sora**. Dark por classe `.dark`.
- Chips: `bg-{cor}-500/10 border border-{cor}-500/30 text-{cor}-700 dark:text-{cor}-400` + ícone + texto. Papéis: Membro=zinc/Eye, Líder=amber/Shield, Admin=blue/ShieldCheck, Super=purple/Crown. Status: Em aprovação=amber/Clock, Ativo=emerald/UserCheck, Inativo=red/UserX.
- Token de foco único: `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
- Larguras: listas admin `max-w-6xl`; forms/leitura `max-w-2xl`; membro `max-w-3xl`.
- Micro-interações 150–300ms; `prefers-reduced-motion` sempre. Toque ≥44px. `cursor-pointer` em clicáveis.
- Frontend **sempre** com skill `ui-ux-pro-max`. Local: `npm run app:up` → http://localhost:3200. Testes: `npm test` (api+web) verde antes de cada commit de fase.
- **Não** mover `materializarEncontros` para dentro da transação. **Não** validar `diaSemana` no check-in do QR. Estado civil grava só em transição do checkbox.

## File Structure

**Fase 0 — primitivos** (`apps/web/src/components/ui/` salvo indicado):
- Create: `hooks/useOverlayDismiss.js` (extraído do Sheet), `ui/Modal.jsx`, `ui/Tabs.jsx`, `ui/Checkbox.jsx`, `ui/Combobox.jsx`, `ui/RoleBadge.jsx`, `ui/StatusBadge.jsx`, `ui/RoleSelect.jsx`, `ui/ContextSwitcher.jsx`, `ui/Skeleton.jsx`, `ui/EmptyState.jsx`, `ui/Toast.jsx` (+ provider), `lib/mascaras.js`, `lib/cidades.js`, `lib/avatarCor.js`.
- Modify: `components/ui/Sheet.jsx` (consumir hook), `lib/papeis.js` (+CORES_PAPEL/ehLider/ehGestor), `index.css` (`.chrome`, token de foco util), `main.jsx`/`App.jsx` (montar ToastProvider).
- Test: `*.test.js(x)` colocados junto (vitest).

**Fase 1 — RBAC** (`apps/api/`):
- Modify: `src/lib/roles.js` (podeEditarPapel), `src/routes/usuarios.js` (guard PUT), `docker/entrypoint.sh`.
- Create: `prisma/garantir-super-admin.js`; `package.json` script `admin:super`.
- Test: `src/lib/roles.test.js`, `src/routes/usuarios.test.js`.

**Fase 3 — shell + usuarios + aprovações** (`apps/web/`):
- Create: `pages/admin/AdminLayout.jsx`, `pages/admin/AdminUsuarios.jsx`, `pages/Aprovacoes.jsx`.
- Modify: `App.jsx` (route-group, /app/aprovacoes, redirects), `components/TopBar.jsx` (ContextSwitcher, links, badge), `pages/Usuarios.jsx` (→ mover conteúdo/מtirar avisos) ou substituir.

**Fase 4 — células** (`apps/api` + `apps/web`):
- Modify: `apps/api/prisma/schema.prisma` (+cep), `src/routes/celulas.js` (schema coerção+refine), `apps/web/src/pages/Celulas.jsx` (form multi-step), `lib/api.js` (cep).
- Create: `apps/api/prisma/migrations/<ts>_cep/migration.sql`.

**Fases 5–8:** `pages/Perfil.jsx`, `pages/Register.jsx`, `components/ConjugeSecao.jsx`, `pages/SelecionarCelula.jsx`, `components/CelulaPicker.jsx`, `pages/Aguardando.jsx`, `pages/QrLanding.jsx`, e varredura de `<select>/<input>` crus (`CronogramaForm`, etc.).

---

## FASE 0 — Fundação de UI

### Task 0.1: Extrair `useOverlayDismiss` do Sheet (F2)
**Files:** Create `apps/web/src/hooks/useOverlayDismiss.js`; Modify `apps/web/src/components/ui/Sheet.jsx`; Test `apps/web/src/hooks/useOverlayDismiss.test.jsx`.
**Interfaces:** Produces `useOverlayDismiss(open: boolean, onClose: ()=>void, panelRef: Ref) : void` — aplica scroll-lock em `document.body`, focus-trap (Tab/Shift+Tab dentro de `panelRef`), Esc→onClose, e restaura o foco ao elemento anterior no unmount/close.
- [ ] **Step 1:** Escrever teste: montar componente com hook + panel com 2 botões; abrir → `document.body.style.overflow==='hidden'`; Tab no último volta ao primeiro; Esc chama onClose; fechar → overflow restaurado e foco restaurado.
- [ ] **Step 2:** Rodar `npm test -w apps/web -- useOverlayDismiss` → FAIL.
- [ ] **Step 3:** Implementar o hook movendo a lógica hoje inline em `Sheet.jsx` (os `useEffect` de lock/trap/Esc). Manter comportamento idêntico.
- [ ] **Step 4:** Refatorar `Sheet.jsx` para chamar `useOverlayDismiss(open,onClose,panelRef)`, preservando o drag-to-dismiss (que fica no Sheet) e o `tituloId`.
- [ ] **Step 5:** Rodar testes do Sheet existentes + novo → PASS. Verificar no browser que o Sheet ainda abre/fecha/arrasta.
- [ ] **Step 6:** Commit `refactor(ui): extrai useOverlayDismiss do Sheet (base p/ Modal)`.

### Task 0.2: `lib/papeis.js` — CORES_PAPEL, ehLider, ehGestor
**Files:** Modify `apps/web/src/lib/papeis.js`; Test `apps/web/src/lib/papeis.test.js`.
**Interfaces:** Produces `CORES_PAPEL: Record<Papel,{chip:string,icon:LucideIcon,label:string}>`, `CORES_STATUS: Record<'PENDENTE'|'ATIVO'|'INATIVO',{chip,icon,label}>`, `ehLider(papel):boolean`, `ehGestor(papel):boolean`.
- [ ] **Step 1:** Teste: `ehGestor('LIDER')===true`, `ehLider('ADMIN')===false`, `CORES_PAPEL.ADMIN.chip` contém `blue` e `text-blue-700 dark:text-blue-400`.
- [ ] **Step 2:** `npm test -w apps/web -- papeis` → FAIL.
- [ ] **Step 3:** Implementar. `chip` = `bg-{c}-500/10 border border-{c}-500/30 text-{c}-700 dark:text-{c}-400`. Ícones lucide (Eye/Shield/ShieldCheck/Crown; Clock/UserCheck/UserX). `ehGestor = rank>=LIDER`, `ehLider = papel==='LIDER'`.
- [ ] **Step 4:** Testes → PASS.
- [ ] **Step 5:** Commit `feat(ui): CORES_PAPEL/CORES_STATUS + ehLider/ehGestor`.

### Task 0.3: `lib/mascaras.js` (CEP, telefone)
**Files:** Create `apps/web/src/lib/mascaras.js`; Test junto.
**Interfaces:** `mascaraCep(v:string):string` → `00000-000`; `mascaraTelefone(v:string):string` → `(00) 00000-0000`; `soDigitos(v):string`.
- [ ] **Step 1:** Teste: `mascaraCep('74000000')==='74000-000'`; `mascaraCep('7400')==='7400'`; `mascaraTelefone('62999998888')==='(62) 99999-8888'`; ignora não-dígitos.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar por slicing de dígitos. **Step 4:** PASS. **Step 5:** Commit `feat(ui): mascaras de CEP e telefone`.

### Task 0.4: `lib/avatarCor.js` (cor determinística por nome — P3)
**Files:** Create + test.
**Interfaces:** `corDoNome(nome:string):{bg:string,fg:string}` — hash estável do nome → HSL de baixa saturação (grafite-tingido), `fg` branco/near-white.
- [ ] **Step 1:** Teste: mesma string → mesma cor (determinístico); strings diferentes → hues diferentes; retorna `hsl(...)`.
- [ ] **Step 2:** FAIL. **Step 3:** hash (soma de charCodes) % 360 → `hsl(h, 22%, 42%)`. **Step 4:** PASS. **Step 5:** Commit.

### Task 0.5: `lib/cidades.js` (lista curada)
**Files:** Create + test. **Interfaces:** `CIDADES: string[]` (capitais + municípios comuns de GO e grandes BR, ~120); `filtrarCidades(q):string[]`.
- [ ] Step 1: teste `filtrarCidades('goi')` inclui `'Goiânia'`; lista não vazia. Steps 2–5 (FAIL→impl→PASS→commit `feat(ui): lista curada de cidades`).

### Task 0.6: `Checkbox.jsx`
**Files:** Create + test. **Interfaces:** `<Checkbox checked onChange label id disabled />` — `role` nativo `<input type=checkbox>` estilizado, `aria-checked`, foco visível (token), 44px hit area.
- [ ] Step 1: teste render com label associado (`getByLabelText`), click chama onChange(!checked), teclado espaço alterna. Steps 2–5 (FAIL→impl→PASS→commit).

### Task 0.7: `Tabs.jsx`
**Files:** Create + test. **Interfaces:** `<Tabs value onValueChange>`, `<TabsList>`, `<TabsTrigger value>`, `<TabsContent value>`; variante pill (default). A11y: `role=tablist/tab/tabpanel`, `aria-selected`, setas←→/Home/End, roving tabindex.
- [ ] Step 1: teste — clicar trigger muda painel; seta direita move foco/seleção; `aria-selected` correto. Steps 2–5 (FAIL→impl com framer-motion no indicador→PASS→commit).

### Task 0.8: `Modal.jsx` (usa 0.1)
**Files:** Create + test. **Interfaces:** `<Modal open onClose titulo footer size children>` — overlay `bg-black/60 backdrop-blur-sm`, painel `rounded-2xl bg-card ring-1 ring-border shadow-2xl`, usa `useOverlayDismiss`, `aria-modal`, `aria-labelledby` (titulo), foco inicial no painel, restore no close, framer-motion (scale+fade).
- [ ] Step 1: teste — open renderiza titulo; Esc/onClose; foco vai ao painel; click no overlay fecha. Steps 2–5.

### Task 0.9: `Combobox.jsx`
**Files:** Create + test. **Interfaces:** `<Combobox value onChange options=[{value,label,description?,avatar?}] placeholder allowCustom? renderMobileAsSheet? />`. A11y: `role=combobox`, `aria-expanded/controls/activedescendant`, `listbox/option`, type-ahead, Esc fecha, `allowCustom` injeta valor livre digitado. Mobile: abre em `Sheet`.
- [ ] Step 1: teste — digitar filtra; escolher chama onChange; `allowCustom` permite valor fora da lista; teclado ↑↓/Enter/Esc. Steps 2–5.

### Task 0.10: `RoleBadge.jsx` + `StatusBadge.jsx`
**Files:** Create + test. **Interfaces:** `<RoleBadge papel />`, `<StatusBadge status />` usando `CORES_PAPEL`/`CORES_STATUS` (chip + ícone + label). Super Admin usa classe `.chrome`.
- [ ] Step 1: teste render `Administrador` com classes blue; StatusBadge `Em aprovação` amber. Steps 2–5.

### Task 0.11: `RoleSelect.jsx` (chip-trigger — P7)
**Files:** Create + test. **Interfaces:** `<RoleSelect value opcoes=[papel...] onChange disabled readOnly />`. Trigger = `RoleBadge` clicável com **hit area ≥44px** (padding sem inchar visual); `aria-haspopup=listbox`, `aria-expanded`; **Popover no desktop / Sheet no mobile**; `readOnly`→`RoleBadge` estático; `opcoes` já filtradas pelo chamador (papéis que o editor pode conceder).
- [ ] Step 1: teste — click abre lista com `opcoes`; escolher chama onChange; readOnly não abre; teclado. Steps 2–5.

### Task 0.12: `ContextSwitcher.jsx` (P9)
**Files:** Create + test. **Interfaces:** `<ContextSwitcher contexto onChange podeAdmin temCelula />` — SegmentedControl ícone+rótulo (Shield=Administração, Users=Minha célula); segmento ativo `.chrome`; aba "Minha célula" desabilitada se `!temCelula` (F13); em `<md` colapsa em botão-ícone que abre `Sheet`.
- [ ] Step 1: teste — sem temCelula, opção Minha célula disabled; onChange dispara; não renderiza se `!podeAdmin`. Steps 2–5.

### Task 0.13: `Skeleton.jsx` + `EmptyState.jsx` (P2)
**Files:** Create + test. **Interfaces:** `<Skeleton className/>` (shimmer, reduced-motion), `<SkeletonLinhas n/>`; `<EmptyState icon titulo subtitulo acao?/>` (ícone-em-caixinha `bg-brand/10`).
- [ ] Step 1: teste render EmptyState com titulo/ação; Skeleton tem `aria-hidden`. Steps 2–5.

### Task 0.14: `Toast.jsx` + provider (P6)
**Files:** Create `ui/Toast.jsx`; Modify `App.jsx`/`main.jsx`; Test. **Interfaces:** `useToast()` → `{sucesso(msg), erro(msg), info(msg)}`; provider global; `aria-live=polite`; não rouba foco; auto-dismiss 4s; canto inferior; reduced-motion.
- [ ] Step 1: teste — `sucesso('ok')` renderiza role=status com texto; some após timeout (fake timers). Steps 2–5. Montar `<ToastProvider>` em volta do app.

### Task 0.15: `index.css` — `.chrome` + token de foco util (§4.6)
**Files:** Modify `apps/web/src/index.css`.
- [ ] **Step 1:** Adicionar `.chrome { background-image: linear-gradient(180deg,#8b95a5 0%,#6b7280 45%,#515e70 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 -1px 2px rgba(0,0,0,.18); color: var(--on-brand);}` e variante `.dark .chrome { background-image: linear-gradient(180deg,#e6ebf1 0%,#c3ccd7 50%,#aab4c2 100%);}`; `.foco { @apply focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none; }`.
- [ ] **Step 2:** Verificar no browser (dark/light) que `.chrome` num botão fica metálico e o texto legível (AA).
- [ ] **Step 3:** Commit `feat(ui): acabamento cromado (.chrome) + util de foco`.

> **Checkpoint Fase 0:** `npm test` verde; `tsc`/lint web sem erros novos; primitivos renderizam num sandbox/story manual. Commit de fecho da fase.

---

## FASE 1 — RBAC / hierarquia (backend + super admin)

### Task 1.1: `podeEditarPapel` novo (F6)
**Files:** Modify `apps/api/src/lib/roles.js`; Test `apps/api/src/lib/roles.test.js`.
**Interfaces:** `podeEditarPapel(editor:Papel, atual:Papel, novo:Papel):boolean` (pseudocódigo da spec §4.1).
- [ ] **Step 1:** Testes (matriz): ADMIN promove MEMBRO→LIDER (true) e MEMBRO→ADMIN (true); ADMIN rebaixa ADMIN→MEMBRO (**false**); ADMIN concede SUPER (**false**); SUPER faz tudo (true); ADMIN edita SUPER (false).
- [ ] **Step 2:** `npm test -w apps/api -- roles` → FAIL.
- [ ] **Step 3:** Reescrever a função exatamente como o pseudocódigo (ordem: novo/atual super → super; atual admin → super; novo admin → admin+; default admin+).
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(api): admin nomeia admin; mexer em admin/super é do super (podeEditarPapel)`.

### Task 1.2: Guard único no `PUT /usuarios/:id` (F5)
**Files:** Modify `apps/api/src/routes/usuarios.js`; Test `usuarios.test.js`.
- [ ] **Step 1:** Teste: ADMIN faz `PUT /usuarios/:id` (alvo SUPER) → 403; ADMIN edita outro ADMIN → 403; SUPER edita ADMIN → ok; ADMIN edita MEMBRO → ok.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Após `const alvo = await prisma.user.findUnique(...)`, inserir: `if (alvo.papel==='SUPER_ADMIN' || (alvo.papel==='ADMIN' && request.usuario.papel!=='SUPER_ADMIN')) return reply.code(403).send({erro:'Sem permissão'})`.
- [ ] **Step 4:** PASS (+ testes existentes verdes). **Step 5:** Commit `fix(api): admin nao edita/desativa admin ou super (guard PUT)`.

### Task 1.3: `garantir-super-admin.js` + entrypoint (F4)
**Files:** Create `apps/api/prisma/garantir-super-admin.js`; Modify `apps/api/package.json`, `docker/entrypoint.sh`.
- [ ] **Step 1:** Script idempotente: lê `process.env.SUPER_ADMIN_EMAIL || 'nexusai360@gmail.com'`; `updateMany({where:{email}, data:{papel:'SUPER_ADMIN',ativo:true,aprovado:true}})`; loga resultado; não cria usuário do zero (só promove se existe).
- [ ] **Step 2:** `package.json` script `"admin:super":"node prisma/garantir-super-admin.js"`.
- [ ] **Step 3:** `entrypoint.sh`: após o bloco `migrate deploy`, adicionar `if [ -n "$SUPER_ADMIN_EMAIL" ]; then npm run admin:super -w apps/api || true; fi` (guardado, não-fatal).
- [ ] **Step 4:** Rodar local `SUPER_ADMIN_EMAIL=nexusai360@gmail.com npm run admin:super -w apps/api`; verificar no banco `papel=SUPER_ADMIN` (já é — idempotente, sem erro).
- [ ] **Step 5:** Commit `feat(api): garantir-super-admin idempotente + entrypoint`.

> **Checkpoint Fase 1:** `npm test` api verde. Deployável (guard mais restritivo; script idempotente).

---

## FASE 2 — Diagnóstico "admin não vê usuários" (F12)

### Task 2.1: Reproduzir e diagnosticar (systematic-debugging)
- [ ] **Step 1:** Confirmar no banco: `SELECT papel,aprovado,ativo FROM "User" WHERE papel IN ('ADMIN','SUPER_ADMIN')` (o admin de teste está `ativo=false`).
- [ ] **Step 2:** Confirmar mecanismo: `requireRole` bloqueia `!ativo` → 401 em toda chamada; logo admin inativo "não vê nada". Causa = **operacional**, não bug.
- [ ] **Step 3:** Reativar o admin de teste (ou orientar): `UPDATE ... SET ativo=true` (via tela de Usuários pelo super, na Fase 3). Registrar no PROGRESSO.

### Task 2.2: `linksPorPapel` trata `ativo=false`
**Files:** Modify `apps/web/src/components/TopBar.jsx`; Test.
- [ ] **Step 1:** Teste: `linksPorPapel({papel:'ADMIN',ativo:false})` → `[]` (ou aviso), não os links de admin.
- [ ] **Step 2:** FAIL. **Step 3:** No topo de `linksPorPapel`, `if (usuario?.ativo===false) return []`. **Step 4:** PASS. **Step 5:** Commit `fix(web): conta inativa nao mostra navegacao`.

> **Checkpoint Fase 2:** commit; deployável.

---

## FASE 3 — Shell Admin + Usuários + Aprovações do líder (juntas, deployável)

### Task 3.1: Rota `/app/aprovacoes` do líder (F1) — ANTES dos redirects
**Files:** Create `apps/web/src/pages/Aprovacoes.jsx`; Modify `App.jsx`, `TopBar.jsx`.
**Interfaces:** `Aprovacoes` usa `apiUsuariosPendentes()` (já escopa por célula no backend), renderiza cards com `StatusBadge`, Aprovar/Recusar (Recusar via `ConfirmDialog`), Toast.
- [ ] **Step 1:** Adicionar rota `<Route path="/app/aprovacoes" element={<SoLider><Aprovacoes/></SoLider>} />`.
- [ ] **Step 2:** `linksPorPapel`: link "Aprovações" do líder → `/app/aprovacoes` (não `/app/usuarios`).
- [ ] **Step 3:** Implementar `Aprovacoes.jsx` (reusa lógica de aprovar/recusar do `Usuarios.jsx` atual, só a parte Pendentes).
- [ ] **Step 4:** Verificar no browser (logar como líder) que Aprovações aparece e funciona.
- [ ] **Step 5:** Commit `feat(web): rota /app/aprovacoes dedicada ao lider`.

### Task 3.2: `AdminLayout` + route-group + ContextSwitcher + redirects
**Files:** Create `pages/admin/AdminLayout.jsx`; Modify `App.jsx`, `TopBar.jsx`.
- [ ] **Step 1:** `AdminLayout`: rail lateral (`lg+`) / abas topo (`<lg`) com Usuários·Células·Avisos; `<Outlet/>`; `max-w-6xl`.
- [ ] **Step 2:** `App.jsx`: adicionar grupo `<Route element={<SoAdmin><AdminLayout/></SoAdmin>}>` com `/app/admin/usuarios|celulas|avisos`; redirects `/app/usuarios`→`/app/admin/usuarios`, `/app/celulas`→`/app/admin/celulas` (via `<Navigate>`).
- [ ] **Step 3:** `TopBar`: montar `ContextSwitcher` (derivado do papel atual; storage por `usuario.id`); mover a montagem de links para os dois contextos.
- [ ] **Step 4:** Verificar navegação por papel (super/admin/líder/membro) no browser; sem loop de redirect.
- [ ] **Step 5:** Commit `feat(web): shell de administracao (route-group + ContextSwitcher)`.

### Task 3.3: `AdminUsuarios` reformada (abas, linha de dados, chips, RoleSelect, busca, massa)
**Files:** Create `pages/admin/AdminUsuarios.jsx`; remove uso antigo em `Usuarios.jsx` (avisos saem daqui). **Frontend: usar `ui-ux-pro-max`.**
- [ ] **Step 1:** Legenda dos níveis em popover "?"; `Tabs` Pendentes/Todos.
- [ ] **Step 2:** Pendentes: cards + seleção múltipla + "Aprovar selecionados"; Recusar via ConfirmDialog + Toast.
- [ ] **Step 3:** Todos: **linha de dados** (`md+` grid, `divide-y`, `hover:bg-surface`, `h-14`; card no mobile); busca via Combobox; `StatusBadge`; `RoleSelect` (opções filtradas por `podeEditarPapel(eu, alvo, novo)`); Ativar/Desativar com bloqueios (si, super, admin quando editor≠super) — botão oculto quando 403aria.
- [ ] **Step 4:** Skeleton no load; EmptyState/erro. Verificar no browser (super e admin).
- [ ] **Step 5:** Commit `feat(web): tela de Usuarios reformada (abas, linha de dados, RoleSelect)`.

### Task 3.4: `Avisos` como destino próprio
**Files:** Create `pages/admin/AdminAvisos.jsx` (reusa `apiBannerAdmin/apiSalvarBanner`); remover bloco de aviso de onde estava.
- [ ] Steps 1–5: card com textarea+Checkbox "Exibir para todos"+Salvar(Toast)+preview; rota `/app/admin/avisos`; commit `feat(web): avisos em destino proprio`.

> **Checkpoint Fase 3:** líder tem Aprovações; admin vê Usuários (abas/linha); avisos separados; switcher ok; `npm test` verde; deployável.

---

## FASE 4 — Células (schema + form multi-step + fix bug)

### Task 4.1: Migration `cep` + schema coerção + refine coerência (F3, F9)
**Files:** Modify `apps/api/prisma/schema.prisma`, `src/routes/celulas.js`; Create migration; Test `celulas.test.js`.
- [ ] **Step 1:** Teste: POST com `diaSemana:"3"` (string) → 201 (coage); POST com `diaSemana` incoerente com weekday(data) → 400 "dia incompatível"; PUT parcial (só nome) numa célula legada incoerente → 200 (refine não aplica no update).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `schema.prisma`: `cep String?` em Celula. Gerar migration (`npx prisma migrate dev --name cep`). `celulaSchema`: `diaSemana: z.coerce.number().int().min(0).max(6)`, `frequenciaDias: z.coerce.number()...`, `cep: z.string().regex(/^\d{5}-?\d{3}$/).optional()`, e `.refine(d => d.diaSemana===new Date(d.dataPrimeiroEncontro).getUTCDay(), {message:'Dia da semana incompatível com a data do primeiro encontro'})` **só no create schema**.
- [ ] **Step 4:** PASS (+ existentes). **Step 5:** Commit `feat(api): cep + coercao numerica + coerencia dia/data na criacao de celula`.
- [ ] **Step 6:** `agente schema-changed` (avisa outras worktrees — aqui só main; mesmo assim registrar).

### Task 4.2: Front — form de célula multi-step (P4) + `Number()` + CEP autofill
**Files:** Modify `apps/web/src/pages/Celulas.jsx`, `lib/api.js`. **Usar `ui-ux-pro-max`.**
- [ ] **Step 1:** Enviar `diaSemana`/`frequenciaDias` como `Number(...)`; `dataPrimeiroEncontro` como wall-clock ingênuo (não `toISOString()`).
- [ ] **Step 2:** `Modal` multi-step (Identificação→Encontro→Endereço) com barra de progresso; placeholders; "Data e horário do primeiro encontro".
- [ ] **Step 3:** Endereço: CEP `mascaraCep` + autofill ViaCEP (`fetch` com `AbortController`+timeout 4s+debounce) preenchendo cidade/bairro/rua; **Cidade via Combobox** (`allowCustom`); Número + `Checkbox "Sem número"` (→ `numero='S/N'`, desabilita campo).
- [ ] **Step 4:** Verificar criação no browser (repro do bug → agora cria); Toast de sucesso; Skeleton/EmptyState na lista.
- [ ] **Step 5:** Commit `feat(web): cadastro de celula multi-step (CEP/cidade/sem numero) + fix criacao`.

### Task 4.3: Definir líder via Combobox
**Files:** Modify `Celulas.jsx` (DefinirLider usa `Combobox` no lugar da busca ad-hoc).
- [ ] Steps 1–5: substituir busca manual por `Combobox` (options = usuários); commit `refactor(web): definir lider via Combobox`.

> **Checkpoint Fase 4:** cria célula sem bug; `npm test` verde; deployável (cep aditivo, migrate no entrypoint).

---

## FASE 5 — Perfil + /cadastro (estado civil, layout, máscara)

### Task 5.1: Estado civil por checkbox (map-back seguro F7)
**Files:** Modify `apps/web/src/pages/Perfil.jsx`, `components/ConjugeSecao.jsx`.
- [ ] **Step 1:** Substituir `Select` de estado civil por `Checkbox "Sou casado(a)"`. Estado inicial marcado se `usuario.estadoCivil ∈ {CASADO,UNIAO_ESTAVEL}`.
- [ ] **Step 2:** Map-back: enviar `estadoCivil` **só** se o checkbox mudou vs inicial — marcar→`'CASADO'`, desmarcar→`'SOLTEIRO'`; sem mudança, não incluir no payload.
- [ ] **Step 3:** `ConjugeSecao` revelada quando marcado (animada); WhatsApp com `mascaraTelefone`.
- [ ] **Step 4:** Layout em seções (ícone-em-caixinha), não pilha; Toast ao salvar. Verificar no browser.
- [ ] **Step 5:** Commit `feat(web): estado civil por checkbox + perfil reformulado`.

### Task 5.2: `/cadastro` (signup) reformulado
**Files:** Modify `apps/web/src/pages/Register.jsx`. **Usar `ui-ux-pro-max`.**
- [ ] Steps 1–5: card centrado, hierarquia, placeholders, senha com toggle, cromado sutil no CTA; commit `feat(web): tela de cadastro reformulada`.

> **Checkpoint Fase 5:** `npm test` verde; deployável.

---

## FASE 6 — Onboarding & seleção de célula

### Task 6.1: `CelulaPicker` bonito sem foto/líder (P3, F8)
**Files:** Create `apps/web/src/components/CelulaPicker.jsx`. **Usar `ui-ux-pro-max`.**
**Interfaces:** `<CelulaPicker celulas selecionada onSelecionar />` (apresentacional, sempre tela).
- [ ] **Step 1:** Card: header ícone-em-caixinha + monograma/cor derivada do **nome da célula** (`corDoNome`); `Avatar` de líder com cor determinística (um em destaque + `+N`); chip **"Líder a definir"** quando sem líder; metadados `Dia · Horário · Frequência` + bairro; anel brand no selecionado.
- [ ] **Step 2–4:** Integrar em `SelecionarCelula.jsx` (substitui os cards atuais); verificar com o dado real (sem líder/foto) que fica bonito.
- [ ] **Step 5:** Commit `feat(web): CelulaPicker sofisticado (sem depender de foto/lider)`.

### Task 6.2: `Aguardando` com refresh
**Files:** Modify `Aguardando.jsx`.
- [ ] Steps 1–5: `StatusBadge "Em aprovação"` + nome da célula + botão "Atualizar status" (`apiMe`→`aplicarUsuario`) + "Completar perfil"; commit.

> **Checkpoint Fase 6:** fluxo cadastro→seleção→aguardando bonito; deployável.

---

## FASE 7 — QR (ramo "com conta")

### Task 7.1: Ramo "com conta" + mensagens
**Files:** Modify `apps/web/src/pages/QrLanding.jsx`, `Login.jsx` (best-effort já existe); confirmar `apiCheckinQr` cobre logado.
- [ ] **Step 1:** Garantir que usuário logado/que faz login ao ler QR chama `apiCheckinQr` e vê Toast/tela "Presença registrada" ou "Não há reunião hoje"/"Disponível a partir do horário" (mensagens do backend).
- [ ] **Step 2–4:** Verificar no browser os dois ramos (sem conta / com conta). **Não** tocar no check-in do backend.
- [ ] **Step 5:** Commit `feat(web): QR com conta existente registra presenca e confirma`.

> **Checkpoint Fase 7:** deployável.

---

## FASE 8 — Polimento, migração de crus & design system

### Task 8.1: Migrar `<select>/<input>/<textarea>` crus → primitivos
**Files:** `CronogramaForm` (em `CelulaDetalhe.jsx`), `Calendario`, `Pedidos`, `Testemunhos`, filtros. **Usar `ui-ux-pro-max`.**
- [ ] Steps: substituir cada uso cru por `Select`/`Combobox`/`Input`/`Checkbox`; unificar aparência de `Select`+`Combobox`; commit por arquivo.

### Task 8.2: Passe de UI/UX + cromado + responsividade
- [ ] Rodar checklist `ui-ux-pro-max` (a11y/contraste/foco/reduced-motion/375–1440); ajustar cromado nos destaques; verificar dark/light.

### Task 8.3: E2E manual + verdes
- [ ] `npm test` (api+web) verde; `tsc`/lint sem erros novos; E2E manual de TODOS os fluxos (login, cadastro sem QR→seleção→aprovação, QR com/sem conta, admin gerencia usuários/papéis/ativo, líder aprova, cria célula, perfil/estado civil, avisos) contra `localhost:3200`.

### Task 8.4: Destilar `design-system/MASTER.md` da UI nova
- [ ] Reescrever o MASTER (hoje obsoleto/laranja) refletindo a UI reformada: tokens prata cromado reais, primitivos, paleta semântica `-700/-400`, larguras, a11y. Commit `docs: design-system MASTER destilado da reforma`.

> **Checkpoint Fase 8:** tudo verde, E2E ok, PR/mensagem final ao dono.

---

## Self-Review (cobertura da spec)
- Papéis/permissões (§4.1) → 1.1, 1.2, 3.3. Super admin (§4.1) → 1.3. Nav/contexto (§4.2) → 3.1–3.2, 2.2. Primitivos+a11y (§4.3) → 0.1–0.15. Cromado (§4.6) → 0.15, 8.2. Fluxos (§4.4) → 3.1, 6.1, 7.1. Backend células (§4.5) → 4.1. Estado civil (§4.5) → 5.1. Telas (§5) → 3.3–3.4, 4.2, 5.1–5.2, 6.1–6.2. Bug célula (§6) → 4.1–4.2. Faseamento/deploy (§7) → checkpoints. Critérios (§8) → cobertos por fase. Migração crus/design system (§7 F8/P10) → 8.1, 8.4.
- Sem placeholders de código em passos de lógica (RBAC/máscara/hook/refine têm código). Componentes de UI: contrato + estrutura + classes-chave; detalhe fino inline com `ui-ux-pro-max` (metodologia).
