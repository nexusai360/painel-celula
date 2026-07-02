# Reforma completa de UI/UX, RBAC e fluxos — Painel de Célula

**Data:** 2026-07-02
**Trabalho:** direto na `main` (política do projeto; ver `CLAUDE.md`)
**Autor:** sessão autônoma (Claude Opus)
**Status:** **spec v2** (v1 → Review 1 profunda → **v2** → Review 2 → v3 final)

---

## 0. Histórico de revisões

**v1 → v2 (incorpora a Review 1 — dupla lente fidelidade + técnica — e o dado real do banco):**
1. **QR/`diaSemana` (era regressão):** removida a ideia de validar `diaSemana` no check-in (rejeitaria check-ins válidos; o `Encontro` de hoje já é o gate). Em vez disso, validar **coerência `diaSemana` × `weekday(dataPrimeiroEncontro)` no cadastro da célula**. Especificado o ramo QR "usuário já com conta".
2. **Estado civil (era perda de dados):** o map-back agora só grava `estadoCivil` em **transição real** do checkbox e **preserva legado**; `ConjugeSecao` não desvincula cônjuge por desmarcar acidental. (Banco real hoje: `estadoCivil` todos `null` — sem legado, mas a lógica correta fica.)
3. **Bug de criação de célula:** adicionada a hipótese principal — `diaSemana`/`frequenciaDias` chegando como **string** (`z.number()` não coage) → 400; e `materializarEncontros` fora da transação pode duplicar célula / `celula===undefined` após o loop.
4. **`ContextSwitcher`:** disponibilidade derivada do **papel atual** (não do `localStorage`); storage chaveado por `usuario.id` e ignorado quando o papel não permite; destino default do admin centralizado em `InicioOuCelulas` (fonte única).
5. **"Admin não vê usuários":** tratado como **diagnóstico real** (systematic-debugging), não só reforma. Dado real: super admin OK (aprovado+ativo); admin de teste **inativo** — causa plausível. Guard **`SUPER_ADMIN` no `PUT /usuarios/:id` e no toggle `ativo`** (hoje ausente). Decisão nova: **rebaixar/desativar um ADMIN exige SUPER_ADMIN** (protege os admins do dono do vetor admin-vs-admin).
6. **Foto dos líderes:** confirmado no banco que **ninguém tem avatar**; `CelulaPicker` usa `Avatar` (foto quando houver, **fallback iniciais**), e o líder ganha upload de foto no perfil. Documentado como decisão.
7. **Cidade:** deixa de ser input cru — vira **Combobox de cidades** (lista curada de municípios comuns + digitável livre), reaproveitando o `Combobox`.
8. **Signup (/cadastro):** entregável visual **explícito** para a página de cadastro público (não fica implícito na "Fase Perfil").
9. **Deploy contínuo:** cada fase deixa a `main` **deployável**; `prisma migrate deploy` antes do boot; `cep` é aditivo/nullable; shell+telas fundidos quando necessário para não deixar rota órfã em produção.
10. **Reconciliação com Fases 6b/7 (já na `main`):** a separação de áreas **já começou** (grupos "Administração"/"Minha célula" no `TopBar` — `fc0d618`); a v2 **constrói por cima** (eleva a `ContextSwitcher` + abas + telas reformadas) e **preserva** o `NotificacoesSino` (sino, Fase 6b).
11. **Notas menores:** base de overlay unificada (`Modal` reusa o hook de lock/trap do `Sheet` — evita double scroll-lock); contraste WCAG dos chips verificado por cor; ViaCEP com `AbortController` + timeout + debounce; "Recusar" pendente é destrutivo (deixar claro na UI).
12. **Super admin:** `nexusai360@gmail.com` **já provisionado** (confirmado no banco) → script vira **idempotente/confirmação**, não criação.

---

## 1. Contexto e motivação

A entrega anterior deixou a plataforma funcional no backend, mas a UI/UX ficou grosseira e desorganizada, e faltaram fluxos que o dono pediu. Feedback direto (3 mensagens de áudio), consolidado:

- Telas "com cara de Google Forms", minhocão vertical, sem sutileza, sem aproveitamento de tela.
- **Usuários** bagunçada: legenda ruim, aprovações misturadas com todos os usuários, sem abas.
- Falta o **status "em aprovação"** antes de virar membro.
- Seleção de papel feia → quer **tags coloridas** (mesmo dentro do select).
- **Admin** concede papéis (Líder e Admin), aprova e desativa — "faz praticamente tudo", mas **abaixo do Super Admin**.
- **Super Admin** é o dono (`nexusai360@gmail.com`), único que concede `SUPER_ADMIN`.
- **Separação clara** Administração × minha célula (modo líder/membro) — hoje o admin nem enxerga bem a área de membro.
- Admin **não consegue ver/gerenciar** usuários direito; listar os níveis existentes.
- **Líderes** também aprovam pessoas que dizem pertencer à célula deles.
- **Cadastro** deve perguntar a célula via **tela/modal bonito** (cards com **foto dos líderes**, dia, horário, frequência, **bairro**).
- **Estado civil** constrangedor → **checkbox "casado(a)"** que revela o cônjuge.
- **Cadastro de célula**: placeholders/máscaras, "**data e horário** do primeiro encontro", **endereço** (cidade/bairro/rua), **CEP com máscara**, **checkbox "sem número"**, e há um **bug ao criar célula**.
- **Publicar aviso** deve sair de Usuários.
- Referência visual: **Nexus Insights / Nexus Odoo** (sofisticação, modernidade).

Execução **autônoma até o fim**, seguindo a metodologia (spec v1→R1→v2→R2→v3 → plano v1→R1→v2→R2→v3 → TDD → testes → PR), sem perguntas. Trabalho **direto na `main`** (sem worktree — política do projeto).

---

## 2. Estado atual (código + dado real confrontado)

### Backend (`apps/api`)
- **Papéis**: `MEMBRO, LIDER, ADMIN, SUPER_ADMIN` (rank 1–4). **EstadoCivil**: `SOLTEIRO, CASADO, DIVORCIADO, VIUVO, UNIAO_ESTAVEL`.
- `GET /usuarios` (ADMIN) **já lista todos** (take:50, busca). `GET /usuarios/pendentes` (LIDER) — admin vê todos; **líder vê só os da própria célula**. `POST /usuarios/:id/aprovar|recusar` — líder já aprova/recusa pendentes da própria célula. `PATCH /usuarios/:id/papel` (ADMIN) usa `podeEditarPapel`. `PUT /usuarios/:id` (ADMIN) edita nome/email/whatsapp/ativo — **não checa `alvo.papel`** (um admin poderia editar o super admin, exceto a trava de líder ativo).
- **`podeEditarPapel`** (`lib/roles.js`): conceder/revogar `ADMIN`/`SUPER_ADMIN` é **exclusivo do SUPER_ADMIN** hoje. ← muda.
- **Célula**: endereço `cidade, bairro, endereco, numero, complemento, pontoReferencia`. **Sem `cep`.** `POST /celulas` valida `diaSemana z.number().int()` (0–6), `frequenciaDias z.number()` ∈ {7,14,28}, `dataPrimeiroEncontro z.coerce.date()`. **`z.number()` não coage string.** `materializarEncontros` roda **fora** da transação. **Nada garante `diaSemana` coerente com a data.**
- **QR/presença**: `POST /qr/:qrToken/checkin` valida célula do usuário + existência de `Encontro` **de hoje** (janela local 00:00–23:59) + horário de início (`podeMarcarPresenca`, rejeita `agora < data`). **Não valida `diaSemana`** (nem precisa — a existência do encontro já é o gate). Exige conta aprovada.
- **Registro**: `registerSchema` = `nome,email,senha,qrToken?`. Com QR → `aprovado=true` + `celulaId`. Sem QR → `aprovado=false`, sem célula. **Login não bloqueia pendente** (entra travado; `AppComGate` roteia).
- **Notificações (Fase 6b, já na main):** modelo `Notificacao`, rota `notificacoes.js`, sino no front — **preservar/integrar**.

