# Spec (v2) — Refatoração de papéis, liderança N:N e segmentação de avisos

> Status: **v2** (reescrita após perícia estrutural completa e novas regras do dono).
> Aguardando confirmação do dono nos **pontos abertos** (⚠️) antes de rodar `R1→v3` e ir ao plano.
> Projeto: trabalho direto na `main`, live em http://localhost:3200. Metodologia por fase.

## Visão geral

O dono pediu uma reestruturação profunda. Consolidada em **3 fases sequenciais**, cada uma
com seu ciclo spec-section→plano→execução TDD. As fases têm dependência estrita: **A → B → C**.

- **Fase A — Desacoplar Nível de Acesso × Qualificação.** Hoje `Papel` é um eixo único que
  mistura permissão de plataforma e função na igreja. Vira dois eixos independentes.
- **Fase B — Liderança N:N, ADMIN sem célula, criação de célula por líder com aprovação.**
- **Fase C — Segmentação de público (banner com carrossel/expiração + notificação por alvo).**

Fonte única de RBAC: `packages/shared/src/roles.js` (reexportada por `apps/api/src/lib/roles.js`
e `apps/web/src/lib/papeis.js`). `PAPEL_RANK = {MEMBRO:1, LIDER:2, ADMIN:3, SUPER_ADMIN:4}` hoje.

---

## Fase A — Nível de Acesso × Qualificação

### Conceito
Dois eixos ortogonais no `User`:
- **Nível de acesso (plataforma):** `USUARIO < ADMIN < SUPER_ADMIN`. Define permissão. Super Admin
  é tratado como Admin (vê tudo que Admin vê); é uma posição acionada em momentos certos.
- **Qualificação (função na igreja):** `CONVIDADO < MEMBRO < LOUVOR < COLIDER < LIDER < PASTOR`.
  Não dá permissão de plataforma por si só (exceto o que a Fase B definir para LÍDER: criar célula).

Um usuário tem **os dois**. Ex.: um Admin pode ter qualificação MEMBRO (mantém a plataforma, não
lidera); um USUARIO pode ter qualificação LÍDER (lidera células, sem poderes de admin).

### Modelo (Prisma) — `apps/api/prisma/schema.prisma`
- Novos enums:
  - `enum NivelAcesso { USUARIO ADMIN SUPER_ADMIN }`
  - `enum Qualificacao { CONVIDADO MEMBRO LOUVOR COLIDER LIDER PASTOR }`
- `User`: substituir `papel Papel` por:
  - `nivelAcesso NivelAcesso @default(USUARIO)`
  - `qualificacao Qualificacao @default(CONVIDADO)`
- Manter `enum Papel` só até a migração de dados terminar; depois remover (ou deixar órfão, sem uso).

### Migração de dados (obrigatória, idempotente)
Postgres não remove valor de enum com dados vivos → migração em passos: criar enums+colunas novas →
backfill → dropar coluna antiga. Backfill:
- `papel = 'MEMBRO'` → `nivelAcesso=USUARIO`, `qualificacao=MEMBRO`
- `papel = 'LIDER'`  → `nivelAcesso=USUARIO`, `qualificacao=LIDER`
- `papel = 'ADMIN'`  → `nivelAcesso=ADMIN`,   `qualificacao=MEMBRO`
- `papel = 'SUPER_ADMIN'` → `nivelAcesso=SUPER_ADMIN`, `qualificacao=MEMBRO`
- ⚠️ **A1:** default de qualificação para admins existentes = MEMBRO (assumido; confirmar).
- Scripts de provisionamento (`prisma/seed.js`, `criar-admin.js`, `garantir-super-admin.js`) passam a
  gravar os dois campos.

### Backend — desacoplar RBAC
- `packages/shared/src/roles.js`: passa a operar sobre `nivelAcesso` (`NIVEL_RANK`, `temNivel`, `ehAdmin`,
  `ehSuperAdmin`, `podeEditarNivel`, `opcoesDeNivel`, `podeAgirSobre`). **Novo** `qualificacao.js`
  (`QUALIFICACAO_RANK`, `ROTULO_QUALIFICACAO`, ordem, `podeEditarQualificacao`, `opcoesDeQualificacao`).
