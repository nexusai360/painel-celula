# PROGRESSO — Refactor papéis / liderança N:N / segmentação

> Ponto de retomada. Atualizado a cada task/commit. Spec v5 final:
> `docs/superpowers/specs/2026-07-02-lideranca-nn-e-segmentacao-publico-design.md`.
> Modo autônomo total autorizado pelo dono (implementar tudo A→B→C + **deploy** ao final e avisar).
> Trabalho direto na `main`, live 3200. `npm test -w apps/web` = 53 verdes (baseline).

## Estado
- **FASE A** — Nível × Qualificação — plano: `docs/superpowers/plans/2026-07-02-fase-a-nivel-x-qualificacao.md`
  - [ ] T1 shared: `roles.js` (nível) + `qualificacao.js` + testes
  - [ ] T2 prisma: enums + colunas + migração/backfill (mantém `papel`)
  - [ ] T3 api `lib/roles.js`: requireRole(nível) + requireAuth + requireGestor
  - [ ] T4 scripts de provisionamento (seed/criar-admin/garantir-super-admin)
  - [ ] T5 rotas: guards + desacoplar célula↔papel + PATCH nivel/qualificacao + aprovar/recusar + JWT
  - [ ] T6 web `lib/papeis.js`: CORES_NIVEL + CORES_QUALIFICACAO
  - [ ] T7 web componentes: Nivel/Qualificacao Badge+Select
  - [ ] T8 web telas: card (tag qualif + ícone nível hover), aprovação c/ qualificação agrupada, modal editar, guards, Perfil/AvatarMenu
  - [ ] T9 drop `papel` + enum `Papel`
- **FASE B** — Liderança N:N + admin sem célula + aprovação de célula — (após A)
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