### Dado real (SELECT no banco `icelula`)
- **SUPER_ADMIN** `nexusai360@gmail.com`: `aprovado=t`, `ativo=t`, **sem avatar**. **ADMIN** de teste: `aprovado=t`, **`ativo=f` (inativo)**, sem avatar.
- **Nenhum** usuário tem avatar; **nenhum líder** definido nas células.
- `estadoCivil` de todos = **null** (sem legado a migrar).
- Célula "Célula Centro": `diaSemana=3`, `weekday(dataPrimeiroEncontro)=3` (**coerente**), Goiânia/Centro.

### Frontend (`apps/web/src`)
- **Navegação** (`linksPorPapel`, `TopBar.jsx` — pós-Fase 7): `aprovado===false` → `[]` (**antes** de checar admin). `ehAdmin` → grupo "Administração" (Células, Usuários) **+**, se tiver célula, grupo "Minha célula" (Início/Calendário/Pedidos) com divisor. Membro → Início/Calendário/Pedidos; LIDER soma Minha Célula/Aprovações/Testemunhos/Vidas. **Sino de notificações** presente.
- **`App.jsx`**: `InicioOuCelulas` (admin sem célula → `/app/celulas`), `SoLider`, `SoAdmin` (existe, subutilizado), `SoGestor`, `AppComGate` (trava pendente). Rotas **planas** (`/app/usuarios`, `/app/celulas`), sem route-group `/app/admin/*`.
- **Onboarding** já existe: cadastro sem QR → pendente sem célula → `SelecionarCelula` (tela cheia, cards com avatares de líderes) → `Aguardando` (estática).
- **Primitivos**: `Button, Input, Select (sem busca), Tag/StatusTag, Card, ConfirmDialog, Sheet (bottom-sheet robusto: lock/trap/Esc/drag), DateTimePicker, Avatar, Spinner, Logo, ThemeToggle`. **Faltam**: `Tabs, Checkbox, Modal genérico, Combobox, máscara, RoleSelect, ContextSwitcher`.
- Stack: React 19 + Vite + Tailwind v4 (sem shadcn/base-ui), `framer-motion`, `react-hook-form`, `zod`, `lucide`. **Local: http://localhost:3200** (`npm run app:up`).

### Referência visual (Nexus Insights / Odoo)
- Insights e Odoo são **gêmeos de design** (mesmos tokens/primitivos; Odoo acrescenta só componentes de nicho). Extrair as **fórmulas** e a **paleta semântica**, mantendo a **marca prata/grafite** do Painel.
- Chips: `bg-{cor}-500/10 border-{cor}-500/30 text-{cor}-600 dark:text-{cor}-400` + ícone Lucide.
- `BadgeSelect`: o **chip é o trigger** do select; opções com ícone+label+descrição+check.
- Tabs pill (`bg-muted`; ativo `bg-background shadow-sm`). Ícone-em-caixinha `h-10 w-10 rounded-xl bg-brand/10`. Card `ring-1`/`rounded-xl`. Overlays `bg-black/60 backdrop-blur-sm`. `framer-motion` com `prefers-reduced-motion`.

---

## 3. Objetivos e não-objetivos

### Objetivos
1. Linguagem visual nível "Insights": sofisticada, respirada, abas, chips coloridos, cards com anel, micro-interações — **na marca prata**.
2. Separar **Administração** × **Minha célula/Membro** com **`ContextSwitcher`** (ADMIN+), construindo sobre os grupos já criados na Fase 7.
3. Reformar **Usuários** (abas Pendentes/Todos, chips status+papel, `RoleSelect`, legenda dos níveis).
4. Corrigir **hierarquia**: Admin concede até Admin; Super Admin é o dono; **rebaixar/desativar admin exige Super Admin**.
5. **Avisos** como destino próprio.
6. Reformar **cadastro de célula**: endereço + **CEP máscara/autofill** (com timeout/abort), **cidade via Combobox**, checkbox "sem número", placeholders, "data e horário do 1º encontro"; **corrigir o bug** (string→number etc.); **validar coerência `diaSemana`×data**.
7. Reformar **Perfil** e **/cadastro**: estado civil por **checkbox** (map-back seguro); layout sem cara de formulário; máscara de WhatsApp; signup público reformulado.
8. **Seleção de célula** por componente bonito (modal + tela): cards com `Avatar` de líderes (fallback iniciais), dia, horário, frequência, bairro.
9. **QR**: especificar ramo "com conta"; **não** validar `diaSemana` no check-in.
10. Testes verdes (jest/vitest api+web), typecheck/lint limpos, E2E manual dos fluxos; cada merge na `main` **deployável**.

