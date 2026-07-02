# Spec (v3 — confirmada) — Papéis, liderança N:N e segmentação de avisos

> Status: **v3-consolidada** — todas as decisões do dono confirmadas e incorporadas.
> Próximo passo da metodologia: **Review 1 (adversarial)** sobre esta versão → v4 → Review 2 → final →
> plano por fase → execução TDD. Trabalho direto na `main`, live em http://localhost:3200.

## Visão geral

Reestruturação profunda em **3 fases sequenciais** (dependência estrita **A → B → C**), cada uma com
seu ciclo spec-section→plano→execução TDD.

- **Fase A — Desacoplar Nível de Acesso × Qualificação.**
- **Fase B — Liderança N:N, ADMIN sem célula, criação de célula por líder com aprovação.**
- **Fase C — Segmentação (banner carrossel/expiração + notificação por 3 eixos de alvo + leitura por item).**

Fonte única de RBAC: `packages/shared/src/roles.js` (reexportada por `apps/api/src/lib/roles.js` e
`apps/web/src/lib/papeis.js`). `PAPEL_RANK = {MEMBRO:1, LIDER:2, ADMIN:3, SUPER_ADMIN:4}` hoje.

## Decisões do dono (confirmadas)
- **A1** Migração: todos os admins existentes entram com qualificação **MEMBRO** (ajuste manual depois).
- **A2a** **Admin e Super Admin podem alterar a própria qualificação.**
- **A2b** **Líder aprova/gerencia SÓ pendentes da(s) célula(s) que ele lidera.** A tela de aprovação
  **agrupa por célula**; líder com N células vê seções por célula, só das suas.
- **B1** Cadastro via **Google fica em STANDBY** — não mexer agora (nem a divergência de `aprovado`).
- **B2** **Cria célula:** qualificação **LÍDER ou PASTOR**, **ou** nível **ADMIN/SUPER_ADMIN** (por nível,
  independente da qualificação). Co-líder e demais **não** criam. Admin cria já aprovada; Líder/Pastor
  (nível USUARIO) cria **PENDENTE**.
- **C1** Alvo do aviso = **3 eixos combináveis (AND)**: Células + Qualificações + Nível de acesso.
  (detalhado na Fase C). O eixo Nível só aparece para remetente Admin/Super.
- **C2** Enviam **notificação**: nível **ADMIN+** ou qualificação **LÍDER/PASTOR** (co-líder não).
- **C3** Notificação com **leitura por item** (`lidaEm` com segundos) + botão **"marcar tudo como lido"**
  + **modal de leitura** caprichado ao abrir uma notificação.

---

## Fase A — Nível de Acesso × Qualificação

### Conceito
Dois eixos ortogonais no `User`:
- **Nível de acesso (plataforma):** `USUARIO < ADMIN < SUPER_ADMIN`. Define permissão. Super Admin é
  tratado como Admin (recebe tudo de Admin; nunca é opção de alvo).
- **Qualificação (função na igreja):** `CONVIDADO < MEMBRO < LOUVOR < COLIDER < LIDER < PASTOR`. Não dá
  permissão de plataforma por si só, exceto o que a Fase B define para LÍDER/PASTOR (criar célula).

Um usuário tem **os dois**. Ex.: Admin com qualificação MEMBRO (mantém a plataforma, não lidera);
USUARIO com qualificação LÍDER (lidera células, sem poderes de admin).

### Modelo (Prisma) — `apps/api/prisma/schema.prisma`
- `enum NivelAcesso { USUARIO ADMIN SUPER_ADMIN }` e `enum Qualificacao { CONVIDADO MEMBRO LOUVOR COLIDER LIDER PASTOR }`.
- `User`: substituir `papel Papel` por `nivelAcesso NivelAcesso @default(USUARIO)` + `qualificacao Qualificacao @default(CONVIDADO)`.
- Manter `enum Papel` só até a migração terminar; depois deixar de usar.

