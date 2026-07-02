# Reforma completa de UI/UX, RBAC e fluxos — Painel de Célula

**Data:** 2026-07-02
**Trabalho:** direto na `main` (política do projeto; ver `CLAUDE.md`)
**Autor:** sessão autônoma (Claude Opus)
**Status:** **spec v3 (FINAL)** — segue para o plano. Ciclo: v1 → R1 → v2 → R2 (2 lentes) → **v3**.

---

## 0. Histórico de revisões

**v2 → v3 — incorpora a Review 2 (lente A corretude F1–F13 + lente B UX/design P1–P12), a diretriz de acabamento cromado, e a ordem "UI primeiro, design system depois".**

Corretude (lente A):
- **F1** Rota dedicada **`/app/aprovacoes`** (guard `SoLider`, só Pendentes da própria célula) — o redirect `/app/usuarios`→admin decapitaria o líder. Repontar o link "Aprovações".
- **F2** Fase 0 **extrai `useOverlayDismiss` do `Sheet`** (lock/trap/Esc hoje inline) e refatora o `Sheet` **antes** do `Modal`.
- **F3** Coerência `diaSemana × weekday(data)`: **pinar fuso** — front envia wall-clock ingênuo (`YYYY-MM-DDTHH:mm`, **sem `toISOString()`**); backend usa `getUTCDay()` **consistente com `materializarEncontros`**; `.refine` **só na criação** (condicional). Teste perto da meia-noite BRT.
- **F4** `migrate deploy` **já roda** no `docker/entrypoint.sh` (manter); Fase 1 **liga** `garantir-super-admin.js` ao entrypoint (bloco guardado por `SUPER_ADMIN_EMAIL`).
- **F5** Não há "toggle ativo" separado — `ativo` é campo do `PUT /usuarios/:id`; **guard único** ali, após o `findUnique` do alvo.
- **F6** `podeEditarPapel` reescrito por completo com **ordem e `return` default** explícitos; handler passa `alvo.papel` **fresco do banco**.
- **F7** Estado civil: **marcar→`CASADO`, desmarcar→`SOLTEIRO`, sem transição não envia**; documentar colapso de `DIVORCIADO/VIUVO/UNIAO_ESTAVEL` em `SOLTEIRO` (perda controlada/intencional).
- **F8** `CelulaPicker` é **componente apresentacional** usado **sempre como TELA** no onboarding; variante "modal" **cortada** (YAGNI) — backend bloqueia troca de célula pós-vínculo, sem consumidor real.
- **F9** Bug de duplicação de célula **já corrigido** no código (transação+retry+`break`; `materializarEncontros` idempotente fora). **Não** mover para dentro da transação (seria regressão). Único bug real: **`string→number`** (`z.coerce.number()` + `Number()` no front).
- **F10** Janela Fase 1→3: guard novo faz botões da UI antiga 403arem (mais seguro, não quebra) — aceitável; opcional esconder ação na Fase 2.
- **F12** "Admin não vê usuários" = conta **inativa** (`ativo=false`) → operacional; `linksPorPapel`/TopBar deve tratar `ativo=false` (aviso/ocultar), e o diagnóstico conclui "reativar a conta".
- **F13** Admin **sem célula**: desabilitar a aba "Minha célula" no `ContextSwitcher` (telas de membro não têm célula).