- `apps/api/src/lib/roles.js`: `requireRole` passa a ler/injetar `nivelAcesso` (hoje lê `papel`).
- **Remover o acoplamento célula↔papel:**
  - `celulas.js:129` e `:357` (definir/rebaixar líder) **não** mexem mais em nível de acesso. "Ser líder
    da célula X" vira **qualificação LIDER + vínculo** (Fase B). Ao virar líder, promove a
    `qualificacao=LIDER` se estava abaixo (não altera `nivelAcesso`).
  - `usuarios.js:91` (recusar) reseta **qualificação** para `MEMBRO` (não nível).
  - `escopo.js:10` (`podeGerenciarCelula`) passa a checar `nivelAcesso ADMIN` OU "é líder da célula"
    (via vínculo da Fase B), sem comparar `papel` literal.
- `PATCH /usuarios/:id/papel` → separar em **dois** endpoints validados por zod:
  `PATCH /usuarios/:id/nivel` (guard: mexer em Admin/Super é só Super Admin, como hoje) e
  `PATCH /usuarios/:id/qualificacao` (guard: quem aprova/gestor pode setar até sua própria qualificação).
  ⚠️ **A2:** quem pode setar qualificação e até que nível — assumido: ADMIN+ livre; LÍDER só na aprovação
  da própria célula, até LÍDER. Confirmar.

### Qualificação na aprovação — `usuarios.js` + `AdminUsuarios.jsx`
- `POST /usuarios/:id/aprovar` passa a aceitar `qualificacao` (default `MEMBRO`) e gravá-la junto de
  `aprovado:true`. Quem aprova (LÍDER da célula, ADMIN ou SUPER) **deve** escolher; UI já vem em MEMBRO.
- **QR / auto-cadastro:** entra `qualificacao=MEMBRO` automático. Sem fluxo de solicitação na plataforma;
  reavaliação é manual por um admin depois.
- **Nova UI de "editar usuário"** (não existe hoje): modal em `AdminUsuarios.jsx` → "Todos", que edita
  qualificação (e nível quando permitido), nome/whatsapp/ativo, consumindo o `PUT /usuarios/:id`
  (estendido para aceitar os campos).

### Frontend — exibição (usar `ui-ux-pro-max`)
- `lib/papeis.js`: separar `CORES_PAPEL` em `CORES_NIVEL` (USUARIO/ADMIN/SUPER_ADMIN, ícones/cores próprios)
  e `CORES_QUALIFICACAO` (6 valores, ícones/cores próprios; manter marca prata/grafite). `CORES_STATUS` fica.
- **No card do usuário (tela Usuários):** mostrar a **tag de QUALIFICAÇÃO** (não mais a de nível). Para
  quem é **ADMIN/SUPER_ADMIN**, mostrar **só um ícone** (do nível, na cor dele) **antes** da tag de
  qualificação; hover no ícone revela o rótulo ("Administrador"/"Super Admin"). Menos poluição.
- `RoleBadge`/`RoleSelect` → generalizar/derivar em `NivelBadge`/`NivelSelect` +
  `QualificacaoBadge`/`QualificacaoSelect`.
- `Perfil.jsx` e `AvatarMenu.jsx`: exibir os dois eixos (nível + qualificação) de forma limpa.
- **Guards de rota** (`App.jsx`): `SoLider`/`SoGestor` passam a olhar **qualificação** (LÍDER/COLIDER/PASTOR);
  `SoAdmin`/`InicioOuCelulas` continuam em **nível**. `CelulaDetalhe.jsx:301`, `AdminAvisos.jsx:21`,
  `escopo.js` migram das comparações literais de `papel`.
- Ajuste extra já pedido: **espaçamento da legenda de Níveis** — já corrigido nesta sessão (commit).