### Migração de dados (idempotente, em passos — enum Postgres não remove valor com dado vivo)
Criar enums+colunas novas → backfill → parar de usar coluna antiga. Backfill:
- `MEMBRO` → `USUARIO` + `MEMBRO`; `LIDER` → `USUARIO` + `LIDER`;
- `ADMIN` → `ADMIN` + `MEMBRO`; `SUPER_ADMIN` → `SUPER_ADMIN` + `MEMBRO` (decisão A1).
- Scripts `prisma/seed.js`, `criar-admin.js`, `garantir-super-admin.js` passam a gravar os dois campos.

### Backend — desacoplar RBAC
- `packages/shared/src/roles.js`: opera sobre `nivelAcesso` (`NIVEL_RANK`, `temNivel`, `ehAdmin`,
  `ehSuperAdmin`, `podeEditarNivel`, `opcoesDeNivel`, `podeAgirSobre`). **Novo** `qualificacao.js`
  (`QUALIFICACAO_RANK`, `ROTULO_QUALIFICACAO`, ordem, `podeEditarQualificacao`, `opcoesDeQualificacao`).
- `apps/api/src/lib/roles.js`: `requireRole` lê/injeta `nivelAcesso`.
- **Remover o acoplamento célula↔papel** (`celulas.js:129,357`, `usuarios.js:91`): operações de célula e
  de aprovação deixam de escrever nível de acesso; passam a mexer em qualificação e/ou vínculo (Fase B).
- `escopo.js:podeGerenciarCelula`: `nivelAcesso ADMIN+` **ou** "é líder desta célula" (vínculo da Fase B),
  sem comparar `papel` literal.
- `PATCH /usuarios/:id/papel` → dois endpoints validados por zod:
  - `PATCH /usuarios/:id/nivel` (mexer em Admin/Super só Super Admin, como hoje; **A2a:** admin/super
    podem alterar o próprio; ninguém se auto-rebaixa a ponto de travar o sistema — manter guarda de
    "não remover o último super admin").
  - `PATCH /usuarios/:id/qualificacao` (ADMIN+ livre; LÍDER só na aprovação/gestão da própria célula, até
    LÍDER — ver A2b). Trava de rebaixamento da Fase B se aplica aqui.

### Qualificação na aprovação — `usuarios.js` + `AdminUsuarios.jsx`
- `POST /usuarios/:id/aprovar` aceita `qualificacao` (default `MEMBRO`) e grava junto de `aprovado:true`.
  Quem aprova **deve** escolher; UI já vem em MEMBRO. Aprovação em lote usa o default MEMBRO.
- **A2b — agrupamento por célula:** `GET /usuarios/pendentes` retorna a **célula pretendida** de cada
  pendente; a UI agrupa por célula. Líder só recebe/aprova pendentes das células que ele lidera (checar
  contra o conjunto de lideranças, não `celulaId` escalar).
- **QR / auto-cadastro:** entra `qualificacao=MEMBRO` automático; sem fluxo de solicitação na plataforma.
- **Nova UI de "editar usuário"** (não existe hoje): modal em `AdminUsuarios.jsx` → "Todos", edita
  qualificação (e nível quando permitido), nome/whatsapp/ativo, via `PUT /usuarios/:id` (estendido).

### Frontend — exibição (usar `ui-ux-pro-max`)
- `lib/papeis.js`: separar em `CORES_NIVEL` (USUARIO/ADMIN/SUPER_ADMIN) e `CORES_QUALIFICACAO` (6 valores),
  ícones/cores próprios, mantendo a marca prata/grafite. `CORES_STATUS` fica.
- **Card do usuário (tela Usuários):** exibir a **tag de QUALIFICAÇÃO**. Para quem é **ADMIN/SUPER_ADMIN**,
  mostrar **só um ícone** do nível (na cor dele) **antes** da tag; hover revela o rótulo. Menos poluição.
- `RoleBadge`/`RoleSelect` → `NivelBadge`/`NivelSelect` + `QualificacaoBadge`/`QualificacaoSelect`.
- `Perfil.jsx` e `AvatarMenu.jsx`: exibem os dois eixos de forma limpa. Perfil do próprio admin/super
  permite trocar a **própria qualificação** (A2a).