Estrutura/UX (lente B):
- **P1 (crítico)** Trocar a silhueta de coluna única: **larguras por tipo de tela** (listas admin `max-w-6xl`; formulários/leitura `max-w-2xl`; onboarding centrado). **Admin › Usuários › Todos** vira **linha de dados responsiva** (grid `Nome · Email · Status · Papel · Ações`, `divide-y`, `hover:bg-surface`, `h-14` no desktop; card empilhado no mobile). Pendentes seguem em cards (poucos, pedem destaque). **Sub-nav admin como rail lateral em `lg+`** (sensação de "app", não de blog).
- **P2 (crítico)** Novos primitivos **`Skeleton`** e **`EmptyState`** (+ estado de **erro com retry**). Regra: **skeleton enquanto carrega**, empty só quando `!carregando && vazio` (mata o "nenhuma célula" piscando).
- **P3 (crítico)** `CelulaPicker` bonito **sem foto e sem líder** (dado real): `Avatar` com **cor determinística por nome** (hash→hue, saturação baixa/grafite), **identidade da célula como âncora** (ícone-em-caixinha + monograma/cor do nome da célula), **um líder em destaque + `+N`**, e estado **"Líder a definir"** elegante.
- **P4 (alto)** Cadastro de célula **multi-step** (Identificação → Encontro → Endereço) com progresso; **endereço colapsa no CEP** (autofill → revela campos). Inputs `h-11`, `space-y-5`. Mesma disciplina em Perfil/`/cadastro`.
- **P5 (alto)** Contraste dos chips **cravado**: `text-{cor}-700` no **light**, `dark:text-{cor}-400`; amber/emerald/red no `-600` **reprovam** AA no light. Tabela `CORES_PAPEL` com os dois modos + checagem de contraste no aceite.
- **P6 (alto)** Sistema de **`Toast`** (provider global, success/error/info, aria-live, auto-dismiss) — usar em **todas as mutations**; substitui os "Salvo!" inline.
- **P7 (alto)** `RoleSelect`: **hit area ≥44px**; **Popover no desktop, `Sheet` no mobile** (reusa o Sheet); read-only vira `RoleBadge` estático (sem affordance mentirosa).
- **P8 (médio-alto)** **Badge de pendências** no segmento "Administração" do switcher e no item "Usuários"; alimentar o **Sino**; **aprovação em massa** (selecionar + "Aprovar selecionados").
- **P9 (médio)** `ContextSwitcher` com **ícone+rótulo**; comportamento **mobile definido** (colapsa em botão-ícone que abre `Sheet`, ou 2ª linha) — não pode estourar o header.
- **P10 (médio)** **Auditar/migrar todos os `<select>/<input>/<textarea>` crus** (CronogramaForm, Calendário, Pedidos, Testemunhos, filtros) para os primitivos; **unificar `Select`+`Combobox`** (mesmo trigger/painel).
- **P11 (médio)** **Contrato de a11y por primitivo** (aria + mapa de teclado) e **token único de foco** (`focus-visible:ring-2 ring-brand ring-offset-2 ring-offset-background`) em todos os interativos.
- **P12 (baixo-médio)** Legenda dos 4 níveis vira **popover "?"** (não bloco fixo ocupando altura); header compacto no mobile (`text-xl`).

Identidade:
- **Acabamento cromado/metálico prata** (não cinza chapado): evoluir `--brand-grad` para gradiente metálico multi-stop com *highlight* no topo e *sheen* sutil, em CTAs/logo/segmento ativo/chip Super Admin; dark mais reflexivo; contraste AA do texto sobre metal; hover desloca o sheen (reduced-motion). Detalhe em §4.6.
- **`design-system/MASTER.md` NÃO é gerado agora** — será **destilado na Fase 8**, a partir da UI já reformada (o MASTER atual está **obsoleto**: descreve marca laranja; a real é prata `#64748b`).

---

## 1. Contexto e motivação

A entrega anterior deixou a plataforma funcional no backend, mas a UI/UX ficou grosseira ("cara de Google Forms", minhocão vertical) e faltaram fluxos. Feedback do dono (3 áudios), consolidado:

- Reformar tudo bonito, moderno, sofisticado (ref.: **Nexus Insights/Odoo**); marca **prata cromada**.
- **Usuários**: abas Pendentes/Todos; status **"em aprovação"**; papéis como **chips coloridos**; admin **vê e gerencia** usuários; **listar os níveis**.
- **Admin** concede Líder e Admin, aprova, desativa — "faz praticamente tudo", **abaixo do Super Admin**. **Super Admin** = dono `nexusai360@gmail.com` (único que concede Super Admin).
- **Separar** Administração × minha célula (modo líder/membro).
- **Líderes** aprovam pendentes da própria célula.
- **Cadastro** pede a célula via **tela bonita** (cards com líderes, dia, horário, frequência, **bairro**).
- **Estado civil** por **checkbox "casado(a)"** que revela o cônjuge.
- **Cadastro de célula**: placeholders/máscaras, "**data e horário** do 1º encontro", endereço, **CEP com máscara**, **checkbox "sem número"**; **bug ao criar**.
- **Publicar aviso** fora de Usuários.

