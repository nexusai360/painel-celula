# Reforma completa de UI/UX, RBAC e fluxos — Painel de Célula

**Data:** 2026-07-02
**Branch:** `feat/reforma-ui-rbac-celulas`
**Autor:** sessão autônoma (Claude Opus)
**Status:** spec v1 → (2 reviews adversariais) → v-final

---

## 1. Contexto e motivação

A entrega anterior deixou a plataforma funcional no backend, mas a UI/UX ficou grosseira e desorganizada, e faltaram fluxos que o dono pediu. Feedback direto do dono (transcrito e consolidado das três mensagens de áudio):

- Telas "com cara de Google Forms", minhocão vertical, sem sutileza, sem aproveitamento de tela.
- Tela de **Usuários** bagunçada: legenda ruim, aprovações misturadas com todos os usuários, sem abas.
- Falta o **status "em aprovação"** antes de a pessoa virar membro.
- Seleção de papel feia — quer **tags coloridas** (mesmo dentro do select).
- **Admin** deve poder conceder papéis (Líder e Admin), aprovar e desativar — "faz praticamente tudo", mas **abaixo do Super Admin**.
- **Super Admin** é o dono (`nexusai360@gmail.com`), único que concede `SUPER_ADMIN`. Admin **não** é dono.
- **Separação clara** entre a área de **Administração** e a área da **minha célula** (modo líder/membro) — hoje o admin nem enxerga a área de membro.
- Admin **não consegue ver/gerenciar** os usuários direito; precisa listar os níveis de permissão existentes.
- **Líderes** também aprovam pessoas que dizem pertencer à célula deles.
- **Cadastro** não pergunta a célula; precisa de uma **tela/modal bonito** para a pessoa escolher a célula (cards com **foto dos líderes**, dia, horário, frequência, **bairro**).
- **Estado civil** constrangedor (união estável/divorciado/viúvo) → trocar por **checkbox "casado(a)"** que revela a seção do cônjuge.
- **Cadastro de célula**: placeholders/máscaras em todos os campos, "**data e horário** do primeiro encontro", **endereço** (cidade/bairro/rua), **CEP com máscara**, **checkbox "sem número"**, e há um **bug ao criar célula**.
- **Publicar aviso** deve sair de dentro de Usuários (hoje é um bloco solto no topo).
- Referência visual: **Nexus Insights / Nexus Odoo** (sofisticação, modernidade).

O dono autorizou execução **autônoma até o fim**, seguindo a metodologia (spec → reviews → plano → reviews → TDD → testes → PR), sem perguntas.

---

## 2. Estado atual (levantado no código, factual)

### Backend (`apps/api`)
- **Papéis** (`enum Papel`): `MEMBRO, LIDER, ADMIN, SUPER_ADMIN` (rank 1–4).
- `GET /usuarios` (ADMIN) **já lista todos** (take:50, busca nome/email). `GET /usuarios/pendentes` (LIDER) — admin vê todos os pendentes; **líder vê só os da própria célula**. `POST /usuarios/:id/aprovar|recusar` — líder já aprova/recusa pendentes da própria célula. `PATCH /usuarios/:id/papel` (ADMIN) usa `podeEditarPapel`.
- **`podeEditarPapel`** (`lib/roles.js`): conceder/revogar `ADMIN`/`SUPER_ADMIN` é **exclusivo do SUPER_ADMIN** hoje. ← precisa mudar.
- **Célula**: campos de endereço `cidade, bairro, endereco, numero, complemento, pontoReferencia`. **Não há `cep`.** `POST /celulas` (ADMIN) valida `frequenciaDias ∈ {7,14,28}`, `dataPrimeiroEncontro` (coerce.date).
- **QR/presença**: `POST /qr/:qrToken/checkin` valida célula do usuário + existência de encontro hoje + horário de início (`podeMarcarPresenca`). **Não valida `diaSemana` explicitamente**; exige conta aprovada.
- **Registro**: `registerSchema` aceita `nome,email,senha,qrToken?`. Com QR → `aprovado=true` + `celulaId`. Sem QR → `aprovado=false`, sem célula.
- **Login** não bloqueia pendente (entra em área travada). `AppComGate` roteia pendente.
- **Super admin**: `criar-admin.js` cria `SUPER_ADMIN` a partir de env; seed demo cria `ADMIN`. **`nexusai360` não existe no código.**

