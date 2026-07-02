# Spec (v5 — FINAL) — Papéis, liderança N:N e segmentação de avisos

> Status: **v5 FINAL** — decisões do dono + **Review 1** + **Review 2** incorporadas. Pronta para o plano.
> Trabalho direto na `main`, live em http://localhost:3200.
>
> **Verdade contra o dado real (banco docker, 2026-07-02):** `Banner=0`, `Notificacao=0`, células com
> líder = `0`, usuários = só `1 SUPER_ADMIN`. **Não há histórico a migrar** → o backfill é trivial na
> prática (o único user vira `SUPER_ADMIN`+`MEMBRO`); ainda assim as migrations levam `@default` e lógica
> de backfill corretos, para robustez e para futuros ambientes com dados.

## Resoluções da Review 2 (v4 → v5)
- **Flags `Todos` levam `@default(false)`** e os `*Alvo[]` levam `@default([])` (senão o `ADD COLUMN NOT NULL`
  quebra em linhas existentes). Backfill sobe para `true` onde couber.
- **Criador de célula (líder/pastor) é inserido na junção `lideres`** ao criar (senão criaria célula que não
  lidera). Admin cria sem se auto-vincular.
- **`podeGerenciarPendente` (aprovar/recusar) na Fase B** passa a checar "célula do pendente ∈ células
  lideradas OU ADMIN+" — não o `usuario.celulaId` (que é a célula de *membro* do líder).
- **PUT × PATCH resolvido:** modal "editar usuário" chama `PUT /usuarios/:id` só para nome/whatsapp/ativo e
  os `PATCH .../nivel` e `.../qualificacao` para os eixos (travas concentradas nos PATCH).
- **`requireGestor` tem forma por fase:** Fase A = `ADMIN+ OU qualificação ≥ LIDER` (não há junção ainda);
  Fase B mantém isso (a cláusula "∈ lideres" é redundante pela invariante junção⊆≥LIDER — belt-and-suspenders).
- Backfill de notificações/leitura especificado (trivial: tabelas vazias). Testes de `requireGestor` e da
  reconciliação da migração adicionados. Carrossel 0/1 banner definido. (13 rotas `requireRole('LIDER')`, não 11.)

## Resoluções da Review 1 (o que mudou da v3 → v4)
- **Guard novo `requireGestor`** substitui os 11 `requireRole('LIDER')` órfãos (LÍDER deixa de ser nível). Ver
  "Estratégia de guards" na Fase A. `encontros.js` entra no blast radius.
- **"Todos" vira flag booleano por eixo** no schema de alvo (`celulasTodas`/`qualificacoesTodas`/
  `niveisTodas`), resolvendo a ambiguidade "Todos × vazio" e o problema de células criadas depois.
- **Gestão de célula é dirigida pelo VÍNCULO (junção `lideres`), não pela qualificação.** A junção só contém
  quem tem qualificação ≥ LÍDER (adicionar promove a LÍDER). Co-líder/Louvor/etc. **não** entram na junção e
  **não** têm poderes de liderança (coerente com "co-líder não cria/não envia").
- **A2b ajustado** para não depender de B: na Fase A a aprovação por célula usa o vínculo escalar atual; a
  versão N:N (conjunto de células lideradas) entra na Fase B junto da junção.
- Mapeados: callers de `podeGerenciarCelula` (`presenca.js`, `encontros.js`, filtro de `GET /celulas`),
  payload do JWT (`papel`→`nivelAcesso`/`qualificacao`), badge do sino (`escopo` removido), `ehAdmin` no
  `escopo.js` (corrige bug latente do SUPER_ADMIN puro), e nota de reconciliação da migração.

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
- `apps/api/src/lib/roles.js`: `requireRole` lê/injeta `nivelAcesso`. **`requireRole` passa a ser só de
  NÍVEL** (`USUARIO`/`ADMIN`/`SUPER_ADMIN`) — nunca mais `requireRole('LIDER'/'MEMBRO')`.

#### Estratégia de guards (fix crítico C1/C2 da Review 1)
`LIDER` deixa de ser nível → todos os `requireRole('LIDER')` (11 ocorrências) e os `requireRole('MEMBRO')`
precisam de novo guard. Regras:
- **Autenticado qualquer** (antigo `requireRole('MEMBRO')`) → `requireAuth` (só exige sessão válida;
  `USUARIO+`). Ex.: `GET /notificacoes`, `perfil`, `presenca` do próprio.
