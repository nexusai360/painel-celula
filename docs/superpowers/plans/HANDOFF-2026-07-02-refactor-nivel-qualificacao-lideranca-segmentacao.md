# HANDOFF — Refactor Nível×Qualificação + Liderança N:N + Segmentação (2026-07-02)

> Sessão nova: leia este arquivo + `PROGRESSO-refactor-papeis-lideranca-segmentacao.md` +
> a spec `docs/superpowers/specs/2026-07-02-lideranca-nn-e-segmentacao-publico-design.md` (v5 final).
> **Trabalho direto na `main`** (política do projeto). App local: `npm run app:up` → http://localhost:3200.

## ✅ Estado: as 3 fases estão IMPLEMENTADAS, VALIDADAS E2E e DEPLOYADAS EM PRODUÇÃO
Produção: **https://celula.nexusai360.com** (commit `228a394` no ar, verificado: login retorna
`nivelAcesso`/`qualificacao`, `papel` eliminado, 5 usuários reais migrados, célula/banner/notificação OK).

- **Fase A — Nível de acesso × Qualificação.** Enums `NivelAcesso {USUARIO,ADMIN,SUPER_ADMIN}` e
  `Qualificacao {CONVIDADO,MEMBRO,LOUVOR,COLIDER,LIDER,PASTOR}`. Coluna `papel` + enum `Papel` DROPADOS.
  `requireGestor`/`requireAuth` no lugar de `requireRole('LIDER'/'MEMBRO')`. Aprovação escolhe qualificação
  (default MEMBRO, agrupada por célula). Card: tag de qualificação + ícone de nível no hover. Modal editar
  usuário (PATCH `/usuarios/:id/nivel` e `/qualificacao`, PUT dados). Admin/super trocam a própria qualificação.
- **Fase B — Liderança N:N + aprovação de célula.** Junção `lideres` (removidos `Celula.liderId @unique` e
  `User.celulaLiderada`). `escopo.podeGerenciarCelula` por junção. `POST/DELETE /celulas/:id/lideres`.
  Criar célula: ADMIN (aprovada) ou LÍDER/PASTOR (PENDENTE até admin aprovar; criador entra na junção).
  `GET /celulas/pendentes` + `POST /celulas/:id/aprovar`. Trava de rebaixamento (>1 célula bloqueia; 1 vira
  membro; 0 livre). Frontend: gerência multi-líder (chips add/remove), aba Aprovações, rota "Criar célula".
- **Fase C — Segmentação + banner carrossel + notificação por item.** `lib/alvo.js`
  (`montarWhereAlvo`/`normalizarAlvo`/`alvoInvalido`). Banner/Notificacao com 3 eixos (`celulas/qualificacoes/
  niveis` × `*Todas`+`*Alvo`); AND; `Todas=false`+vazio bloqueia; SUPER casa ADMIN; célula por membro OU
  liderança. Banner: CRUD, `expiraEm` obrigatória, `BannerBar` carrossel (auto 10s/pausa hover/clique/
  indicador/reduced-motion). Notificação: `NotificacaoLeitura` (leitura por item) + `/:id/ler` + `/ler-tudo`
  + modal no sino. `SeletorPublico` (3 eixos; níveis só p/ admin). AdminAvisos reescrito.

## Metodologia cumprida
Spec `v3→R1→v4→R2→v5` (2 reviews adversariais reais). Execução TDD, ~70 commits atômicos na `main`.
Migrações (17 no total) validadas num **DB FRESCO** (`prisma migrate deploy` limpo — por isso prod migrou
sobre dados reais sem problema). Cada fase validada E2E local + prod.

## ⚠️ ÚNICO PENDENTE: CI verde (dívida de TESTE, não de app)
- `ci.yml` está **vermelho** nos **testes de ROTA da API** — eles ainda usam o modelo antigo
  (`papel`, `liderId`, endpoints removidos). **Não bloqueia o deploy** (`build.yml` é independente do
  `ci.yml`) e **não afeta produção** (app validado E2E).
- Arquivos a migrar: `apps/api/src/routes/{celulas,usuarios,presenca,encontros,testemunhos,googleAuth}.test.js`
  + `lib/sync/calendarSync.test.js` + `lib/encontros.service.test.js`. Unit puros já verdes
  (`escopo/roles/qualificacao/usuarios(lib)/cronograma/password` + `packages/shared`).
- **Como rodar os testes da API LOCALMENTE** (host alcança o docker DB via vitest):
  1. `docker exec icelula-db psql -U icelula -d icelula -c "DROP DATABASE IF EXISTS testfresh; CREATE DATABASE testfresh;"`
  2. `docker compose --profile full run --rm --no-deps -e DATABASE_URL="postgresql://icelula:icelula@db:5432/testfresh?schema=public" --entrypoint sh app -c "cd apps/api && npx prisma migrate deploy"`
  3. `DATABASE_URL="postgresql://icelula:icelula@localhost:5432/testfresh?schema=public" npx vitest run apps/api`
- **Achado a investigar primeiro:** rodando `pedidos.test.js` isolado dá `PrismaClientInitializationError`
  no `beforeAll` ("Can not use undefined value within array"). NÃO é só `papel` — suspeita: client Prisma +
  colunas array-enum `@default([])` + paralelismo do vitest no mesmo DB. Tentar `--no-file-parallelism` e/ou
  isolar/reset por arquivo antes de migrar o setup (papel→nível/qualif; `celula.update({liderId})`→
  `lideres:{connect:{id}}`; `PATCH /papel`→`/nivel`+`/qualificacao`; `POST /celulas/:id/lider`→`/lideres`).
- Quando os testes ficarem verdes: `git push origin main` (re-deploy idêntico + CI verde).

## Follow-ups menores (opcionais)
- Expor UI de envio de **notificação para líderes** (hoje o composer vive em AdminAvisos/SoAdmin; o backend
  já aceita líder enviar, travado às células dele).
- Limpar helpers JS legados mortos (`CORES_PAPEL`, `RoleBadge`, `podeEditarPapel`, etc.) — inócuos.

## Comandos úteis
- `npm run app:up` (rebuild+redeploy local 3200); `npm test -w apps/web` (53 verdes); inspeção DB:
  `docker exec icelula-db psql -U icelula -d icelula`. Migração via docker exec + `prisma migrate resolve`
  quando aplicar manual (evita P3009).
