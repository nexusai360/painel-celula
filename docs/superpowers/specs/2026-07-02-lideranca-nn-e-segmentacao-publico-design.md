# Spec (v1) — Liderança N:N + Segmentação de público (Avisos/Notificações)

> Status: **v1** (aguardando confirmação do dono das premissas marcadas com ⚠️).
> Metodologia: após aprovação das premissas, roda `v1 → R1 → v2 → R2 → v3` e vai para o plano.
> Projeto: trabalho direto na `main`, live em http://localhost:3200.

## Contexto e decisões já travadas

- O dono pediu **duas coisas** correlacionadas:
  1. Refactor **muitos-para-muitos (N:N)** de células — decisão explícita: **fazer o N:N ANTES** da segmentação.
  2. **Segmentação de público** para banner e notificação (por nível e/ou célula, combináveis, com travas de RBAC por quem envia).
- Por isso, dividido em **dois sub-projetos sequenciais**: (1) Liderança N:N → (2) Segmentação. Cada um tem sua spec/plano/execução, mas ficam no mesmo doc por serem acoplados.

## Premissas a confirmar (⚠️)

1. **⚠️ Escopo do N:N = só LIDERANÇA.** O MEMBRO continua pertencendo a **1 célula** (modelo clássico). Só a liderança vira N:N: um líder pode liderar várias células; uma célula pode ter vários líderes. (Alternativa rejeitada por ora: membro em várias células — impacto máximo em onboarding/presença/contagem.)
2. **⚠️ Rebaixar papel automaticamente?** Ao remover alguém de **todas** as lideranças, **não** rebaixa o papel (continua LIDER). Rebaixamento é ação manual do admin. (Evita efeito colateral surpresa.)
3. **⚠️ "Célula do usuário" para entrega** inclui, para um líder, as células que ele **lidera** (não só onde é membro). Ex.: notificação para a célula B chega ao líder da B mesmo que ele seja membro da A.
4. **⚠️ Banner no topo:** mostra **o mais recente** que atinge o usuário (não empilha vários).

---

## Sub-projeto 1 — Liderança N:N

### Modelo (Prisma)

- **Hoje:** `Celula.liderId String? @unique` + `User.celulaLiderada Celula? @relation("LiderDaCelula")` → 1 líder por célula, 1 célula liderada por usuário.
- **Novo:** relação N:N implícita:
  - `User.celulasLideradas Celula[] @relation("LideresDaCelula")`
  - `Celula.lideres User[] @relation("LideresDaCelula")`
  - Remove `liderId` / `celulaLiderada`.
- **Membro:** `User.celulaId` (1 célula) **inalterado**.

### Migração

- Criar a tabela de junção (`_LideresDaCelula`).
- **Backfill:** cada `Celula.liderId` atual vira uma linha na junção (preserva os líderes existentes).
- Idempotente (checagem de existência antes de recriar), no padrão do projeto.
- Dispara `agente schema-changed` após aplicar (protocolo global) — aqui é trabalho direto na main, então apenas garantir migração aplicada no container.

### Backend

- `apps/api/src/lib/roles.js` / `papeis`: "lidera a célula X" passa a ser "U ∈ celula.lideres" (não mais `celula.liderId === U.id`).
- Rotas de célula (`celulas.js`):
  - `Definir líder` → **gerenciar líderes**: `POST /celulas/:id/lideres` (adiciona) e `DELETE /celulas/:id/lideres/:userId` (remove). Um usuário pode liderar várias células.
  - Ao adicionar um MEMBRO como líder, **promove** para papel LIDER (se estava abaixo).
  - Célula sem nenhum líder = estado válido ("sem líder").
- Ajustar todos os pontos que liam `celula.lider`/`liderId` (detalhe da célula, listagem, contagem, definição de líder).

### Frontend

- **Card de célula (lista Admin, `Celulas.jsx`):** mostra **vários** líderes (avatar + nome), em vez de um único chip.
- **"Definir líder"** vira gerência: buscar usuário e **adicionar**; cada líder atual aparece como chip removível.
- **Área "Minha célula" do líder:** se ele lidera várias, um seletor/lista das células que lidera (o detalhe por célula já existe). Escopo mínimo: listar e navegar.
- **Presença / onboarding / seleção de célula:** inalterados (membro em 1 célula).

### Testes (TDD)

- Migração idempotente preserva líderes.
- Adicionar/remover líder; usuário líder de N células; célula com N líderes.
- Promoção de papel ao virar líder; sem rebaixamento ao sair.
- Pontos de leitura antigos (`liderId`) não quebram.