### Testes A
- `roles.test.js` (nível), novo `qualificacao.test.js`, `escopo.test.js`, `usuarios` routes (aprovar com
  qualificação; nível vs qualificação nos endpoints), `papeis.test.js` web, selects/badges.

---

## Fase B — Liderança N:N, ADMIN sem célula, criação de célula com aprovação

### Liderança N:N
- Remover `Celula.liderId @unique` e `User.celulaLiderada`. Criar relação N:N
  (`Celula.lideres User[]` ↔ `User.celulasLideradas Celula[]`, junção implícita).
- **Migração:** para cada `Celula.liderId != null`, inserir linha na junção **antes** de dropar a coluna.
- **`escopo.js:podeGerenciarCelula`** (epicentro): "é líder desta célula" = usuário ∈ `celula.lideres`.
- **Rotas de célula** (`celulas.js`): `include:{lider}`→`include:{lideres}`; listar do líder por junção;
  `POST /celulas/:id/lider` (definir, único) → `POST /celulas/:id/lideres` (adicionar) +
  `DELETE /celulas/:id/lideres/:userId` (remover). Uma pessoa pode liderar várias; célula pode ter várias.
- **Remoção de liderança = perde vínculo, não qualificação** (regra do dono): remover de 1 célula mantém
  LÍDER e os demais vínculos; remover de todas mantém LÍDER **sem vínculo de célula** (estado válido).
- **`User.celulaId` do líder:** deixa de ser setado como efeito de liderar. Membro = `celulaId`; liderança =
  junção. Um líder pode ter `celulaId` (é membro de uma) e liderar outras — independentes.
- Frontend: `Celulas.jsx` (card com **vários** líderes + gerência add/remove), `CelulaDetalhe`/`MembrosPanel`
  (`ehLider` por conjunto de líderes), `TopBar` "Minha Célula" (lida com múltiplas lideranças).
  `CelulaPicker` já suporta `lideres[]`.

### Rebaixamento de qualificação — travas (regra do dono)
- Rebaixar qualificação de LÍDER→(abaixo) com o usuário liderando **>1 célula** → **bloquear** com
  mensagem "remova das células antes de rebaixar".
- Liderando **exatamente 1** célula → permite; ele **vira membro daquela célula** (`celulaId` = a célula) e
  perde o vínculo de liderança; muda só a qualificação.
- Liderando **0** células → rebaixa livremente.

### ADMIN/SUPER_ADMIN sem célula
- Regra: **só nível USUARIO precisa de célula** (na criação de conta e no QR). ADMIN/SUPER podem ter
  `celulaId=null`.
- Backend já tolera (`celulaId` nullable). Ajustar frontend: `TopBar.jsx:19` (`if(!celulaId) return []`)
  para, sendo ADMIN, mostrar a navegação de admin; `AppHome`/`ContextSwitcher` não caírem no vazio de membro.
- ⚠️ **B1:** alinhar divergência do Google (hoje conta Google nova não seta `aprovado` → herda `true`).
  Assumido: alinhar ao `/auth/register` (sem QR = pendente). Confirmar.

### Criação de célula por líder + aprovação de célula
- Qualificação **LÍDER (e PASTOR)** pode criar célula. ⚠️ **B2:** incluir COLIDER? Assumido: **não** (só
  LÍDER/PASTOR). Confirmar.
- Célula criada por não-admin nasce **PENDENTE**; só aparece em `/celulas/publicas`, no checkin e na lista
  geral quando **aprovada por um ADMIN**. Admin cria já aprovada.
- **Schema:** novo campo em `Celula` — `status CelulaStatus @default(APROVADA)` (`enum {PENDENTE, APROVADA}`)
  + `criadaPorId`. **Não** reaproveitar `ativa` (que é outra semântica). Migração: células existentes →
  `APROVADA`.
