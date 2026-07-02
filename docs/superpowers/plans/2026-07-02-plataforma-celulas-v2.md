# Plataforma de Células v2 — Plano de implementação

> Documento vivo: é o PLANO (o "caminho das pedras" das features) e o PROGRESSO
> (ponto de retomada entre sessões/compactações). Atualizar a seção PROGRESSO a
> cada bloco/commit. Fonte dos requisitos: áudios do dono (jul/2026).

## Visão geral

Evolução do Painel de Célula para operação real em múltiplas células, com
hierarquia de acesso, onboarding por seleção de célula (ou por QR), aprovação
por líderes, perfil rico (aniversário, cônjuge), presença por QR com janela,
notificações e banner administrativo.

## Papéis (hierarquia) — CORRIGIDO

Rank: `MEMBRO(1) ⊂ LIDER(2) ⊂ ADMIN(3) ⊂ SUPER_ADMIN(4)`.

- **SUPER_ADMIN** — o **dono** da plataforma. Único inicialmente:
  `nexusai360@gmail.com`. Faz tudo do ADMIN **e** é o único que pode
  conceder/revogar `ADMIN` e `SUPER_ADMIN`.
- **ADMIN** — faz tudo na plataforma (aprova qualquer um, gerencia células e
  usuários, banner global, notificações em massa), **mas não** promove ninguém a
  ADMIN/SUPER_ADMIN (isso é só do super admin). Não é dono.
- **LIDER** — gerencia a própria célula; aprova pendentes que indicaram a célula
  dele; envia notificações aos membros da célula dele. Uma célula pode ter
  **vários** líderes.
- **MEMBRO** — participante de uma célula.

Regra de edição de papel: só SUPER_ADMIN altera papéis que envolvam
ADMIN/SUPER_ADMIN. ADMIN pode gerenciar MEMBRO↔LIDER e (des)ativar contas.

## Mudanças de modelo de dados (Prisma)

1. `Papel` enum: adicionar `SUPER_ADMIN`. Migration + backfill: `nexusai360@gmail.com` → SUPER_ADMIN.
2. **Múltiplos líderes por célula**: hoje `Celula.liderId` (1). Introduzir relação
   N‑N líder↔célula (modelo `LiderCelula { celulaId, userId }` com `@@unique`),
   mantendo compat durante a transição. `CelulaDetalhe`/seleção usam a lista.
3. **Endereço da célula**: `cidade`, `bairro`, `endereco`, `numero`,
   `complemento?`, `pontoReferencia?`. Só `bairro` aparece na seleção pública.
4. **Perfil do usuário**: `dataNascimento? Date`, `estadoCivil? enum(SOLTEIRO,CASADO,...)`,
   `conjugeId? self-relation` + fluxo de confirmação (duplo opt-in) via
   `VinculoConjuge { solicitanteId, alvoId, status }`.
5. **Onboarding/aprovação**: usuário pendente já grava a célula escolhida
   (`celulaId`) mesmo antes de aprovado; `aprovado` continua controlando o gate.
   Aprovação roteia para líderes daquela célula + admins/super admin.
6. **Notificações**: `Notificacao { id, autorId, escopo(GLOBAL|CELULA), celulaId?, titulo, corpo, criadoEm }` + `NotificacaoLeitura { notificacaoId, userId, lidaEm }` (ou campo lida por usuário).
7. **Banner admin**: `Banner { id, mensagem, ativo, atualizadoPorId, atualizadoEm }` (um ativo por vez) — só ADMIN+ edita.
8. **Presença por QR com janela**: validação de dia/horário no ato do check-in via QR (usar `Encontro` do dia; criar se necessário). Sem novo modelo obrigatório além de checagem.

## Fases

### Fase 0 — Fundações de papéis (SUPER_ADMIN)
- Enum `SUPER_ADMIN`, `PAPEL_RANK`, migration + backfill do dono.
- `criar-admin.js`/entrypoint: o dono nasce SUPER_ADMIN.
- Guardas: `requireRole` já é hierárquico; adicionar helper `podeEditarPapel`.

### Fase 1 — Gestão de usuários (corrige o bug + níveis)
- `/app/usuarios`: além de pendentes, **listar todos** (busca, papel, ativo),
  **trocar nível** (respeitando a regra super/admin), (des)ativar.
- Mostrar a **matriz de permissões** (legenda dos papéis) na tela.
- Backend: `GET /usuarios` já existe; adicionar `PATCH papel` com regra;
  `pendentes` filtra por célula quando o solicitante é LIDER.

### Fase 2 — Cadastro + seleção de célula + aprovação por líder
- Fluxo sem QR: cadastro (nome/email/senha) → **auto-login** → tela obrigatória
  de **seleção de célula** → confirma → **pendente** (só Perfil liberado).
- Seleção: cards das células (bairro, dia, horário, frequência, **fotos+nomes
  dos líderes** com scroll horizontal). Endereço completo NÃO aparece.
- Aprovação: líderes da célula escolhida + admins veem; líder vê só a sua.
- Tela "aguardando aprovação dos líderes" bonita; libera tudo após aprovado.

### Fase 3 — Endereço da célula
- Form de criar/editar célula: cidade, bairro, endereço, número, complemento,
  ponto de referência. `bairro` exposto na seleção.