### Não-objetivos (YAGNI)
- Paginação real de usuários (mantém `take:50` + busca).
- Base IBGE completa (5.570 cidades): Combobox usa lista **curada** + digitável.
- Redesenho de Pedidos/Testemunhos/Calendário além do reuso dos novos primitivos.
- Trocar stack; mexer no Google além do necessário.

---

## 4. Arquitetura da solução

### 4.1 Papéis, status e permissões (fonte da verdade)

| Papel | Rótulo | Chip (cor/ícone) | Pode |
|---|---|---|---|
| `MEMBRO` | Membro | zinc / `Eye` | participar de uma célula |
| `LIDER` | Líder | amber / `Shield` | gerenciar a própria célula; aprovar/recusar pendentes **da própria célula** |
| `ADMIN` | Administrador | blue / `ShieldCheck` | tudo, **exceto** conceder `SUPER_ADMIN`, ou **rebaixar/desativar/editar** conta `SUPER_ADMIN` **ou outro `ADMIN`** |
| `SUPER_ADMIN` | Super Admin | purple / `Crown` | tudo, incluindo conceder/revogar `SUPER_ADMIN` e gerenciar admins; é o **dono** |

**Status da conta (chip separado):** Em aprovação (`aprovado=false`) — amber/`Clock`; Ativo — emerald/`UserCheck`; Inativo (`ativo=false`) — red/`UserX`.

**`podeEditarPapel(editorPapel, papelAtual, papelNovo)` — novo:**
- `papelAtual===SUPER_ADMIN` **ou** `papelNovo===SUPER_ADMIN` → exige `editor===SUPER_ADMIN`.
- **Rebaixar um ADMIN** (`papelAtual===ADMIN` e `papelNovo` rank menor) → exige `editor===SUPER_ADMIN`.
- **Promover para ADMIN** (`papelNovo===ADMIN`, `papelAtual∈{MEMBRO,LIDER}`) → exige `temNivel(editor,'ADMIN')` (admin pode nomear admin).
- Transições `MEMBRO↔LIDER` → exige `temNivel(editor,'ADMIN')`.
- Auto-alteração bloqueada (guard de rota já existe).

**Guards adicionais (novos):** em `PUT /usuarios/:id` e no toggle `ativo`: se `alvo.papel===SUPER_ADMIN` **ou** (`alvo.papel===ADMIN` e `editor!==SUPER_ADMIN`) → **403**. Impede admin de editar/desativar o dono ou um par admin.

**Super Admin dono:** `nexusai360@gmail.com` já é `SUPER_ADMIN` (confirmado). Script **idempotente** `prisma/garantir-super-admin.js` (promove `SUPER_ADMIN_EMAIL` do env, default `nexusai360@gmail.com`, se existir e ainda não for) — confirmação/segurança, sem hardcode em runtime. Documentar em DEPLOY/README.

> Decisão do teto (autônoma, alinhada a "admin faz tudo, mas abaixo do super"): **admin nomeia até ADMIN e gerencia membros/líderes; mas mexer em ADMIN/SUPER_ADMIN (rebaixar, desativar, editar) é exclusivo do Super Admin.** Protege os admins nomeados pelo dono de guerra admin-vs-admin.

### 4.2 Navegação e shells (construindo sobre a Fase 7)