- **Rotas:** `POST /celulas` baixa o guard para LÍDER+ (grava PENDENTE se criador não-admin); novos
  `GET /celulas/pendentes` e `POST /celulas/:id/aprovar` (guard ADMIN), espelhando o padrão de usuários.
  Filtros públicos passam a exigir `status=APROVADA` **e** `ativa=true`.
- **Frontend:** nova tela/aba "Aprovação de células" sob `/app/admin` (espelha `AbaPendentes`); `NovaCelula`
  fica acessível ao líder; a lista do líder mostra a própria pendente com selo "Aguardando aprovação".

### Testes B
- Junção N:N (add/remove/multi), migração preserva líderes; `podeGerenciarCelula` por conjunto; travas de
  rebaixamento; ADMIN sem célula não quebra gating; criação por líder → pendente; aprovação de célula;
  filtros públicos escondem pendente.

---

## Fase C — Segmentação de público (banner + notificação)

### Alvo (dimensões independentes e combináveis)
Cada aviso (banner/notificação) tem dois filtros; vazio = "todos daquele recorte":
- **Qualificações-alvo** `qualificacoesAlvo Qualificacao[]` — Convidado…Pastor.
- **Nível admin-alvo** ⚠️ **C1:** como o dono, na primeira descrição, queria mirar "administradores",
  proponho um alvo adicional booleano/flag para **nível ADMIN+** (inclui Super Admin). Assim dá para mandar
  "só para admins" (independente de qualificação). Alternativa: um único seletor que mistura os dois eixos.
  Assumido: seletor de **Qualificações** + um item especial **"Administradores"** (nível). Confirmar.
- **Células-alvo** `celulasAlvo String[]` (ids).
- **Entrega:** usuário recebe se `(qualificaçãoMatch) E (célulaMatch)`. `célulaMatch` vazio = todas; senão
  `U.celulaId ∈ celulasAlvo` **OU** alguma célula que U **lidera** ∈ celulasAlvo. Célula é tratada de forma
  **independente do líder**: mirar a célula A não puxa as outras células do líder (regra do dono).
- **Dedup por conta:** um usuário = uma conta = **vê 1×**, mesmo membro/líder de várias células.
- Super Admin: nunca é opção de alvo; entra junto de "Administradores".

### RBAC de envio (validado no servidor)
- **Banner:** só nível **ADMIN+**. Alvo de qualificação livre; "Administradores" permitido; qualquer célula.
- **Notificação:** pode enviar quem é nível **ADMIN+** **ou** qualificação **LÍDER+** ⚠️ **C2** (COLIDER pode
  enviar? assumido: **não**, só LÍDER/PASTOR; confirmar).
  - ADMIN+: livre (qualquer qualificação-alvo, "Administradores", qualquer célula).
  - LÍDER (nível USUARIO): **correlacionado** — qualificações-alvo ⊆ {Convidado…Líder} exceto
    "Administradores" (nunca mira admin); células-alvo **⊆ células que ele lidera**; vazio → todas as que
    ele lidera (não a plataforma); **nunca** manda banner.
  - MEMBRO/demais: não envia nada.

### Banner com expiração + carrossel
- **Schema:** `Banner` deixa de ser singleton. Vira CRUD de vários registros:
  `{ id, mensagem, ativo, expiraEm DateTime (obrigatório), qualificacoesAlvo, adminAlvo Boolean,
  celulasAlvo, autorId, criadoEm }`. Migração: registro atual (se houver) vira um banner com `expiraEm`
  default (ex.: +30 dias) para não perder dado.
- **Rotas:** `GET /banner` → **lista** de banners `ativo && expiraEm>now` que casam com o usuário;
  `GET /banner/admin` (lista), `POST/PATCH/DELETE /banner/:id`. Fim do `findFirst` cego.
- **Frontend `BannerBar.jsx`:** carrossel — mostra 1 por vez com indicador ("• • •") quando há outros;
  troca **automática a cada 10s** com transição sutil; **pausa no hover** (retoma no mouse-leave); **clique**
  avança para o próximo; respeita `prefers-reduced-motion` (sem auto-rotate, navegação manual). Expira some
  sozinho.
