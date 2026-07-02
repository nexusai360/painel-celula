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
- **FASE B** — Liderança N:N + admin sem célula + aprovação de célula ← EM ANDAMENTO
  - [ ] B1 schema: junção `lideres` N:N (remove liderId/celulaLiderada) + `Celula.status` + `criadaPorId` + migração/backfill
  - [ ] B2 escopo.js: podeGerenciarCelula por junção; callers (celulas/presenca/encontros)
  - [ ] B3 rotas célula: include lideres; POST/DELETE lideres; criar por lider/pastor/admin (pendente); GET pendentes + POST aprovar; publicas exigem APROVADA
  - [ ] B4 rebaixamento travado (>1 celula bloqueia; 1 vira membro; 0 livre) em PATCH qualificacao
  - [ ] B5 admin sem celula (TopBar/AppHome/ContextSwitcher)
  - [ ] B6 frontend: Celulas multi-lider (add/remove), CelulaDetalhe/MembrosPanel, aprovacao de celulas, NovaCelula p/ lider
  - [ ] B7 aprovar/recusar pendente por celulas lideradas (junção)
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
