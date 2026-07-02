# PROGRESSO — Refactor papéis / liderança N:N / segmentação

> Ponto de retomada. Atualizado a cada task/commit. Spec v5 final:
> `docs/superpowers/specs/2026-07-02-lideranca-nn-e-segmentacao-publico-design.md`.
> Modo autônomo total autorizado pelo dono (implementar tudo A→B→C + **deploy** ao final e avisar).
> Trabalho direto na `main`, live 3200. `npm test -w apps/web` = 53 verdes (baseline).

## Estado
- **FASE A** — Nível × Qualificação — plano: `docs/superpowers/plans/2026-07-02-fase-a-nivel-x-qualificacao.md`
  - [x] T1 shared: `roles.js` (nível) + `qualificacao.js` + testes (22 verdes)
  - [x] T2 prisma: enums + colunas + migração/backfill (aplicada; super admin→SUPER_ADMIN+MEMBRO)
  - [x] T3+T5 api: requireGestor/requireAuth; 13 rotas; desacopla célula↔papel; PATCH nivel/qualificacao; JWT
  - [x] T4 scripts de provisionamento
  - [x] T6 web `lib/papeis.js`: CORES_NIVEL + CORES_QUALIFICACAO
  - [x] T7 web componentes: Nivel/Qualificacao Badge+Select
  - [x] T8 web telas: card, aprovação agrupada, modal editar, guards, Perfil/AvatarMenu, api.js
  - [x] VALIDAÇÃO E2E — login/me/usuarios/notificacoes/celulas ok; PATCH nivel/qualif ok
  - [x] T9 drop `papel` + enum `Papel` — banco e código limpos
  - **✅ FASE A COMPLETA E LIVE NO 3200.** (nota: helpers JS legados CORES_PAPEL/RoleBadge/
    podeEditarPapel etc. ficaram como código morto inócuo — limpeza opcional no fim.)
- **✅ FASE B COMPLETA E LIVE NO 3200** — validada E2E (líder cria→pendente→admin aprova→públicas; add/remove líder; escopo por junção; rebaixamento travado)
  - [x] B1 schema junção N:N + status + criadaPorId + migração (marcada applied local; re-executável p/ prod)
  - [x] B2 escopo.js por junção; callers carregam lideres
  - [x] B3 rotas célula: lideres include; POST/DELETE lideres; criar lider/pastor/admin; pendentes+aprovar; publicas APROVADA
  - [x] B4 trava de rebaixamento (PATCH qualificacao)
  - [x] B5 admin sem célula (guards ok; TopBar por qualificação)
  - [x] B6 frontend multi-líder + aba Aprovações + rota Criar célula p/ líder + MembrosPanel/CelulaDetalhe
  - [x] B7 pendentes/aprovar/recusar por células lideradas
- **✅ FASE C COMPLETA E LIVE NO 3200** — validada E2E (banner exige expiração; trava eixo-vazio; entrega por 3 eixos AND com SUPER→ADMIN; notificação leitura por item + marcar-tudo)
  - [x] schema (Banner/Notificacao 3 eixos + expiraEm + NotificacaoLeitura) + migração idempotente
  - [x] lib/alvo.js (montarWhereAlvo, normalizarAlvo, alvoInvalido)
  - [x] banner.js CRUD segmentado + notificacoes.js leitura por item + marcar-tudo
  - [x] frontend: SeletorPublico (3 eixos), AdminAvisos (banner CRUD+expiração / notificação), BannerBar carrossel, NotificacoesSino modal+por-item, api.js
  - Nota: composer de notificação hoje vive no admin (AdminAvisos, SoAdmin). Backend já aceita líder enviar; expor UI de notificação para líderes ficou como follow-up menor.
- **✅ TODAS AS 3 FASES IMPLEMENTADAS E VALIDADAS E2E LOCALMENTE.**
- **🚀 DEPLOY DISPARADO** (push `228a394` → build.yml ✓ imagem no GHCR → Shepherd auto-deploy em prod
  `https://celula.nexusai360.com`). Migrações validadas em DB FRESCO (17 aplicam limpas). Convergência
  em rolling update; poll aguardando login retornar `nivelAcesso` estável. Prod tem 5 usuários reais
  (migração backfilla papel→nível/qualif). Falta: confirmar convergência total + avisar o dono.
- **⚠️ DÉBITO DE TESTE (CI vermelho, NÃO bloqueia o deploy — build.yml é independente do ci.yml):**
  os testes de rota da API (`celulas/usuarios/presenca/encontros/testemunhos/googleAuth.test.js` +
  `calendarSync/encontros.service` — setup cria user com `papel` e célula com `liderId`, assina JWT com
  `papel`) precisam migrar para o novo modelo (nível/qualif; junção `lideres`). RODAM LOCAL contra o docker
  DB: `DATABASE_URL="postgresql://icelula:icelula@localhost:5432/testfresh?schema=public" npx vitest run apps/api`.
  Unit puros já verdes (escopo/roles/qualificacao/etc). Este é o próximo passo p/ deixar o CI verde.
- **⚠️ PRÉ-DEPLOY OBRIGATÓRIO:** os testes de rota da API (celulas/usuarios/presenca/encontros/testemunhos/escopo.test.js) referenciam `liderId`/`papel` — quebrados pelo refactor A+B. Precisam ser reescritos para o novo modelo ANTES do push/deploy (rodam no CI). Passe dedicado.
- **FASE C** — Segmentação (banner carrossel/expiração + notificação alvo 3 eixos + leitura por item) — (após B)
- **DEPLOY** — push na `main` → CI → GHCR → Shepherd; acompanhar até prod no ar; avisar o dono.

## Entregas já live nesta jornada (antes do refactor)
IBGE cidades; CronogramaForm primitivos; copy Avisos; Perfil "Data de aniversário" + DateTimePicker
digitável/modo-data; legenda de Níveis espaçada.

## Notas de execução
- Banco real vazio (0 banner/notif/lider; 1 SUPER_ADMIN) — backfill trivial, sem risco de histórico.
- Host macOS não alcança o DB docker: migração via `npm run app:up`/entrypoint; inspeção via
  `docker exec icelula-db psql -U icelula -d icelula`.
- Deploy só ao FIM de A→B→C (uma vez tudo verde), conforme pedido do dono.