### Frontend (`apps/web/src`)
- **Navegação** por `linksPorPapel` (`TopBar.jsx`): `aprovado===false` → `[]`; **`ehAdmin` → só `Células`+`Usuários`** (admin perde a área de membro); membro → Início/Calendário/Pedidos; líder soma Minha Célula/Aprovações/Testemunhos/Vidas.
- **`AppLayout`** mínimo: TopBar + BannerBar + `<main max-w-3xl>`. **Sem shell/route-group de admin, sem switcher de contexto.**
- **Fluxo de onboarding** já existe: cadastro sem QR → pendente sem célula → `SelecionarCelula` (tela cheia, cards com avatares de líderes) → `Aguardando` (estática).
- **Primitivos existentes**: `Button, Input, Select (custom, sem busca), Tag/StatusTag, Card, ConfirmDialog, Sheet (bottom-sheet robusto), DateTimePicker, Avatar, Spinner, Logo, ThemeToggle`.
- **Faltam**: `Tabs`, `Checkbox`, `Modal` genérico, `Combobox/Autocomplete`, máscara de input, `RoleSelect` (chip colorido clicável), switcher de contexto, helpers `ehLider/ehGestor`.
- **Marca do Painel**: cinza/prata (tokens em `index.css`), dark por classe. `framer-motion`, `react-hook-form`, `zod`, `lucide` já instalados.

### Referência visual (Nexus Insights / Odoo)
- Chips por status/papel: fórmula `bg-{cor}-500/10 border-{cor}-500/30 text-{cor}-600 dark:text-{cor}-400` + ícone Lucide.
- `BadgeSelect`: o **próprio chip colorido é o trigger** do select (combobox), opções com ícone+label+descrição+check.
- Tabs pill em `bg-muted`, aba ativa `bg-background shadow-sm`.
- Ícone-em-caixinha `h-10 w-10 rounded-xl bg-brand/10` em headers.
- Card com `ring-1 ring-foreground/10`, `rounded-xl`.
- Overlays `bg-black/60 backdrop-blur-sm`; dialog `rounded-2xl shadow-2xl`.
- `framer-motion` para entrada/hover; sempre com `prefers-reduced-motion`.

> **Decisão de identidade:** manter a **marca prata/grafite do Painel** (não importar o violeta do Insights). Importar apenas as *fórmulas* de chip/tabs/card/animações e a **paleta semântica** (roles/status) — que é neutra e semântica, não de marca.

---

## 3. Objetivos e não-objetivos

### Objetivos
1. Reformar a linguagem visual para o nível "Insights": sofisticada, respirada, com abas, chips coloridos, cards com anel, micro-interações.
2. Separar com clareza **Administração** × **Minha célula/Membro**, com **switcher de contexto** para quem é ADMIN+.
3. Reformar a tela de **Usuários** (abas Pendentes/Todos, chips de status+papel, `RoleSelect`, legenda dos níveis).
4. Corrigir a **hierarquia de papéis**: Admin concede até Admin; Super Admin é o dono (`nexusai360`).
5. **Publicar aviso** como destino próprio (fora de Usuários).
6. Reformar o **cadastro de célula**: endereço + **CEP com máscara e autofill**, checkbox "sem número", placeholders/máscaras, "data e horário do 1º encontro"; **corrigir o bug de criação**.
7. Reformar **Perfil/Cadastro**: estado civil por **checkbox "casado(a)"** revelando o cônjuge; layout sem cara de formulário; máscara de WhatsApp.
8. **Seleção de célula** por componente bonito (modal + tela) com cards ricos (foto de líderes, dia, horário, frequência, bairro).
9. **Endurecer o QR**: validar `diaSemana` explicitamente.
10. Testes (jest/vitest) verdes; typecheck/lint limpos; E2E manual dos fluxos críticos.