- **Editor (`AdminAvisos.jsx`):** aba Banner vira lista/CRUD com `SeletorPublico` + `DateTimePicker`
  (data+hora) **obrigatório** de expiração. Não deixa salvar sem expiração.

### Notificação
- `Notificacao` ganha `qualificacoesAlvo`, `adminAlvo`, `celulasAlvo` (substitui `escopo/celulaId`).
- `GET /notificacoes`: entrega reescrita com a regra de match + dedup por conta. Leitura continua por marca
  `User.notificacoesLidasEm` (corte por data) ⚠️ **C3** (se quiser "lida por item", exige tabela
  `NotificacaoLeitura`; assumido: manter marca global; confirmar).
- Envio acessível a **líderes** (com opções travadas) — hoje a aba de notificação vive em `AdminAvisos`
  (área admin); mover/expor o envio de notificação para os líderes também.

### Frontend — componente `SeletorPublico` (reutilizável, `ui-ux-pro-max`)
- Seção **Qualificações**: checkboxes com as tags `QualificacaoBadge` + "Todas" (+ item "Administradores").
  Opções filtradas pela permissão de quem envia.
- Seção **Células**: cards (nome, dia/horário, líderes com avatar) + "Todas". Para líder: só as que lidera.
- Hint quando nada selecionado explicando o default.

### Testes C
- Match de qualificação/admin/célula (vazios, dedup, célula por membro e por liderança sem puxar outras);
  RBAC de envio (líder não mira admin, não manda banner, célula fora do escopo → 403; membro → 403);
  banner: só ativos e não expirados, filtrados por alvo; carrossel (rotação/pausa/clique) em teste de UI.

---

## Pontos abertos a confirmar (⚠️)
- **A1** default de qualificação de admins na migração = MEMBRO.
- **A2** quem seta qualificação e até que nível (assumido: ADMIN+ livre; LÍDER só na aprovação da própria
  célula, até LÍDER).
- **B1** alinhar cadastro Google sem QR para pendente (hoje entra aprovado).
- **B2** COLIDER pode criar célula? (assumido: não; só LÍDER/PASTOR).
- **C1** modelo do alvo: seletor de Qualificações + item "Administradores" (nível). (vs. um seletor único
  misturando eixos).
- **C2** COLIDER pode enviar notificação? (assumido: não; só LÍDER/PASTOR + ADMIN).
- **C3** leitura de notificação continua por marca global de data (assumido: sim).

## Riscos e ordem
- Ordem obrigatória **A → B → C** (C depende de qualificação e de "células que o líder lidera").
- Migrações Postgres em passos (enum não remove valor com dado vivo; junção antes de dropar `liderId`;
  status de célula com backfill APROVADA). Testar contra o banco docker real antes de declarar pronto.
- Grep obrigatório por strings literais `'LIDER'`/`'ADMIN'`/`papel ===` — comparações espalhadas
  (`App.jsx:41`, `CelulaDetalhe.jsx:301`, `escopo.js`, `celulas.js:158`).
- JWT carrega `celulaId` escalar; decidir o que vai para líder N:N (assumido: mantém `celulaId` do próprio
  vínculo de membro; "células lideradas" derivadas à parte).

## Definição de pronto (por fase)
- **A:** dois eixos no banco/UX; aprovação escolhe qualificação; card mostra qualificação + ícone de nível no
  hover; nada lendo `papel` como permissão de forma acoplada; testes verdes; E2E no 3200.
- **B:** liderança N:N com gerência multi-líder; travas de rebaixamento; ADMIN sem célula navega; criação de
  célula por líder → pendente → aprovação de célula; testes verdes; E2E.
- **C:** segmentação por qualificação/admin/célula com dedup e travas de RBAC; banner CRUD com expiração e
  carrossel (auto/hover/clique); `SeletorPublico`; testes verdes; E2E.