Elevar os "grupos" já criados no `TopBar` para uma separação de **contexto** de primeira classe:

```
TopBar: logo · [ContextSwitcher: Minha célula | Administração]* · Sino · Avatar
  * só renderiza para ADMIN+ (derivado do papel ATUAL)

Contexto "Minha célula" (todos os aprovados com célula):
  Início · Calendário · Pedidos · (Líder: Minha Célula · Aprovações · Testemunhos · Vidas)

Contexto "Administração" (ADMIN+):
  sub-nav em abas (rotas): Usuários · Células · Avisos
```

- **Route-group** `/app/admin/*` (layout `AdminLayout` com a sub-nav em abas por rota): `/app/admin/usuarios` (abas internas Pendentes · Todos), `/app/admin/celulas`, `/app/admin/avisos`. `SoAdmin` protege o grupo.
- Manter compat: `/app/usuarios` e `/app/celulas` **redirecionam** para os novos caminhos admin (evita links quebrados/externos). A rota "Aprovações" do líder continua em `/app/usuarios` (ou passa a `/app/aprovacoes`) — decidir no plano, sem quebrar `AppComGate`.
- **`ContextSwitcher`**: alterna `/app` (membro) ↔ `/app/admin` (admin). **Disponibilidade derivada do `usuario.papel` atual**; preferência salva em `localStorage` **chaveada por `usuario.id`** e **ignorada** se o papel não permite; limpar no logout.
- **Destino default** do admin centralizado em `InicioOuCelulas` (fonte única; remove divergência com a spec): admin **sem célula** → `/app/admin/usuarios`; admin **com célula** → `/app` (membro) e usa o switcher.
- **Avisos** saem de Usuários → `/app/admin/avisos` (reusa `apiBannerAdmin/apiSalvarBanner`).
- **Deployabilidade:** o shell (`AdminLayout`/switcher) e as telas reformadas entram **no mesmo incremento** por área, para nenhum merge deixar link do switcher apontando para rota inexistente.

### 4.3 Novos primitivos (`components/ui/`)

Padrão do projeto (função + Tailwind + tokens), acessíveis, `framer-motion` + `prefers-reduced-motion`:

1. **`Tabs`** (`Tabs/List/Trigger/Content`, `value/onValueChange`; variantes `pill`/`line`; teclado; `role="tablist"`).
2. **`Checkbox`** (acessível, label, foco visível).
3. **`Modal`** genérico — **reusa o hook de lock/trap/Esc do `Sheet`** (base de overlay unificada; sem double scroll-lock). Props `open,onClose,titulo,children,footer,size`.
4. **`Combobox`** (busca + listbox filtrado; itens `label/description/avatar`). Base para busca de usuário/líder e **cidades**.
5. **`RoleSelect`** (BadgeSelect: chip colorido é o trigger; opções papel com ícone+desc+check; **oculta/desabilita** papéis que o editor não pode conceder). Read-only vira `RoleBadge`.
6. **`RoleBadge` / `StatusBadge`** (chips estáticos; **contraste WCAG verificado por cor**).
7. **`ContextSwitcher`** (SegmentedControl).
8. **Máscaras** (`lib/mascaras.js`: `mascaraCep`, `mascaraTelefone`; aplicar em CEP e WhatsApp).
9. **`CelulaPicker`** (cards ricos: `Avatar` de líderes empilhados **com fallback iniciais**, dia, horário, frequência, bairro; selecionável; usável em `Modal` e na tela).
10. **`lib/papeis.js`** estendido: `CORES_PAPEL` (classe+ícone), `ehLider`, `ehGestor`. **`lib/cidades.js`**: lista curada de municípios comuns (BR) para o Combobox, com opção digitável.

### 4.4 Fluxos

**A. Cadastro sem QR:** `/cadastro` (nome,email,senha — **tela reformulada**) → auto-login pendente → `/app/selecionar-celula` (obrigatório) → `CelulaPicker` → `apiSelecionarCelula` → `/app/aguardando` (status "Em aprovação" + "Atualizar status"). Aprova admin (qualquer) ou líder da célula.