- **Novo `requireGestor`** — gate grosso; o **escopo fino** (esta célula específica) continua no
  `podeGerenciarCelula`. Forma por fase (M1 da Review 2):
  - **Fase A** (não há junção ainda): `ADMIN+` **OU** `qualificação ≥ LÍDER`.
  - **Fase B**: idem (a cláusula "∈ `lideres` de alguma célula" é redundante pela invariante junção⊆≥LIDER,
    mantida só como belt-and-suspenders). Um LÍDER **sem** vínculo passa o gate grosso e é barrado no escopo
    fino — correto.
  - Substitui `requireRole('LIDER')` nas **13 rotas**: `celulas.js:156,192,209,226`, `usuarios.js:44,56,84`,
    `presenca.js:90,117`, `encontros.js:75,113,150`, `notificacoes.js:29`.
- **Enviar notificação** (`POST /notificacoes`) = `requireGestor` **e** revalidação: ADMIN+ livre; LÍDER/
  PASTOR travado às suas células (co-líder e abaixo → 403).
- **`encontros.js`** (esquecido na v3): trocar `usuario.papel === 'LIDER'/'MEMBRO'` (`:35,39`) por
  `podeGerenciarCelula`/vínculo; 3 guards viram `requireGestor`.
- **Remover o acoplamento célula↔papel** (`celulas.js:129,357`, `usuarios.js:91`): operações de célula/
  aprovação deixam de escrever nível; mexem em qualificação e/ou vínculo (Fase B).
- `escopo.js:podeGerenciarCelula`: **`ehAdmin(nivelAcesso)`** (não literal `=== 'ADMIN'` — corrige o bug do
  SUPER_ADMIN puro retornar false hoje) **ou** usuário ∈ `celula.lideres`. Assinatura muda de `{liderId}`
  escalar para `lideres[]`; **callers a ajustar:** `celulas.js:202,213,230`, `presenca.js:99,123`,
  `encontros.js:36`, e o filtro `GET /celulas` `{liderId:usuario.id}` → `{lideres:{some:{id:usuario.id}}}`
  (`celulas.js:158`).
- **JWT:** `auth.js:8`/`googleAuth.js:12` deixam de assinar `papel`; assinam `nivelAcesso` (e mantêm
  `celulaId` escalar do vínculo de membro). `requireRole` já recarrega do DB, então o token só carrega o
  mínimo.
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
  pendente; a UI agrupa por célula. **Na Fase A** (liderança ainda 1:1) o líder vê os pendentes da sua
  célula via `usuario.celulaId` escalar (como hoje, `usuarios.js:11`). **Na Fase B** isso passa a checar o
  **conjunto de células lideradas** (junção) — o líder N:N vê seções por cada célula que lidera. (Evita a
  dependência invertida apontada na Review 1.)
- **QR / auto-cadastro:** entra `qualificacao=MEMBRO` automático; sem fluxo de solicitação na plataforma.
- **Nova UI de "editar usuário"** (não existe hoje): modal em `AdminUsuarios.jsx` → "Todos". Superfícies de
  API separadas (A3 da Review 2): `PUT /usuarios/:id` só para **nome/whatsapp/ativo**; **nível** e
  **qualificação** pelos `PATCH .../nivel` e `.../qualificacao` (travas concentradas neles). O modal orquestra
  as chamadas conforme o que mudou.

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
- **Matriz do `requireGestor`** (M3 R2): ADMIN livre; PASTOR/LÍDER passam o gate grosso; co-líder e abaixo →
  403; interação gate grosso × escopo fino (LÍDER sem vínculo passa o grosso e é barrado no fino).

---

## Fase B — Liderança N:N, ADMIN sem célula, criação de célula com aprovação

### Liderança N:N
- Remover `Celula.liderId @unique` e `User.celulaLiderada`. Criar N:N (`Celula.lideres User[]` ↔
  `User.celulasLideradas Celula[]`). **Migração:** para cada `liderId != null`, inserir na junção **antes**
  de dropar a coluna.
- `escopo.js:podeGerenciarCelula`: "é líder desta célula" = usuário ∈ `celula.lideres`.
- Rotas: `include:{lider}`→`{lideres}`; `POST /celulas/:id/lideres` (add) + `DELETE .../lideres/:userId`
  (remove). Um usuário lidera várias; célula tem várias. `GET /celulas/publicas` (`celulas.js:180,186`) troca
  o `select` de `lider` para `lideres`.