### Não-objetivos (YAGNI)
- Não implementar paginação real de usuários (mantém `take:50` + busca).
- Não construir um select de 5.570 cidades do IBGE (o autofill de CEP resolve; campos ficam editáveis).
- Não redesenhar Pedidos/Testemunhos/Calendário além do reaproveitamento dos novos primitivos.
- Não trocar a stack (segue React+Vite+Tailwind v4, sem base-ui/shadcn).
- Não mexer na integração Google além do necessário.

---

## 4. Arquitetura da solução

### 4.1 Hierarquia de papéis e permissões (fonte da verdade)

| Papel | Rótulo | Cor/ícone (chip) | Pode |
|---|---|---|---|
| `MEMBRO` | Membro | zinc / `Eye` | participar de uma célula |
| `LIDER` | Líder | amber / `Shield` | gerenciar a própria célula, aprovar/recusar pendentes **da própria célula** |
| `ADMIN` | Administrador | blue / `ShieldCheck` | tudo na plataforma **exceto** mexer em conta `SUPER_ADMIN` ou conceder `SUPER_ADMIN` |
| `SUPER_ADMIN` | Super Admin | purple / `Crown` | tudo, incluindo conceder/revogar `SUPER_ADMIN`; é o **dono** |

**Status da conta (chip separado do papel):**
| Status | Rótulo | Cor/ícone |
|---|---|---|
| pendente (`aprovado=false`) | Em aprovação | amber / `Clock` |
| ativo (`aprovado=true, ativo=true`) | Ativo | emerald / `UserCheck` |
| inativo (`ativo=false`) | Inativo | red / `UserX` |

**Regra `podeEditarPapel(editorPapel, papelAtual, papelNovo)` (novo comportamento):**
- Se `papelAtual === SUPER_ADMIN` **ou** `papelNovo === SUPER_ADMIN` → **exige `editorPapel === SUPER_ADMIN`**.
- Caso contrário (transições entre `MEMBRO/LIDER/ADMIN`) → **exige `temNivel(editorPapel, 'ADMIN')`**.
- Editor nunca altera o próprio papel (guard já existe na rota).
- **Admin não pode desativar/editar uma conta `SUPER_ADMIN`** (adicionar guard em `PUT /usuarios/:id` e no toggle ativo): se `alvo.papel === SUPER_ADMIN` e `editor !== SUPER_ADMIN` → 403.

> Escolha do teto (decisão autônoma, alinhada ao áudio): **Admin mexe em tudo, menos Super Admin.** Admin concede/revoga MEMBRO/LIDER/ADMIN, aprova e desativa membros/líderes/outros admins; não toca em Super Admin nem o concede.

**Super Admin dono:** garantir `nexusai360@gmail.com` como `SUPER_ADMIN` via script idempotente `apps/api/prisma/garantir-super-admin.js` (promove o e-mail de `SUPER_ADMIN_EMAIL` do env, default `nexusai360@gmail.com`, se o usuário existir). Documentar no DEPLOY/README. Não hardcode de e-mail no runtime — apenas no script/seed.

### 4.2 Navegação e shells

Introduzir **dois contextos** de navegação e um **switcher** visível só para ADMIN+:

```
┌─ TopBar (logo · [switcher: Minha célula | Administração] · avatar) ─┐
│                                                                     │
│  Contexto = "Minha célula" (todos):                                 │
│    Início · Calendário · Pedidos · (Líder: Minha Célula)            │
│                                                                     │
│  Contexto = "Administração" (ADMIN+):                               │
│    Sub-nav (abas/rotas): Usuários · Células · Avisos                │
└─────────────────────────────────────────────────────────────────────┘
```