**B. Cadastro/entrada via QR:** `/c/:qrToken`:
- **Sem conta** → cria com `?celula=` → backend cria **aprovado + vinculado** → `apiCheckinQr` (lança presença se há `Encontro` hoje e passou o horário) → `/app` com confirmação "Presença registrada".
- **Com conta (logado ou faz login)** → lê o QR → `apiCheckinQr` (mesma validação) → confirmação "Presença registrada" (ou "Fora do horário/Não há reunião hoje"). **Sem etapa de aprovação.** (Ramo antes ausente — agora especificado.)

**C. Admin › Usuários:** Switcher → Administração → Usuários → aba **Pendentes** (aprovar/recusar; "Recusar" avisa que é **irreversível**) / aba **Todos** (busca via Combobox, `StatusBadge`, `RoleSelect` respeitando o teto, Ativar/Desativar bloqueado p/ si, p/ Super Admin e p/ outro Admin quando editor≠super). Legenda dos 4 níveis no topo.

**D. Líder › Aprovações:** contexto Minha célula → pendentes **da própria célula** (backend já escopa).

**E. Perfil / F. Cadastro célula:** ver §5.

### 4.5 Backend — mudanças
1. `lib/roles.js`: novo `podeEditarPapel` (admin nomeia admin; super exclusivo p/ super **e** p/ rebaixar admin) + testes.
2. `routes/usuarios.js`: guard "só Super Admin mexe em ADMIN/SUPER_ADMIN" no `PATCH /papel` (regra), `PUT /:id` e toggle `ativo` (novos) + testes.
3. `schema.prisma`: **`cep String?`** em `Celula` (migration aditiva/nullable). `celulaSchema`: aceitar `cep?` (regex opcional); **coagir** `diaSemana`/`frequenciaDias` (`z.coerce.number()`); **validar coerência** `diaSemana === weekday(dataPrimeiroEncontro)` (`.refine`, erro claro) + testes.
4. `routes/celulas.js`: `materializarEncontros` **dentro da transação** (ou tolerante e não-fatal, com repro do bug antes) e tratamento de `celula===undefined` após o loop + teste de regressão.
5. **QR:** **não** validar `diaSemana` no check-in; mensagens derivadas do `Encontro` (ausência → "Não há reunião hoje"; cedo → "Disponível a partir do horário"). Cobrir ramo "com conta".
6. `prisma/garantir-super-admin.js` idempotente + npm script; garantir `aprovado=true, ativo=true` para o super admin no seed/script.

**Estado civil (map-back seguro):** UI envia `estadoCivil` **apenas** quando o checkbox "casado(a)" **muda** de estado; leitura: marcado se `∈{CASADO,UNIAO_ESTAVEL}`. Sem transição → não reescreve o enum (preserva `DIVORCIADO/VIUVO/UNIAO_ESTAVEL` legados). `ConjugeSecao` oculta ≠ remover vínculo. (Hoje todos `null`; lógica correta mesmo assim.)

---

## 5. Telas (o "incrível")

Princípios: header com **ícone-em-caixinha** + título `text-2xl font-bold` + subtítulo muted; cards `ring-1`/`rounded-xl`; `space-y-6`; **chips coloridos**; **abas pill**; entrada `framer-motion` (fade+y 200–300ms, reduced-motion); largura confortável.