- **`podeGerenciarPendente` (aprovar/recusar, `usuarios.js:9-11`) migra nesta fase** (A2 da Review 2): passa
  a autorizar se `alvo.celulaId ∈ {células que o gestor lidera}` **OU** `ADMIN+` — não mais
  `alvo.celulaId === usuario.celulaId` (que é a célula de *membro* do líder). Idem a lista `GET /pendentes`.
- **Remover liderança = perde VÍNCULO, não qualificação:** removido de 1 célula mantém LÍDER e os demais
  vínculos; removido de todas mantém LÍDER **sem vínculo** (estado válido).
- **`User.celulaId` do líder** deixa de ser efeito de liderar. Membro=`celulaId`; liderança=junção;
  independentes (um líder pode ser membro de uma e liderar outras).
- **A junção `lideres` só contém quem tem qualificação ≥ LÍDER** (resolução Review 1, ponto aberto 2):
  gestão de célula (aprovar pendentes, enviar notificação da célula, editar cronograma) é dirigida pelo
  **vínculo** (∈ `lideres`), e adicionar alguém à junção **exige/promove** qualificação LÍDER. Co-líder,
  Louvor etc. **não** entram na junção nem têm poderes de liderança — são só tags de qualificação. Assim
  "co-líder não cria/não envia" fica consistente com "gestão por vínculo".
- **Reconciliação da migração (M2):** um usuário hoje `ADMIN` **e** `liderId` de célula vira
  `nivelAcesso=ADMIN` + `qualificacao=MEMBRO` (A1) mas **mantém o vínculo** na junção. Como a junção passa a
  exigir ≥ LÍDER, a migração B **promove a `qualificacao=LIDER`** todo usuário que estiver na junção com
  qualificação abaixo de LÍDER (backfill coerente). Idem para o `LIDER` que também é membro de outra célula:
  mantém `celulaId` (membro) + entra na junção da que lidera.

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
- **Criador líder/pastor é inserido na junção `lideres` da célula que criou** (A1 da Review 2 — senão criaria
  uma célula que não lidera). Admin cria **sem** se auto-vincular (pode designar líderes depois). Grava
  `criadaPorId` (relação com `onDelete: SetNull`).
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
  rebaixamento (0/1/>1 célula); ADMIN sem célula não quebra gating; criação por líder/pastor → pendente **e
  criador entra na junção**; criação por admin → aprovada; aprovação de célula; filtros públicos escondem
  pendente; `podeGerenciarPendente` usa células lideradas (não `celulaId` de membro).
- **Reconciliação da migração** (M4 R2): usuário na junção com qualificação < LÍDER é promovido a LÍDER;
  `ADMIN`+`liderId` → `ADMIN`+`MEMBRO`+vínculo preservado+promovido a LÍDER.

---

## Fase C — Segmentação (banner + notificação) com 3 eixos de alvo

### Os 3 eixos de alvo (combináveis, semântica **AND**)
Um aviso (banner ou notificação) tem três filtros. **Cada eixo tem um flag "Todos" booleano** (fix C3 da
Review 1 — resolve a ambiguidade "Todos × vazio" e o problema de célula criada *depois*):
1. **Células** — `celulasTodas Boolean @default(false)` + `celulasAlvo String[] @default([])`.
2. **Qualificações** — `qualificacoesTodas Boolean @default(false)` + `qualificacoesAlvo Qualificacao[] @default([])`.
3. **Nível de acesso** — `niveisTodas Boolean @default(false)` + `niveisAlvo NivelAcesso[] @default([])`
   (`USUARIO`/`ADMIN`; Super em ADMIN). Os `@default` são obrigatórios p/ o `ADD COLUMN` não quebrar (C1 R2).

**Regra de match (por conta, dedup — usuário vê 1×):** recebe sse `célulaMatch AND qualificaçãoMatch AND nívelMatch`:
- `célulaMatch`: `celulasTodas` → true (inclui células futuras); senão `U.celulaId ∈ celulasAlvo` **OU**
  alguma célula que U **lidera** ∈ celulasAlvo. **Célula é independente do líder:** mirar a célula A não puxa
  as outras células do líder.
- `qualificaçãoMatch`: `qualificacoesTodas` → true; senão `U.qualificacao ∈ qualificacoesAlvo`.
- `nívelMatch`: `niveisTodas` → true; senão `U.nivelAcesso ∈ niveisAlvo`, **mapeando SUPER_ADMIN→ADMIN no
  servidor** (ADMIN no alvo casa ADMIN∪SUPER_ADMIN).
- **Invariante:** um eixo com `Todos=false` **precisa** de ≥1 item no array; `Todos=false` + array vazio é
  inválido (ninguém) → o servidor rejeita o envio. `Todos=true` ignora o array.