Execução **autônoma até o fim**, metodologia à risca (spec ok → plano v1→R1→v2→R2→v3 → TDD → testes → verificação → PR). Trabalho **direto na `main`**. **Frontend sempre com a skill `ui-ux-pro-max`.**

---

## 2. Estado atual (código + dado real confrontado)

### Backend (`apps/api`) — confirmado no código
- **Papéis** `MEMBRO/LIDER/ADMIN/SUPER_ADMIN` (rank 1–4). **EstadoCivil** `SOLTEIRO/CASADO/DIVORCIADO/VIUVO/UNIAO_ESTAVEL`.
- `GET /usuarios` (ADMIN, take:50, busca) **já lista todos**. `GET /usuarios/pendentes` (LIDER; admin vê todos, líder só da própria célula). `POST /usuarios/:id/aprovar|recusar` (líder já aprova/recusa da própria célula; **recusar = hard delete**). `PATCH /usuarios/:id/papel` (ADMIN, `podeEditarPapel`, faz `findUnique` do alvo, bloqueia auto). `PUT /usuarios/:id` (ADMIN; nome/email/whatsapp/**ativo** num só endpoint; faz `findUnique` do alvo; **não checa `alvo.papel`** → vetor aberto).
- **`podeEditarPapel`** hoje: `ALTO_NIVEL(ADMIN/SUPER)` em atual **ou** novo → exige SUPER; senão nível ADMIN.
- **Célula**: `cidade/bairro/endereco/numero/complemento/pontoReferencia` (**sem `cep`**). `celulaSchema`: `diaSemana z.number().int()` (0–6), `frequenciaDias z.number()` ∈ {7,14,28}, `dataPrimeiroEncontro z.coerce.date()`. Criação **em `$transaction` com retry P2002 + `break`**; `materializarEncontros` **fora**, idempotente. `celulaUpdateSchema` separado (todos `.optional()`). **Nada garante `diaSemana` coerente com a data.**
- **QR/presença**: `POST /qr/:qrToken/checkin` valida `celulaId` do user + `Encontro` de hoje + horário. **Correto — não mexer.**
- **`PUT /perfil`**: update **parcial** real (campo ausente não é tocado → preserva legado). `POST /perfil/celula` **bloqueia** trocar de célula depois de vinculado.
- **Deploy**: `docker/entrypoint.sh` **já roda `prisma:deploy`** antes do boot e um bloco `ADMIN_EMAIL→npm run admin`. **Não** chama o novo `garantir-super-admin`.
- **Notificações (Fase 6b)**: modelo `Notificacao`, rota, `NotificacoesSino` — **preservar**.

### Dado real (SELECT em `icelula`)
- SUPER_ADMIN `nexusai360@gmail.com`: `aprovado=t, ativo=t`, **sem avatar**. ADMIN de teste: `aprovado=t, ativo=f` (**inativo** → causa do "não vê usuários"). **Ninguém tem avatar; nenhum líder definido; `estadoCivil` todos null** (sem legado). Célula "Célula Centro" coerente (`diaSemana=3`=DOW).

### Frontend (`apps/web/src`) — pós-Fases 6b/7
- `linksPorPapel` (`TopBar.jsx`): `aprovado===false`→`[]` **antes** de checar admin; `ehAdmin`→grupo "Administração" (Células, Usuários) + (se `celulaId`) "Minha célula"; LIDER soma Minha Célula/**Aprovações (`/app/usuarios`)**/Testemunhos/Vidas; **Sino** presente.
- `App.jsx`: `InicioOuCelulas` (admin sem célula→`/app/celulas`), `SoLider/SoAdmin/SoGestor`, `AppComGate` (trava pendente). Rotas planas.
- `Sheet.jsx`: bottom-sheet com **lock/trap/Esc/drag inline em `useEffect`** (não há hook extraído).
- Primitivos: `Button, Input, Select(sem busca), Tag/StatusTag, Card, ConfirmDialog, Sheet, DateTimePicker, Avatar, Spinner`. **Faltam**: `Tabs, Checkbox, Modal, Combobox, RoleSelect, ContextSwitcher, Skeleton, EmptyState, Toast, máscara`.
- Stack: React 19 + Vite + Tailwind v4, `framer-motion`, `react-hook-form`, `zod`, `lucide`. Local **http://localhost:3200**.

### Referência visual
Insights/Odoo (gêmeos): chips `bg-{cor}-500/10 border-{cor}-500/30`; BadgeSelect (chip=trigger); Tabs pill; ícone-em-caixinha `rounded-xl bg-brand/10`; Card `ring-1`; overlay `bg-black/60 backdrop-blur`; framer-motion + reduced-motion. **Adaptar à marca prata cromada.**

---

## 3. Objetivos e não-objetivos

### Objetivos
1. UI nível "Insights" na **marca prata cromada**: abas, chips, cards com anel, **listas densas com respiro**, larguras por tela, sidebar admin no desktop, micro-interações.
2. **`ContextSwitcher`** Administração × Minha célula (ADMIN+), sobre os grupos da Fase 7.
3. **Usuários** reformada (abas, chips status+papel, `RoleSelect`, legenda em popover, **linha de dados** no desktop).
4. **Hierarquia**: admin nomeia até Admin; **mexer em Admin/Super é do Super Admin**; Super Admin = dono.
5. **Avisos** como destino próprio.
6. **Cadastro de célula** multi-step: CEP máscara/autofill, **cidade via Combobox**, "sem número", placeholders, "data e horário"; **fix `string→number`**; **coerência `diaSemana`×data**.
7. **Perfil** e **`/cadastro`** reformulados: estado civil checkbox (map-back seguro), sem cara de formulário, máscara WhatsApp.
8. **Seleção de célula** (tela) bonita **mesmo sem foto/líder**.
9. **QR**: ramo "com conta" especificado; **check-in intocado**.
10. Primitivos novos com **a11y e Skeleton/EmptyState/Toast**. Testes verdes; cada fase **deployável**.

### Não-objetivos (YAGNI)
- Paginação real de usuários; base IBGE completa (Combobox curado + digitável); redesenho de Pedidos/Testemunhos/Calendário além de reuso; trocar stack; variante **modal** do CelulaPicker; mover `materializarEncontros` para dentro da transação.

---

## 4. Arquitetura

### 4.1 Papéis, status e permissões (fonte da verdade)

| Papel | Rótulo | Chip (light `-700` / dark `-400`) | ícone |
|---|---|---|---|
| `MEMBRO` | Membro | zinc | `Eye` |
| `LIDER` | Líder | amber | `Shield` |
| `ADMIN` | Administrador | blue | `ShieldCheck` |
| `SUPER_ADMIN` | Super Admin | purple (chip **cromado**) | `Crown` |

Status: Em aprovação — amber/`Clock`; Ativo — emerald/`UserCheck`; Inativo — red/`UserX`. Fórmula: `bg-{cor}-500/10 border border-{cor}-500/30 text-{cor}-700 dark:text-{cor}-400` (+ ícone + texto).

**`podeEditarPapel(editor, atual, novo)` — pseudocódigo final (ordem importa, `return` default):**
```
const ALTO = new Set(['ADMIN','SUPER_ADMIN'])
if (novo === 'SUPER_ADMIN' || atual === 'SUPER_ADMIN') return editor === 'SUPER_ADMIN'  // conceder/mexer em super
if (atual === 'ADMIN')  return editor === 'SUPER_ADMIN'   // rebaixar/alterar um admin → só super
if (novo === 'ADMIN')   return temNivel(editor, 'ADMIN')  // promover p/ admin → admin+
return temNivel(editor, 'ADMIN')                          // MEMBRO↔LIDER e no-ops → admin+
```
Handler `PATCH /papel` passa `atual = alvo.papel` **fresco do `findUnique`**; auto-alteração bloqueada (guard existente).

**Guard único no `PUT /usuarios/:id`** (após `const alvo = findUnique`): se `alvo.papel==='SUPER_ADMIN'` **ou** (`alvo.papel==='ADMIN'` && `editor!=='SUPER_ADMIN'`) → **403**. Fecha o vetor de admin editar nome/email/ativo do super ou de outro admin.

**Super Admin dono:** `garantir-super-admin.js` idempotente (promove `SUPER_ADMIN_EMAIL`, default `nexusai360@gmail.com`, garantindo `aprovado=ativo=true`); **ligado ao `docker/entrypoint.sh`** (bloco guardado pela env). Doc no DEPLOY/compose.

### 4.2 Navegação e shells
```
Header: logo cromado · [ContextSwitcher: 🛡 Administração | 👥 Minha célula]* · Sino(badge pendências) · Avatar
  * só ADMIN+ (derivado do papel ATUAL); em <md colapsa (botão-ícone → Sheet)
Admin (rail lateral em lg+, abas no topo em <lg): Usuários · Células · Avisos
Minha célula: Início · Calendário · Pedidos · (Líder: Minha Célula · Aprovações · Testemunhos · Vidas)
```
- **Route-group `/app/admin/*`** (`AdminLayout`): `/app/admin/usuarios` (abas Pendentes·Todos), `/app/admin/celulas`, `/app/admin/avisos`; guard `SoAdmin`.
- **F1:** nova rota **`/app/aprovacoes`** (guard `SoLider`; componente **só Pendentes** reusando `GET /usuarios/pendentes`); link "Aprovações" aponta pra ela. **Só então** `/app/usuarios`→`/app/admin/usuarios` (compat) e `/app/celulas`→`/app/admin/celulas`.
- **`ContextSwitcher`**: disponibilidade do **papel atual**; preferência em `localStorage` **por `usuario.id`**, ignorada se papel não permite; limpa no logout. **F13:** aba "Minha célula" desabilitada se admin sem `celulaId`.
- **Destino default** só em `InicioOuCelulas`: admin sem célula → `/app/admin/usuarios`; com célula → `/app`.
- **Avisos** → `/app/admin/avisos`. **F12:** `linksPorPapel` trata `ativo=false` (aviso "conta inativa"/oculta links).

### 4.3 Novos primitivos (`components/ui/`) — padrão do projeto, com contrato de a11y (P11)
Token de foco único em todos: `focus-visible:ring-2 ring-brand ring-offset-2 ring-offset-background`.
0. **`useOverlayDismiss(open,onClose,panelRef)`** — extraído do `Sheet` (scroll-lock + focus-trap + Esc); `Sheet` refatorado para consumi-lo (sem regressão de drag/restore de foco). **Pré-requisito de `Modal`.**
1. **`Tabs`** (`role=tablist`, setas/Home/End, `aria-selected`, roving tabindex; pill/line).
2. **`Checkbox`** (label, `aria-checked`, teclado).
3. **`Modal`** (usa `useOverlayDismiss`; `aria-modal`, `aria-labelledby`, foco inicial, restore; `bg-black/60 backdrop-blur`; `rounded-2xl`).
4. **`Combobox`** (`role=combobox`, `aria-expanded/controls/activedescendant`, `listbox/option`, type-ahead, **valor livre** injetável — p/ cidade fora da lista). No mobile abre em `Sheet`.
5. **`RoleSelect`** (chip=trigger, `aria-haspopup=listbox`, `aria-expanded`, teclado; **hit area ≥44px**; **Popover desktop / Sheet mobile**; read-only → `RoleBadge`; oculta papéis que o editor não pode conceder).
6. **`RoleBadge`/`StatusBadge`** (chips estáticos; `CORES_PAPEL` com `-700`/`-400`).
7. **`ContextSwitcher`** (SegmentedControl ícone+rótulo; mobile em Sheet).
8. **`Skeleton`** (shimmer, reduced-motion) e **`EmptyState`** (ícone-caixinha+título+subtítulo+CTA) e estado de **erro/retry**.
9. **`Toast`** (provider global; success/error/info; `aria-live=polite`, não rouba foco; auto-dismiss 3–5s).
10. **`CelulaPicker`** (apresentacional; §5.5).
11. **Máscaras** `lib/mascaras.js` (`mascaraCep`, `mascaraTelefone`). `lib/papeis.js`: `CORES_PAPEL`, `ehLider`, `ehGestor`. `lib/cidades.js`: municípios curados + digitável. `lib/avatarCor.js`: cor determinística por nome (hash→HSL grafite).

### 4.4 Fluxos
**A. Sem QR:** `/cadastro` (reformulado) → auto-login pendente → **`/app/selecionar-celula`** (tela) → `CelulaPicker` → `apiSelecionarCelula` → **`/app/aguardando`** (StatusBadge + "Atualizar status"). Aprova admin ou líder da célula.
**B. QR:** `/c/:qrToken` — **sem conta**: cria (aprovado+vinculado) → `apiCheckinQr` → `/app` "Presença registrada"; **com conta** (logado/faz login): lê QR → `apiCheckinQr` (mesma validação: `Encontro` hoje + horário) → confirmação "Presença registrada" / "Não há reunião hoje" / "Disponível a partir do horário". Sem aprovação.
**C. Admin › Usuários:** abas **Pendentes** (cards; **Recusar** via `ConfirmDialog` "irreversível" + Toast; **aprovação em massa**) · **Todos** (linha de dados; busca Combobox; `StatusBadge`; `RoleSelect`; Ativar/Desativar bloqueado p/ si, super, e admin quando editor≠super). Legenda em **popover "?"**. Badge de pendências no switcher/sub-nav/Sino.
**D. Líder › Aprovações:** `/app/aprovacoes` (própria célula).

### 4.5 Backend — mudanças
1. `lib/roles.js`: `podeEditarPapel` (§4.1) + testes (matriz completa de transições).
2. `routes/usuarios.js`: guard único no `PUT /:id` (§4.1) + testes; (Fase 2) reativar/diagnosticar conta admin inativa.
3. `schema.prisma`: **`cep String?`** (migration aditiva). `celulaSchema`: `cep?` (regex opcional), **`z.coerce.number()`** em `diaSemana`/`frequenciaDias`, **`.refine` só na criação** validando `diaSemana === getUTCDay(dataPrimeiroEncontro)` (condicional a ambos presentes) + testes (incl. meia-noite BRT). **Não** replicar o refine no update.
4. `routes/celulas.js`: **fix `string→number`** (já coberto por (3) + `Number()` no front); **não** mover `materializarEncontros`.
5. **QR:** intocado; garantir ramo "com conta" no front.
6. `prisma/garantir-super-admin.js` + npm script + chamada no `entrypoint.sh`.
7. `docker/entrypoint.sh`: adicionar bloco `SUPER_ADMIN_EMAIL → npm run …`; `migrate deploy` já existe.

**Estado civil (map-back):** UI envia `estadoCivil` **só na transição** do checkbox — **marcar→`CASADO`**, **desmarcar→`SOLTEIRO`**; sem transição, campo ausente (backend preserva). Leitura: marcado se `∈{CASADO,UNIAO_ESTAVEL}`. Colapso de `DIVORCIADO/VIUVO/UNIAO_ESTAVEL`→`SOLTEIRO` no desmarcar é **intencional**.

### 4.6 Acabamento cromado (identidade)
- Evoluir `--brand-grad` para **metálico multi-stop** (ex.: highlight claro no topo → grafite médio → highlight sutil na base), aplicado em: CTA primário, logo, segmento ativo do `ContextSwitcher`, chip Super Admin, header de auth.
- **Sheen especular:** borda superior clara (`inset 0 1px 0 rgba(255,255,255,.25)`) + sombra interna sutil na base; classe utilitária `.chrome` no `index.css`.
- **Dark**: cromado mais claro/reflexivo (`--brand` dark já `#b9c1cd`); **light**: mais grafite. Texto sobre metal sempre AA (`--on-brand`).
- **Hover** desloca o sheen (transform/opacity, 150–300ms) com `prefers-reduced-motion` desligando. Uso **parcimonioso** (só destaques).

---

## 5. Telas (o "incrível")

Princípios: header ícone-em-caixinha + título (`text-2xl`; `text-xl` no mobile) + subtítulo; cards `ring-1`/`rounded-[16px]`; **largura por tipo** (P1); `space-y-6` (comprimido no mobile); chips coloridos; abas pill; **Skeleton** no load, **EmptyState** contextual, **erro/retry**; entrada framer-motion (fade+y 200–300ms, stagger 30–50ms, reduced-motion); **Toast** nas mutations.

### 5.1 Admin › Usuários (`max-w-6xl`)
Header + botão "?" abre popover com a legenda dos 4 níveis. **Tabs** `Pendentes (n)` · `Todos`.
- **Pendentes** (cards): Avatar/nome/email/**célula pretendida**/`StatusBadge "Em aprovação"`/data; **Recusar** (danger, `ConfirmDialog` "irreversível") e **Aprovar** (brand); **seleção múltipla** + "Aprovar selecionados".
- **Todos** (**linha de dados** em `md+`: grid `Avatar+Nome · Email · StatusBadge · RoleSelect · Ativar/Desativar`, `divide-y`, `hover:bg-surface`, `h-14`; **card empilhado no mobile**): busca via Combobox; bloqueios de ação da §4.4-C; Desativar oculto quando alvo é Admin/Super e editor≠super (P10/F10).

### 5.2 Admin › Células (`max-w-6xl` na lista; form em `max-w-2xl`/Modal)
Lista: cards nome/dia/frequência/contagem/chip líder (ou "Líder a definir")/ações (definir líder via **Combobox**, excluir com confirm). **Nova célula = `Modal` multi-step (P4):**
1. **Identificação** — Nome (ph "Ex.: Célula Esperança"), Descrição (ph "Ex.: Jovens do bairro").
2. **Encontro** — Dia; Frequência; **"Data e horário do primeiro encontro"** (`DateTimePicker`, envia wall-clock ingênuo).
3. **Endereço** — **CEP** (máscara `00000-000`, autofill ViaCEP com `AbortController`+timeout+debounce) → revela **Cidade (Combobox)** / Bairro / Rua / Número + **checkbox "Sem número"** (→ `numero='S/N'`) / Complemento / Ponto de referência.
Barra de progresso; um CTA primário por passo; Toast ao criar.

### 5.3 Admin › Avisos (`max-w-2xl`)
Card: textarea (ph "Ex.: Neste sábado teremos culto especial às 19h."), `Checkbox` "Exibir para todos", Salvar (Toast); **preview** do banner.

### 5.4 Perfil (`max-w-2xl`) e 5.4b `/cadastro`
Seções com ícone-em-caixinha (não pilha de campos). **Perfil:** avatar (`AvatarUpload`), campos com placeholder/máscara, **checkbox "Sou casado(a)"** → `ConjugeSecao` (map-back seguro, animada), chip de papel, salvar (Toast), sair separado. **`/cadastro`:** card centrado, hierarquia clara, placeholders, senha com toggle — **entregável explícito**.

### 5.5 Onboarding (`SelecionarCelula`/`Aguardando`)
**`CelulaPicker` bonito sem foto/líder (P3):** header do card = ícone-em-caixinha `bg-brand/10` + monograma/cor derivada do **nome da célula**; `Avatar` de líder com **cor determinística** (um líder em destaque + `+N`); estado **"Líder a definir"** (chip neutro) quando não há líder; metadados `Dia · Horário · Frequência` + **bairro**; anel brand no selecionado. `Aguardando`: `StatusBadge "Em aprovação"` + nome da célula + **"Atualizar status"** (re-fetch `apiMe`) + "Completar perfil".

---

## 6. Bug de criação de célula (systematic-debugging) — escopo reduzido (F9)
O código atual **já** cria em transação com retry+`break` e materializa idempotente fora — **duplicação já resolvida**. Bug real remanescente: **`diaSemana`/`frequenciaDias` como string** (`z.number()` não coage) → 400. **Repro → fix (`z.coerce.number()` + `Number()` no front) → teste de regressão.** Não mexer na materialização.

---

## 7. Faseamento (cada fase deixa a `main` deployável; commits atômicos; TDD; frontend com `ui-ux-pro-max`)

- **Fase 0 — Fundação de UI:** `useOverlayDismiss` (extraído do Sheet) → `Modal`; `Tabs, Checkbox, Combobox, RoleBadge, StatusBadge, RoleSelect, ContextSwitcher, Skeleton, EmptyState, Toast`; `lib/{mascaras,cidades,avatarCor}.js`, `CORES_PAPEL`/`ehLider`/`ehGestor`, token de foco. Testes de lógica + a11y por primitivo.
- **Fase 1 — RBAC/hierarquia (backend+front):** `podeEditarPapel` + guard `PUT /:id` + testes; `garantir-super-admin.js` + `entrypoint.sh`; labels/legenda; `StatusBadge`.
- **Fase 2 — Diagnóstico "admin não vê usuários":** confirmar conta inativa; reativar; `linksPorPapel` tratar `ativo=false`.
- **Fase 3 — Shell admin + Usuários + Aprovações do líder (juntas):** `AdminLayout`+route-group+rail/abas+`ContextSwitcher`(+badge)+redirects; **`/app/aprovacoes` (SoLider)**; Usuários reformada (abas, linha de dados, chips, `RoleSelect`, busca, aprovação em massa); Avisos movido.
- **Fase 4 — Células:** `cep` migration + schema (coerção + coerência UTC condicional); form multi-step (CEP/cidade/sem número/placeholders/"data e horário"); **fix string→number**; definir líder via Combobox.
- **Fase 5 — Perfil + `/cadastro`:** estado civil checkbox (transições CASADO/SOLTEIRO) + cônjuge; layout seções; máscara WhatsApp; signup reformulado.
- **Fase 6 — Onboarding & seleção:** `CelulaPicker` (tela, bonito sem foto/líder), fluxo cadastro→seleção→aprovação, `Aguardando` refresh.
- **Fase 7 — QR:** ramo "com conta" + mensagens; check-in intocado; testes.
- **Fase 8 — Polimento, migração de crus & design system:** `ui-ux-pro-max` pass; **migrar todos os `<select>/<input>` crus** e **unificar Select/Combobox**; responsividade/animações/cromado; E2E manual (todos os fluxos) contra `localhost:3200`; `tsc`/lint/jest verdes; **destilar `design-system/MASTER.md`** da UI nova (corrigindo o obsoleto).

**Deploy:** `migrate deploy` já roda no `entrypoint.sh`; `cep` aditivo/nullable. Nenhum merge deixa rota do switcher órfã (Fase 3 funde shell+telas+aprovações).

---

## 8. Critérios de aceite (verificáveis)
1. Admin (não super) **vê e gerencia** usuários; promove membro a Líder e Admin; **não** vê Super Admin; **não** rebaixa/desativa/edita Admin ou Super Admin (403).
2. Super Admin (`nexusai360`) concede Super Admin e gerencia admins.
3. Usuários com **abas** Pendentes/Todos; "Em aprovação"; **chips coloridos**; troca por chip; **Todos em linha de dados** no desktop (não coluna de cards).
4. **`ContextSwitcher`** funciona; admin mantém área de membro; disponibilidade do papel atual; aba "Minha célula" desabilitada sem célula.
5. **Avisos** fora de Usuários.
6. Célula: **multi-step**, **CEP máscara+autofill**, **Cidade Combobox**, **"sem número"**, placeholders, **"Data e horário…"**, **cria sem bug** (repro→fix→teste), **rejeita `diaSemana` incoerente** sem falso-positivo de fuso.
7. Perfil e `/cadastro` reformulados; **checkbox "casado(a)"**; sem divorciado/viúvo/união na UI; **estado civil só grava em transição**; WhatsApp com máscara.
8. Cadastro sem QR → **seleção de célula** bonita **mesmo sem foto/líder** → aprovação.
9. **Líder** aprova em `/app/aprovacoes` (não perdeu a função com os redirects); QR "com conta" registra presença; check-in **sem regressão**.
10. Primitivos com **a11y** (teclado/aria/foco), **contraste chips AA** (light `-700`), **Skeleton/EmptyState/Toast** em uso; `npm test` verde; cada fase **deployável**.
11. Visual **prata cromado** sofisticado, responsivo (375/768/1024/1440), micro-interações, dark mode; `NotificacoesSino` preservado.

## 9. Riscos e mitigação
- **ViaCEP:** best-effort (abort/timeout/debounce); campos editáveis. **RBAC:** testes antes do front. **QR:** não tocar no check-in. **Fuso (F3):** wall-clock ingênuo + `getUTCDay` consistente com materialização; refine só na criação. **Estado civil (F7):** só grava em transição. **Deploy:** `migrate deploy` já existe; `cep` aditivo. **Switcher stale:** papel atual + storage por id. **Sessão única na `main`** (sem paralela).

## 10. Terminologia
**Contexto** (Administração/Minha célula) · **Papel** · **Status** (Em aprovação/Ativo/Inativo) · **Célula pretendida** · **Linha de dados** (lista densa desktop) · **Cromado** (acabamento metálico da marca).