---

## Sub-projeto 2 — Segmentação de público (banner + notificação)

### Modelo (Prisma)

- **`Banner`** deixa de ser único-global. Passa a ser vários registros, cada um com:
  - `papeisAlvo String[]` (vazio = todos os níveis)
  - `celulasAlvo String[]` (ids; vazio = todas as células)
  - `autorId`, `ativo`, `criadoEm`.
- **`Notificacao`** ganha `papeisAlvo String[]` e `celulasAlvo String[]` (substitui o `escopo GLOBAL|CELULA` atual por esse mecanismo unificado).

### Entrega (resolução de quem vê)

- `papelMatch(U, papeisAlvo)`: vazio → true. Senão: `ADMIN` no alvo casa `U.papel ∈ {ADMIN, SUPER_ADMIN}`; `LIDER` casa `LIDER`; `MEMBRO` casa `MEMBRO`. **Super Admin nunca é opção, mas entra junto de Admin.**
- `celulaMatch(U, celulasAlvo)`: vazio → true. Senão: `U.celulaId ∈ celulasAlvo` **OU** alguma célula que U lidera ∈ celulasAlvo (premissa ⚠️3).
- Recebe se `papelMatch && celulaMatch`. Dimensões independentes e combináveis.
- **Banner do topo:** o mais recente `ativo` que casa (premissa ⚠️4).

### RBAC de envio (validado no servidor, nunca no cliente)

- **Banner:** só `ADMIN+`. `papeisAlvo ⊆ {MEMBRO, LIDER, ADMIN}`. `celulasAlvo`: qualquer.
- **Notificação:**
  - `ADMIN+`: livre — `papeisAlvo ⊆ {MEMBRO, LIDER, ADMIN}`, qualquer célula.
  - `LIDER`: **correlacionado** — `papeisAlvo ⊆ {MEMBRO, LIDER}` (nunca ADMIN); `celulasAlvo` **obrigatoriamente ⊆ células que ele lidera**; se vazio → todas as células que ele lidera (não a plataforma inteira); **nunca** manda banner.
  - `MEMBRO`: 403 (não envia nada).

### Frontend — componente `SeletorPublico` (reutilizável)

- **Seção "Níveis":** lista de checkboxes com as **tags `RoleBadge`** (Membro/Líder/Administrador) + opção **"Todos"**. Opções exibidas conforme a permissão de quem envia (líder não vê Admin).
- **Seção "Células":** **cards** com nome, dia/horário e **líderes (avatares)** + opção **"Todas"**. Para líder: só as células que ele lidera.
- **Hint** quando nada está selecionado explicando o default ("vai para todos daquele recorte").
- **`AdminAvisos.jsx`:** aba Banner (só admin) e aba Notificação usam o `SeletorPublico`. A página de envio de **notificação** passa a ser acessível a **líderes** (com as opções travadas).

### Ajuste extra (bundle)

- **Legenda de Níveis** (popover em `AdminUsuarios.jsx`): corrigir o espaçamento — a tag "Administrador" fica colada na descrição. Ajustar a coluna do badge para `min-content` + `gap` maior e `items-start`.

### Testes (TDD)

- `papelMatch` / `celulaMatch` (vazios, admin⊇superadmin, célula por pertencimento e por liderança).
- RBAC de envio: líder não manda p/ admin; líder não manda banner; líder fora das suas células → 403; membro → 403; admin livre.
- Entrega: usuário recebe só o que casa; banner mostra o mais recente aplicável.

---

## Riscos / pontos de atenção

- **Blast radius do N:N:** vários pontos leem `liderId`/`lider` hoje — mapear todos antes de migrar (grep) para não deixar leitura órfã.
- **Migração de dados:** backfill dos líderes atuais é obrigatório; testar contra o banco real (docker) antes de declarar pronto.
- **Ordem:** sub-projeto 2 depende do 1 (a trava do líder usa "células que ele lidera").
- **Arrays no Postgres:** `String[]` do Prisma exige Postgres (ok, é o banco do projeto).

## Definição de pronto

- N:N: líderes migrados, gerência de múltiplos líderes por célula funcionando na UI, papel promovido ao virar líder, nada lendo `liderId` órfão. `tsc`/testes verdes; E2E manual no 3200.
- Segmentação: envio e entrega respeitando níveis+células e as travas de RBAC; `SeletorPublico` com tags e cards; legenda de Níveis corrigida. Testes de entrega/RBAC verdes; E2E manual.