**Exemplos (validam a semântica AND):**
- "Todos os usuários" → os 3 eixos em "Todos" → todo mundo.
- "Todos, mas só destas células" → qualificações Todos, nível Todos, células = {A,B} → quem está nessas
  células (qualquer qualificação/nível).
- "Só admins" → nível = {ADMIN}, qualificações Todos, células Todos → só nível admin/super, independente de
  qualificação e célula.

### Regras de UI do seletor (`SeletorPublico`) — auto-preenchimento e travas (bem amarradas)
- Cada eixo mapeia no par (`Todos` flag + array). Marcar o master **"Todos"** liga `Todos=true` (UI mostra
  todos os itens marcados/esmaecidos); desmarcar qualquer item liga `Todos=false` e materializa o array com
  os itens restantes (auto-ativação/desativação em sincronia).
- Atalho global **"Todos os usuários"**: liga `Todos=true` nos 3 eixos. Depois o usuário pode **desmarcar**
  itens de qualquer eixo (ex.: manter qualificações/níveis "Todos" e restringir só as células).
- **Travas (impedir envio "burro"):**
  - Eixo com `Todos=false` e **0 itens** = ninguém → bloquear envio com aviso ("selecione ao menos um item
    ou 'Todos' em cada eixo"). (Consistente com a invariante do match.)
  - **Eixo Nível só aparece para remetente ADMIN/SUPER.** Para remetente **LÍDER/PASTOR** (nível USUARIO):
    o eixo Nível é **fixo = {USUARIO}** e oculto (líder nunca mira admin); qualificações-alvo livres
    (Convidado…Pastor — "discriminar membros/líderes da célula", resolução Review 1 ponto 1: sem teto por
    qualificação do remetente, pois o escopo de célula já limita); células-alvo **⊆ células que ele lidera**
    (`celulasTodas` para um líder = todas as que ele lidera, **não** a plataforma).
  - Banner: remetente **só ADMIN+**; líder/pastor **não** veem banner. Notificação: ADMIN+ e LÍDER/PASTOR.
  - Antes de gravar, o **servidor revalida** todos os eixos contra a permissão do remetente (nunca confia no
    cliente): rejeita 403 se um líder tentar `niveisAlvo` ≠ {USUARIO}, célula fora do seu escopo, ou banner.

### Banner com expiração + carrossel
- **Schema:** `Banner` deixa de ser singleton. CRUD de vários:
  `{ id, mensagem, ativo, expiraEm DateTime (obrigatório), celulasTodas, celulasAlvo[], qualificacoesTodas,
  qualificacoesAlvo[], niveisTodas, niveisAlvo[], autorId, criadoEm }`. Migração: registro atual (se houver)
  vira banner com os 3 `Todos=true` e `expiraEm` = +30d default.
- **Rotas:** `GET /banner` → **lista** `{ banners: [...] }` (antes `{ mensagem }`) de banners
  `ativo && expiraEm>now` que casam com o usuário; `GET /banner/admin` (lista), `POST/PATCH/DELETE /banner/:id`.
  Fim do `findFirst` cego. **`BannerBar.jsx` passa a consumir array** (contrato muda; M3 da Review 1).
- **Frontend `BannerBar.jsx`:** carrossel — 1 por vez, indicador ("• • •") quando há outros; troca
  **automática a cada 10s** com transição sutil; **pausa no hover** (retoma no mouse-leave); **clique**
  avança; respeita `prefers-reduced-motion` (sem auto-rotate; navegação manual). Banner expirado some.
  **0 banners → não renderiza nada; 1 banner → sem indicador e sem auto-rotate** (B1 da Review 2).
- **Editor (`AdminAvisos.jsx`):** aba Banner vira lista/CRUD com `SeletorPublico` + `DateTimePicker`
  (data+hora) **obrigatório** de expiração; não salva sem expiração.

### Notificação — alvo + leitura por item + modal
- `Notificacao` ganha os 3 pares de alvo (`celulasTodas`+`celulasAlvo[]`, `qualificacoesTodas`+
  `qualificacoesAlvo[]`, `niveisTodas`+`niveisAlvo[]`), substituindo `escopo/celulaId`. **`NotificacoesSino.jsx:68`
  hoje deriva o badge "Geral" de `n.escopo==='GLOBAL'`** (A4 da Review 1) → passar a derivar um rótulo do alvo
  (ex.: "Geral" quando os 3 são `Todos`; senão um resumo tipo "Sua célula"/"Líderes").
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