- **Route-group** `/app/admin/*` com layout próprio (`AdminLayout`) e sub-nav em abas por rota:
  - `/app/admin/usuarios` (abas internas: Pendentes · Todos)
  - `/app/admin/celulas`
  - `/app/admin/avisos`
- Rotas de membro seguem em `/app/*` (Início/Calendário/Pedidos/Perfil) e a área de líder em `/app/celula/:id`.
- **Switcher** (`ContextSwitcher`, estilo SegmentedControl): alterna entre `/app` (membro) e `/app/admin` (admin). Persistir a última escolha em `localStorage`. Admin **não perde mais** a área de membro.
- **Redirecionos:** `SoAdmin` passa a proteger `/app/admin/*` (rank ≥ ADMIN). Manter `AppComGate` para pendentes. `InicioOuCelulas`: admin cai por padrão em `/app/admin/usuarios`? Não — cai em `/app` (membro) e escolhe Administração pelo switcher, **exceto** admin sem célula, que cai em `/app/admin/usuarios`.
- **Avisos** deixam de aparecer dentro de Usuários (remover o bloco do topo de `Usuarios.jsx`); passam a `/app/admin/avisos` (reusa `apiBannerAdmin/apiSalvarBanner`).
- **Líder** (não admin): vê no contexto de membro um item **"Aprovações"** (pendentes da própria célula) — mantém o backend atual; não ganha o switcher de Administração.

### 4.3 Novos primitivos de UI (`components/ui/`)

Todos no padrão do projeto (função + template strings Tailwind + tokens do `index.css`), acessíveis, com `framer-motion` e `prefers-reduced-motion`:

1. **`Tabs.jsx`** — `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (controlado por `value/onValueChange`). Variantes `pill` (default) e `line` (underline animado). Teclado (setas/Home/End), `role="tablist"`.
2. **`Checkbox.jsx`** — checkbox acessível com label, estados, foco visível. Base para "sem número", "casado(a)", "exibir aviso para todos".
3. **`Modal.jsx`** — dialog genérico de conteúdo livre (extrai o boilerplate duplicado de `MembroEditModal`): overlay `bg-black/60 backdrop-blur-sm`, painel `rounded-2xl`, focus-trap, Esc, scroll-lock, `framer-motion`. Props: `open, onClose, titulo, children, footer, size`.
4. **`Combobox.jsx`** — select com **busca** (input + listbox filtrado), itens com `label/description/avatar`. Substitui as buscas ad-hoc (DefinirLider, busca de usuários) e vira base do seletor de líder.
5. **`RoleSelect.jsx`** (BadgeSelect) — o **chip colorido é o trigger**; abre lista de papéis (ícone+label+descrição+check). Usa o mapa de cores de papel. Desabilita opções que o editor não pode conceder (ex.: admin não vê `SUPER_ADMIN`). Somente-leitura vira `RoleBadge` estático.
6. **`RoleBadge.jsx` / `StatusBadge.jsx`** — chips estáticos (papel/status) usando o mapa de cores.
7. **`ContextSwitcher.jsx`** — SegmentedControl "Minha célula | Administração".
8. **`MaskedInput` / helpers de máscara** — `lib/mascaras.js` com `mascaraCep`, `mascaraTelefone`, e um `useMascara` simples; aplicar em CEP e WhatsApp (o WhatsApp hoje é texto livre).
9. **`CelulaPicker.jsx`** — cartões ricos de célula (avatares de líderes empilhados, dia, horário, frequência, bairro), selecionável; usável dentro do `Modal` **e** na tela `SelecionarCelula`.

**Tokens/estilo:** adicionar no `index.css` utilidades/keyframes leves se necessário (ex.: `animate-in`-like via classes utilitárias já suportadas pelo framer-motion; chips usam classes Tailwind puras). Estender `lib/papeis.js` com `CORES_PAPEL` (mapa classe+ícone), `ehLider`, `ehGestor`.

### 4.4 Fluxos de usuário

**A. Cadastro sem QR (site):**
`/cadastro` (nome, email, senha) → auto-login pendente → **`/app/selecionar-celula`** (obrigatório) → escolhe célula em `CelulaPicker` (cards com líderes) → `apiSelecionarCelula` → **`/app/aguardando`** (status "Em aprovação", com botão "Atualizar status"/polling leve). Aprovação vem de **admin** (qualquer pendente) ou do **líder** da célula escolhida.

**B. Cadastro via QR (na célula):**
`/c/:qrToken` → criar conta com `?celula=` → backend cria **aprovado + vinculado** → checkin de presença (se dentro do dia/horário) → `/app`. Sem etapa de aprovação.

**C. Admin gerenciando usuários:**
Switcher → Administração → Usuários → aba **Pendentes** (aprovar/recusar, com chip "Em aprovação") ou aba **Todos** (busca via Combobox, chip de status, `RoleSelect` para trocar papel respeitando o teto, botão Ativar/Desativar). Legenda dos 4 níveis no topo, em cards com chip + descrição.

**D. Líder aprovando:**
Contexto Minha célula → "Aprovações" → lista de pendentes **da própria célula** (backend já escopa) → aprovar/recusar.

**E. Perfil:**
Layout reformulado; **checkbox "Sou casado(a)"** → revela `ConjugeSecao`; WhatsApp com máscara; data de nascimento; chip de papel.

**F. Cadastro de célula (admin):**
Form reformulado com seções e placeholders; **CEP** (máscara `00000-000`) com **autofill ViaCEP** (preenche cidade/bairro/rua, tudo editável); **checkbox "sem número"** (desabilita/So marca `numero='S/N'`); "**Data e horário do primeiro encontro**"; correção do bug de criação (ver §6).

### 4.5 Backend — mudanças

1. `lib/roles.js`: novo `podeEditarPapel` (admin concede admin; super admin exclusivo p/ super admin) + testes.
2. `routes/usuarios.js`: guard "admin não mexe em Super Admin" no `PATCH /papel` (já coberto pela regra) e no `PUT /:id` / toggle ativo (novo guard) + testes.
3. `prisma/schema.prisma`: **`cep String?`** em `Celula` (migration). `celulaSchema` aceita `cep?` (regex `\d{5}-?\d{3}` opcional).
4. `routes/presenca.js` / `lib/encontros.service.js`: validar `diaSemana` explicitamente no checkin (defensivo; mensagem "Hoje não é o dia da sua célula") + testes.
5. `prisma/garantir-super-admin.js`: script idempotente + npm script `admin:super`.
6. (Opcional, se necessário para a tela) expor `celulaNome`/`liderNome` já vem via `comCelula()`.

> **Migração de dados de estado civil:** não é necessária. A UI passa a enviar apenas `CASADO`/`SOLTEIRO`; valores legados (`UNIAO_ESTAVEL/DIVORCIADO/VIUVO`) são interpretados como "casado(a)" = qualquer coisa em `{CASADO, UNIAO_ESTAVEL}` marca o checkbox; o resto desmarca. Enum permanece intacto (sem migration).

---

## 5. Detalhamento das telas (o "incrível")

Princípios visuais aplicados a todas: header com **ícone-em-caixinha** + título `text-2xl font-bold` + subtítulo muted; conteúdo em **cards `ring-1`/`rounded-xl`**; espaçamento `space-y-6`; **chips coloridos**; **abas pill**; entrada com `framer-motion` (fade+y, 200–300ms, reduced-motion); largura de leitura confortável (`max-w-3xl`/`max-w-5xl` para listas densas).

### 5.1 Administração › Usuários
- Header + legenda dos 4 níveis (grid 2 col, cada item = `RoleBadge` + descrição curta; Super Admin destacado como "dono").
- **Tabs**: `Pendentes (n)` · `Todos`.
- **Pendentes**: cards com Avatar, nome, email, **célula pretendida**, `StatusBadge "Em aprovação"`, data, botões **Recusar** (ghost/perigo) e **Aprovar** (brand).
- **Todos**: busca (`Combobox`/Input com ícone), cards com Avatar, nome (+"(você)"), email, `StatusBadge`, **`RoleSelect`** (chip clicável colorido — respeita teto), botão **Ativar/Desativar** (bloqueado para si e para Super Admin quando editor não é super).

### 5.2 Administração › Células
- Header + botão **Nova célula** (abre em `Modal` ou seção expansível reformulada).
- Form em seções: **Identificação** (Nome placeholder "Ex.: Célula Esperança", Descrição placeholder "Ex.: Jovens do bairro, foco em discipulado"), **Encontro** (Dia da semana, Frequência, **"Data e horário do primeiro encontro"**), **Endereço** (CEP máscara+autofill, Cidade, Bairro, Rua/Endereço, Número + **checkbox "Sem número"**, Complemento, Ponto de referência).
- Lista de células: cards com nome, dia/frequência, contagem, chip de líder, ações (definir líder via `Combobox`, excluir).

### 5.3 Administração › Avisos
- Header + `Modal`/card único: textarea do aviso (placeholder "Ex.: Neste sábado teremos culto especial às 19h."), `Checkbox` "Exibir para todos", botão Salvar; preview do banner.

### 5.4 Perfil
- Card central reformulado (menos "formulário"): avatar no topo, campos com placeholders/máscara, **checkbox "Sou casado(a)"** → `ConjugeSecao` revelada com animação; chip de papel; salvar; sair separado.

### 5.5 Onboarding (SelecionarCelula / Aguardando / Modal)
- `CelulaPicker` com cards ricos: **avatares empilhados dos líderes**, nome da célula, `Dia · Horário · Frequência`, **bairro** (sem endereço completo). Selecionável, com estado "selecionado" (anel brand).
- `Aguardando`: card com `StatusBadge "Em aprovação"`, nome da célula, explicação, **botão "Atualizar status"** (re-fetch `apiMe`) e CTA "Completar perfil".

---

## 6. O bug de criação de célula (investigação dirigida)

Hipóteses a validar por **systematic-debugging** (reproduzir antes de corrigir):
1. `dataPrimeiroEncontro` vazio → `new Date('').toISOString()` lança no cliente (form quebra) — validar required do `DateTimePicker` e proteger o submit.
2. Payload com `frequenciaDias` fora de `{7,14,28}` → 400 do backend.
3. `liderId` ausente/estado — não deve quebrar (opcional).
4. Erro silencioso engolido pelo catch genérico ("Erro ao criar célula.").

Ação: reproduzir, identificar a causa real, corrigir com teste de regressão (unit no backend se for validação; e proteção no front). Não declarar corrigido sem reproduzir o verde.

---

## 7. Faseamento (unidades de entrega, commits atômicos, TDD)

- **Fase 0 — Fundação de UI:** primitivos (`Tabs, Checkbox, Modal, Combobox, RoleBadge, StatusBadge, RoleSelect, ContextSwitcher`), `lib/mascaras.js`, extensão de `lib/papeis.js` (cores/ícones, `ehLider/ehGestor`). Testes de unidade dos primitivos com lógica (máscara, roles).
- **Fase 1 — RBAC/hierarquia (backend+front):** `podeEditarPapel` novo + guards Super Admin + testes; `garantir-super-admin.js`; legenda/labels; `StatusBadge` "Em aprovação" no lugar certo.
- **Fase 2 — Shell de navegação:** `AdminLayout` + route-group `/app/admin/*`, `ContextSwitcher`, `SoAdmin`, reforma `TopBar/linksPorPapel`, mover Avisos.
- **Fase 3 — Administração › Usuários:** abas Pendentes/Todos, chips, `RoleSelect`, busca via `Combobox`, legenda.
- **Fase 4 — Administração › Células:** `cep` (migration) + schema; form reformulado (CEP autofill/máscara, sem número, placeholders, "data e horário"); **fix do bug**; definir líder via `Combobox`.
- **Fase 5 — Perfil/Cadastro:** estado civil checkbox + cônjuge, layout, máscara WhatsApp.
- **Fase 6 — Onboarding & seleção de célula:** `CelulaPicker` (modal+tela), fluxo cadastro→seleção→aprovação, `Aguardando` com refresh.
- **Fase 7 — QR & presença:** validação `diaSemana` + testes; mensagens.
- **Fase 8 — Polimento & verificação:** revisão `ui-ux-pro-max`, responsividade, animações, E2E manual, `tsc`/lint/jest verdes, PR.

Cada fase: TDD onde há lógica, commit atômico, `npm test` verde antes de seguir. UI feita **inline na sessão** (nunca delegada), backend independente pode paralelizar em workflow Opus.

---

## 8. Critérios de aceite (verificáveis)

1. Admin (não super) consegue **ver e gerenciar** todos os usuários; consegue promover um membro a **Líder** e a **Admin**; **não** vê a opção Super Admin; **não** consegue desativar/rebaixar um Super Admin.
2. Super Admin (`nexusai360@gmail.com`) consegue conceder **Super Admin**.
3. A tela de Usuários tem **abas** Pendentes/Todos; pendentes aparecem com status **"Em aprovação"**; papéis aparecem como **chips coloridos**; troca de papel é via chip clicável.
4. Existe **switcher** Minha célula ↔ Administração; admin **mantém** acesso à área de membro.
5. **Avisos** têm destino próprio (não estão em Usuários).
6. Cadastro de célula tem **CEP com máscara** (autofill quando possível), **checkbox "sem número"**, **placeholders** em todos os campos, rótulo **"Data e horário do primeiro encontro"**, e **cria célula sem bug** (reproduzido→corrigido→teste).
7. Perfil tem **checkbox "casado(a)"** que revela o cônjuge; não há mais "divorciado/viúvo/união estável" na UI; WhatsApp com máscara.
8. Cadastro sem QR leva à **seleção de célula** com cards de **líderes (foto), dia, horário, frequência, bairro**, e depois para **aprovação**.
9. QR valida **dia da semana** (além de horário) antes de lançar presença.
10. `npm test` (api + web) **verde**; typecheck/lint sem erros novos; fluxos críticos validados manualmente (E2E) contra o backend real.
11. Visual coerente e sofisticado (padrão Insights adaptado à marca prata), responsivo, com micro-interações e dark mode.

---

## 9. Riscos e mitigação
- **ViaCEP indisponível/offline:** autofill é *best-effort*; campos permanecem editáveis; máscara e submit não dependem da API.
- **Regressão de permissão:** cobrir `podeEditarPapel` e guards com testes de unidade antes de tocar o front.
- **Quebra de rota por route-group:** manter redirecionos e `AppComGate`; testar navegação de cada papel.
- **Escopo grande:** faseamento com commits atômicos e testes por fase; reviews adversariais na spec e no plano.
- **Estado civil legado:** interpretado sem migration (sem perda de dados).

---

## 10. Terminologia
- **Contexto**: modo de navegação (Minha célula / Administração).
- **Papel** (`Papel`): nível de acesso (Membro/Líder/Admin/Super Admin).
- **Status da conta**: Em aprovação / Ativo / Inativo.
- **Célula pretendida**: célula escolhida por um pendente ainda não aprovado.