### Fase 4 — Perfil expandido + cônjuge
- `dataNascimento` (copy: "pra orarmos/cantarmos parabéns no seu aniversário"),
  `estadoCivil`; se CASADO → **vincular cônjuge por e-mail** (Enter → busca; se
  existir, cria solicitação de vínculo; o outro **confirma** — duplo check).
- Sem busca aberta de usuários (trava): só resolve pelo e-mail exato.

### Fase 5 — QR Code: login/cadastro + presença com janela
- Ler QR da célula → se sem conta: cadastro **sem aprovação**, vinculado à célula,
  **presença lançada** se dentro da janela (dia da célula + após horário);
  se com conta: login → presença lançada se dentro da janela.
- Validação de janela server-side (usa dia/horário/frequência da célula).

### Fase 6 — Notificações + banner admin
- Central de notificações (sino) in-app. Envio em massa: ADMIN (global),
  LIDER (membros da sua célula). Banner abaixo do cabeçalho (só ADMIN+).

### Fase 7 — Separação de áreas (admin vs líder/participante)
- Navegação separada: "Administração" (usuários, células, notificações, banner)
  vs "Minha célula" (início, calendário, pedidos, presença, testemunhos, vidas).
  Admin/super admin enxergam ambos; líder vê a área da célula + gestão da célula.

## Decisões tomadas (autônomo, sem perguntar)
- Notificações: começam **in-app** (central + sino). Push/WhatsApp fica p/ depois.
- Cônjuge: vínculo por e-mail exato + confirmação do outro lado (duplo opt-in).
- Janela de presença por QR: válida no **dia da semana da célula** e **a partir
  do horário do encontro** até o fim do dia local (America/Sao_Paulo). Ajustável.
- Papéis: 4 (com SUPER_ADMIN). ADMIN não promove a ADMIN/SUPER_ADMIN.
- E-mail transacional (confirmação/reset): adiado (sem SMTP) — não bloqueia nada.

## PROGRESSO (atualizar a cada commit)
- [x] Plano criado.
- [x] Fase 0 — SUPER_ADMIN (enum+migration, dono promovido no boot, regras de edição de papel, front reconhece super admin como admin).
- [x] Fase 1 — Gestão de usuários (listar todos + busca, trocar nível com regras super/admin, ativar/desativar, legenda de papéis). Bug "não vejo usuários" resolvido.
- [x] Fase 2 (núcleo) — Cadastro com AUTO-LOGIN pendente; tela de seleção de célula
  (cards: bairro, dia/horário, frequência, líderes com scroll horizontal); tela
  "aguardando aprovação"; TRAVA do pendente (backend via requireRole+aprovado com
  leitura fresca do DB, e frontend via gate — só perfil/seleção/aguardando);
  aprovação por LÍDER (só a própria célula) ou ADMIN+; endpoint /celulas/publicas
  e /perfil/celula. `aprovado` default true (só register grava false).
  PENDENTE/DEFERIDO: armazenamento de MÚLTIPLOS líderes (hoje 1 líder por célula;
  a UI já lida com array). Login de pendente é permitido (entra na área travada).
- [x] Fase 3 — Endereço da célula (cidade/bairro/endereço/número/complemento/ponto ref; migration aditiva; form de criar célula). Só bairro exposto na seleção (Fase 2).
- [x] Fase 4 — Perfil + cônjuge. 4a: data de nascimento + estado civil. 4b: vínculo
  de cônjuge por e-mail (case-insensitive) com DUPLO OPT-IN (modelo ConjugeSolicitacao;
  convite→aceite→vínculo mútuo; auto-aceite se convite recíproco; desvincular).
  UI em ConjugeSecao (aparece p/ casado/união estável). Testado local.
- [x] Fase 5 — QR. Cadastro via QR válido = SEM aprovação (aprovado=true) e vinculado
  à célula. Endpoint POST /qr/:qrToken/checkin marca presença no encontro de HOJE se
  na janela (após o horário; TZ SP). Front chama check-in em QrLanding (logado),
  Register (pós-cadastro QR) e Login (?celula). Cadastro pelo site (sem QR) segue
  pendente. FALTA (refino): passar qrToken no link "Criar conta" do Login.
- [x] Fase 6 — 6a BANNER administrativo. 6b NOTIFICAÇÕES in-app: modelo Notificacao
  (escopo GLOBAL|CELULA) + leitura via User.notificacoesLidasEm; rotas GET /notificacoes
  (lista+naoLidas+podeEnviar), POST /notificacoes/ler, POST /notificacoes (ADMIN global;
  LÍDER só da própria célula). Sino no header (badge, painel, compor pra quem pode enviar).
- [x] Fase 7 — Separação de áreas: nav agrupada (Administração | Minha célula) com
  divisor; admin que participa de uma célula também vê a home/área de participante
  (InicioOuCelulas: admin SEM célula vai p/ Administração; COM célula vê AppHome).

> Observação do dono: virão mais requisitos em áudios futuros — manter o plano
> extensível.

## CONCLUSÃO (2026-07-02)
Todas as fases 0–7 implementadas, com CI verde e deploy em produção
(https://celula.nexusai360.com) verificado a cada fatia. Pendências residuais
(não bloqueiam): SMTP/e-mail transacional, múltiplos líderes por célula (storage),
qrToken no link "Criar conta" do Login, agrupamento visual do NavDrawer mobile.