- **Guards de rota** (`App.jsx`): `SoLider`/`SoGestor` passam a olhar **qualificação**; `SoAdmin`/
  `InicioOuCelulas` continuam em **nível**. `CelulaDetalhe.jsx:301`, `AdminAvisos.jsx:21`, `escopo.js`
  migram das comparações literais de `papel`.

### Testes A
- `roles.test.js` (nível), novo `qualificacao.test.js`, `escopo.test.js`, rotas de usuário (aprovar com
  qualificação e agrupamento por célula; nível vs qualificação; admin altera a própria qualificação),
  `papeis.test.js` web, selects/badges.

---

## Fase B — Liderança N:N, ADMIN sem célula, criação de célula com aprovação

### Liderança N:N
- Remover `Celula.liderId @unique` e `User.celulaLiderada`. Criar N:N (`Celula.lideres User[]` ↔
  `User.celulasLideradas Celula[]`). **Migração:** para cada `liderId != null`, inserir na junção **antes**
  de dropar a coluna.
- `escopo.js:podeGerenciarCelula`: "é líder desta célula" = usuário ∈ `celula.lideres`.
- Rotas: `include:{lider}`→`{lideres}`; `POST /celulas/:id/lideres` (add) + `DELETE .../lideres/:userId`
  (remove). Um usuário lidera várias; célula tem várias.
- **Remover liderança = perde VÍNCULO, não qualificação:** removido de 1 célula mantém LÍDER e os demais
  vínculos; removido de todas mantém LÍDER **sem vínculo** (estado válido).
- **`User.celulaId` do líder** deixa de ser efeito de liderar. Membro=`celulaId`; liderança=junção;
  independentes (um líder pode ser membro de uma e liderar outras).

### Rebaixamento de qualificação — travas
- Rebaixar LÍDER→(abaixo) liderando **>1 célula** → **bloquear** ("remova das células antes de rebaixar").
- Liderando **exatamente 1** → permite; vira **membro daquela célula** (`celulaId`=a célula), perde vínculo
  de liderança, muda só a qualificação.
- Liderando **0** → rebaixa livre.

### ADMIN/SUPER_ADMIN sem célula
- Só nível **USUARIO** exige célula (conta + QR). ADMIN/SUPER podem `celulaId=null`.
- Backend já tolera. Ajustar frontend: `TopBar.jsx:19` (`if(!celulaId) return []`) — sendo ADMIN, mostrar
  navegação de admin; `App.jsx:35` já redireciona; `AppHome`/`ContextSwitcher` não caírem no vazio de membro.
- **Google:** standby (B1) — não alterar o fluxo de `aprovado` do googleAuth agora.

### Criação de célula + aprovação de célula
- **Quem cria** (B2): qualificação `LIDER`/`PASTOR` **ou** nível `ADMIN`/`SUPER_ADMIN`.
- Célula criada por não-admin nasce **PENDENTE**; só aparece em `/celulas/publicas`, no checkin e na lista
  geral quando **aprovada por ADMIN**. Admin cria já aprovada.
- **Schema:** novo `enum CelulaStatus { PENDENTE APROVADA }` + `Celula.status @default(APROVADA)` +
  `criadaPorId`. **Não** reaproveitar `ativa`. Migração: células existentes → `APROVADA`.
- **Rotas:** `POST /celulas` guard = criadores acima (grava PENDENTE se criador não-admin); novos
  `GET /celulas/pendentes` e `POST /celulas/:id/aprovar` (guard ADMIN). Filtros públicos exigem
  `status=APROVADA` **e** `ativa=true`.
- **Frontend:** nova aba/tela "Aprovação de células" sob `/app/admin`; `NovaCelula` acessível ao líder/pastor;
  a lista do criador mostra a própria pendente com selo "Aguardando aprovação".

### Testes B
- Junção N:N (add/remove/multi), migração preserva líderes; `podeGerenciarCelula` por conjunto; travas de
  rebaixamento (0/1/>1 célula); ADMIN sem célula não quebra gating; criação por líder/pastor → pendente;
  criação por admin → aprovada; aprovação de célula; filtros públicos escondem pendente.

---

## Fase C — Segmentação (banner + notificação) com 3 eixos de alvo