### 5.1 Admin › Usuários
Header + legenda dos 4 níveis (grid 2col: `RoleBadge`+descrição; Super Admin = "dono"). **Tabs** `Pendentes (n)` · `Todos`.
- **Pendentes:** cards Avatar/nome/email/**célula pretendida**/`StatusBadge "Em aprovação"`/data + **Recusar** (perigo, **irreversível**) e **Aprovar** (brand).
- **Todos:** busca (Combobox/Input com ícone), cards Avatar/nome(+"(você)")/email/`StatusBadge`/**`RoleSelect`** (respeita teto)/**Ativar-Desativar** (bloqueios da §4.4-C).

### 5.2 Admin › Células
Header + **Nova célula** (`Modal` ou seção reformulada) em seções: **Identificação** (Nome ph "Ex.: Célula Esperança"; Descrição ph "Ex.: Jovens do bairro"), **Encontro** (Dia; Frequência; **"Data e horário do primeiro encontro"**), **Endereço** (**CEP** máscara `00000-000` + autofill ViaCEP com abort/timeout/debounce; **Cidade via Combobox**; Bairro; Rua; Número + **checkbox "Sem número"** → grava `numero='S/N'`; Complemento; Ponto de referência). Lista: cards nome/dia/frequência/contagem/chip líder/ações (definir líder via `Combobox`, excluir).

### 5.3 Admin › Avisos
Header + card/`Modal`: textarea (ph "Ex.: Neste sábado teremos culto especial às 19h."), `Checkbox` "Exibir para todos", Salvar; preview do banner.

### 5.4 Perfil e 5.4b /Cadastro (signup)
- **Perfil:** card reformulado (menos formulário): avatar topo (com `AvatarUpload`), campos com placeholder/máscara, **checkbox "Sou casado(a)"** → `ConjugeSecao` (animada; **map-back seguro**), chip de papel, salvar, sair separado.
- **/cadastro (signup público):** reformulado no mesmo idioma visual (card centrado, ícone-em-caixinha, hierarquia clara, placeholders, senha com toggle) — **entregável explícito**, não some na fase de perfil.

### 5.5 Onboarding (SelecionarCelula / Aguardando / Modal)
`CelulaPicker`: cards com `Avatar` de líderes empilhados (**fallback iniciais** — hoje sem foto), nome, `Dia · Horário · Frequência`, **bairro** (sem endereço completo), estado "selecionado" (anel brand). `Aguardando`: `StatusBadge "Em aprovação"`, nome da célula, explicação, **"Atualizar status"** (re-fetch `apiMe`), CTA "Completar perfil".

---

## 6. Bug de criação de célula (systematic-debugging)

Reproduzir **antes** de corrigir. Hipóteses (ordenadas por probabilidade):
1. **`diaSemana`/`frequenciaDias` como string** (`z.number()` não coage; `<select>` devolve string) → 400 "Dados inválidos". **Correção:** `Number()` no front **e/ou** `z.coerce.number()` no schema.
2. `frequenciaDias` fora de `{7,14,28}` → 400.
3. `dataPrimeiroEncontro` vazio → `new Date('').toISOString()` lança no cliente.
4. `materializarEncontros` fora da transação lança → 500 após criar → **retry cria célula duplicada**; e `celula===undefined` se todas as tentativas de qrToken colidirem. **Correção:** materialização dentro da transação (ou tolerante) + tratar `undefined`.
Só declarar corrigido com **repro → fix → teste de regressão** verde.

---

## 7. Faseamento (cada fase deixa a `main` deployável; commits atômicos; TDD)

- **Fase 0 — Fundação de UI:** `Tabs, Checkbox, Modal(reusa base do Sheet), Combobox, RoleBadge, StatusBadge, RoleSelect, ContextSwitcher`, `lib/mascaras.js`, `lib/cidades.js`, extensão `lib/papeis.js`. Testes de unidade da lógica (máscara, roles, cidades).
- **Fase 1 — RBAC/hierarquia (backend+front):** `podeEditarPapel` + guards Super/Admin + testes; `garantir-super-admin.js`; labels/legenda; `StatusBadge`.
- **Fase 2 — Diagnóstico "admin não vê usuários"** (systematic-debugging; conferir `aprovado/ativo` das contas de gestão; `linksPorPapel` para admin ativo) → correção mínima se houver bug real.
- **Fase 3 — Shell admin + Usuários (juntas, p/ não deixar rota órfã):** `AdminLayout`+route-group+`ContextSwitcher`+redirects; Usuários reformada (abas, chips, `RoleSelect`, busca), Avisos movido.
- **Fase 4 — Células:** `cep` (migration) + schema (coerção + coerência `diaSemana`×data); form reformulado (CEP/cidade/sem número/placeholders/"data e horário"); **fix do bug**; definir líder via Combobox.
- **Fase 5 — Perfil + /cadastro:** estado civil checkbox (map-back seguro) + cônjuge; layout; máscara WhatsApp; signup reformulado.
- **Fase 6 — Onboarding & seleção:** `CelulaPicker` (modal+tela), fluxo cadastro→seleção→aprovação, `Aguardando` com refresh.
- **Fase 7 — QR:** ramo "com conta"; mensagens; **sem** validação de `diaSemana`; testes.
- **Fase 8 — Polimento & verificação:** `ui-ux-pro-max`, responsividade, animações, E2E manual (todos os fluxos), `tsc`/lint/jest verdes, deploy check.