### Os 3 eixos de alvo (combináveis, semântica **AND**)
Um aviso (banner ou notificação) tem três filtros. O usuário recebe se casar nos **três** eixos:
1. **Células** `celulasAlvo String[]` — nenhuma/algumas/todas.
2. **Qualificações** `qualificacoesAlvo Qualificacao[]` — Convidado…Pastor; uma/algumas/todas.
3. **Nível de acesso** `niveisAlvo NivelAcesso[]` — `USUARIO` e `ADMIN` (Super entra em ADMIN). Uma/ambas.

**Regra de match (por conta, dedup — usuário vê 1×):** recebe sse
`(célulaMatch) AND (qualificaçãoMatch) AND (nívelMatch)`, onde cada eixo com **"Todos" marcado**
(equivalente a todos os itens) é **não-restritivo** (passa todo mundo naquele eixo):
- `célulaMatch`: Todos → true; senão `U.celulaId ∈ celulasAlvo` **OU** alguma célula que U **lidera** ∈
  celulasAlvo. **Célula é independente do líder:** mirar a célula A não puxa as outras células do líder.
- `qualificaçãoMatch`: Todos → true; senão `U.qualificacao ∈ qualificacoesAlvo`.
- `nívelMatch`: Todos → true; senão `U.nivelAcesso ∈ niveisAlvo` (ADMIN casa ADMIN∪SUPER_ADMIN).

**Exemplos (validam a semântica AND):**
- "Todos os usuários" → os 3 eixos em "Todos" → todo mundo.
- "Todos, mas só destas células" → qualificações Todos, nível Todos, células = {A,B} → quem está nessas
  células (qualquer qualificação/nível).
- "Só admins" → nível = {ADMIN}, qualificações Todos, células Todos → só nível admin/super, independente de
  qualificação e célula.

### Regras de UI do seletor (`SeletorPublico`) — auto-preenchimento e travas (bem amarradas)
- Cada eixo tem itens + um master **"Todos"**. Marcar "Todos" seleciona todos os itens; desmarcar um item
  desliga o "Todos" mas mantém o resto (auto-ativação/desativação em sincronia).
- Atalho global **"Todos os usuários"**: seta os 3 eixos para "Todos". Depois o usuário pode **desmarcar**
  qualquer item de qualquer eixo (ex.: manter todas qualificações/níveis e restringir células).