### Regra de deploy contínuo
`prisma migrate deploy` **antes** do boot da API em cada release; `cep` é aditivo/nullable (seguro). Nenhum merge deixa link do switcher/rota apontando para tela inexistente (por isso Fase 3 funde shell+telas).

---

## 8. Critérios de aceite (verificáveis)

1. Admin (não super) **vê e gerencia** todos os usuários; promove membro a **Líder** e a **Admin**; **não** vê opção Super Admin; **não** rebaixa/desativa/edita um Admin ou o Super Admin.
2. Super Admin (`nexusai360@gmail.com`) concede **Super Admin** e gerencia admins.
3. Usuários tem **abas** Pendentes/Todos; pendentes com **"Em aprovação"**; papéis como **chips coloridos**; troca via chip clicável.
4. **`ContextSwitcher`** Minha célula ↔ Administração; admin **mantém** a área de membro; disponibilidade derivada do papel atual (sem estado stale).
5. **Avisos** têm destino próprio (fora de Usuários).
6. Cadastro de célula: **CEP com máscara** (autofill best-effort com timeout), **Cidade via Combobox**, **checkbox "sem número"**, **placeholders** em todos os campos, rótulo **"Data e horário do primeiro encontro"**, **cria sem bug** (repro→fix→teste), e **rejeita `diaSemana` incoerente** com a data.
7. Perfil e /cadastro reformulados; **checkbox "casado(a)"** revela o cônjuge; sem "divorciado/viúvo/união estável" na UI; **nenhum save reescreve estado civil sem transição real**; WhatsApp com máscara.
8. Cadastro sem QR → **seleção de célula** com `Avatar` de líderes (fallback iniciais), dia/horário/frequência/bairro → **aprovação**.
9. QR: ramo "com conta" registra presença e confirma; check-in **não** é rejeitado por `diaSemana`; check-ins válidos continuam funcionando (**sem regressão**).
10. `npm test` (api+web) **verde**; typecheck/lint sem erros novos; fluxos críticos validados manualmente; cada fase **deployável**.
11. Visual coerente/sofisticado (Insights adaptado à marca prata), responsivo, micro-interações, dark mode; `NotificacoesSino` preservado.

---

## 9. Riscos e mitigação
- **ViaCEP indisponível:** best-effort com `AbortController`+timeout+debounce; campos editáveis; máscara/submit independem da API.
- **Regressão RBAC:** cobrir `podeEditarPapel` e guards com testes **antes** do front.
- **Regressão QR (S1):** não tocar na lógica de check-in que funciona; validar coerência só no cadastro.
- **Perda de dados de estado civil (S2):** map-back sem reescrita fora de transição real.
- **Deploy quebrado (S3):** `migrate deploy` ordenado; fases deployáveis; `cep` aditivo.
- **Estado stale do switcher (S5):** derivar do papel atual; storage por `usuario.id`.
- **Colisão de sessões:** trabalho direto na `main` — garantir sessão única (não abrir paralela sem worktree).

## 10. Terminologia
**Contexto** (Minha célula/Administração) · **Papel** (Membro/Líder/Admin/Super Admin) · **Status** (Em aprovação/Ativo/Inativo) · **Célula pretendida** (célula escolhida por pendente).