- **Travas (impedir envio "burro"):**
  - Nenhum eixo pode ficar **vazio** (0 itens) — vazio = ninguém; bloquear envio com aviso ("selecione ao
    menos um item ou 'Todos' em cada eixo").
  - **Eixo Nível só aparece para remetente ADMIN/SUPER.** Para remetente **LÍDER/PASTOR** (nível USUARIO)
    o eixo Nível é **fixo = {USUARIO}** e oculto (líder nunca mira admin), qualificações-alvo ⊆
    {Convidado…Líder} (sem mirar acima de si? assumir ≤ própria qualificação), e células-alvo **⊆ células
    que ele lidera** (vazio → todas as que lidera; nunca a plataforma).
  - Banner: remetente **só ADMIN+**; líder/pastor **não** veem banner. Notificação: ADMIN+ e LÍDER/PASTOR.
  - Antes de gravar, o **servidor revalida** todos os eixos contra a permissão do remetente (nunca confia no
    cliente): rejeita 403 se um líder tentar mirar admin, célula fora do escopo, ou mandar banner.

### Banner com expiração + carrossel
- **Schema:** `Banner` deixa de ser singleton. CRUD de vários:
  `{ id, mensagem, ativo, expiraEm DateTime (obrigatório), qualificacoesAlvo[], niveisAlvo[], celulasAlvo[],
  autorId, criadoEm }`. Migração: registro atual (se houver) vira banner com `expiraEm` = +30d default.
- **Rotas:** `GET /banner` → **lista** de banners `ativo && expiraEm>now` que casam com o usuário;
  `GET /banner/admin` (lista), `POST/PATCH/DELETE /banner/:id`. Fim do `findFirst` cego.
- **Frontend `BannerBar.jsx`:** carrossel — 1 por vez, indicador ("• • •") quando há outros; troca
  **automática a cada 10s** com transição sutil; **pausa no hover** (retoma no mouse-leave); **clique**
  avança; respeita `prefers-reduced-motion` (sem auto-rotate; navegação manual). Banner expirado some.
- **Editor (`AdminAvisos.jsx`):** aba Banner vira lista/CRUD com `SeletorPublico` + `DateTimePicker`
  (data+hora) **obrigatório** de expiração; não salva sem expiração.

### Notificação — alvo + leitura por item + modal
- `Notificacao` ganha `qualificacoesAlvo[]`, `niveisAlvo[]`, `celulasAlvo[]` (substitui `escopo/celulaId`).
- **Leitura por item (C3):** nova tabela `NotificacaoLeitura { userId, notificacaoId, lidaEm DateTime }`
  (`@@unique([userId,notificacaoId])`). Uma notificação é "lida" para U se existe linha. Remove o modelo de
  marca única `User.notificacoesLidasEm` (ou mantém só como fallback/migração).
  - `GET /notificacoes`: entrega por match+dedup; marca `lida` por existência de linha; conta não lidas.
  - `POST /notificacoes/:id/ler`: cria a linha com `lidaEm=now()` (com segundos) — leitura individual.
  - `POST /notificacoes/ler-tudo`: cria linhas para todas as visíveis não lidas (botão "marcar tudo").
- **Front (`NotificacoesSino.jsx` + novo modal):** lista no sino; clicar numa notificação abre **modal de
  leitura** caprichado (título, corpo, autor, data) e marca aquela como lida; botão "marcar tudo como lido";
  contador reflete leitura por item.
- Envio de notificação acessível a **líderes/pastores** (opções travadas pelo `SeletorPublico`).

### Frontend — `SeletorPublico` (reutilizável, `ui-ux-pro-max`)
- Três seções: **Células** (cards: nome, dia/horário, líderes com avatar + "Todas"), **Qualificações**
  (checkboxes com `QualificacaoBadge` + "Todas"), **Nível** (Usuário/Administrador + "Todos") — a de Nível
  só para remetente admin. Atalho "Todos os usuários". Hints + travas descritas acima.

### Testes C
- Match dos 3 eixos (AND; "Todos" não-restritivo; dedup; célula por membro e por liderança sem puxar outras;
  ADMIN casa ADMIN∪SUPER); travas do seletor (eixo vazio bloqueia; líder sem eixo nível; célula fora do
  escopo → 403; membro → 403; banner só admin); banner só ativos/não-expirados por alvo; carrossel
  (rotação/pausa/clique/reduced-motion); leitura por item + marcar-tudo; modal.

---

## Riscos e ordem
- Ordem obrigatória **A → B → C** (C depende de qualificação e das "células que o líder lidera").
- Migrações Postgres em passos (enum não remove valor com dado vivo; junção antes de dropar `liderId`;
  status de célula com backfill APROVADA; nova tabela de leitura). Testar contra o banco docker real.
- Grep obrigatório por literais `'LIDER'`/`'ADMIN'`/`papel ===` (`App.jsx:41`, `CelulaDetalhe.jsx:301`,
  `escopo.js`, `celulas.js:158`).
- JWT carrega `celulaId` escalar; para líder N:N mantém `celulaId` do próprio vínculo de membro; "células
  lideradas" derivadas à parte.
- Google login: **fora de escopo** (standby) — não regredir o que existe.

## Definição de pronto (por fase)
- **A:** dois eixos no banco/UX; aprovação escolhe qualificação e agrupa pendentes por célula; card mostra
  qualificação + ícone de nível no hover; admin/super troca a própria qualificação; nada lendo `papel` como
  permissão acoplada; testes verdes; E2E no 3200.
- **B:** liderança N:N com gerência multi-líder; travas de rebaixamento; ADMIN sem célula navega; criação de
  célula por líder/pastor/admin com aprovação de célula; testes verdes; E2E.
- **C:** segmentação pelos 3 eixos com dedup e travas de RBAC; banner CRUD com expiração e carrossel; leitura
  de notificação por item + marcar-tudo + modal; `SeletorPublico`; testes verdes; E2E.
