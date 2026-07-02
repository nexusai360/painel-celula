# PROGRESSO — Reforma UI/RBAC/Células (ponto de retomada)

> Atualizar a CADA task/commit. Ao retomar: ler este arquivo + o plano v3
> (`2026-07-02-reforma-ui-rbac-celulas.md`) + a spec v3. Trabalho **direto na `main`**.
> Local: `npm run app:up` → http://localhost:3200. Testes: `npm test`. Frontend: skill `ui-ux-pro-max`.

## Estado
- **Spec v3** e **Plano v3** finalizados e commitados (ciclo v1→R1→v2→R2→v3 nos dois).
- **Implementação:** INICIANDO Fase 0.

## Checklist de fases (marcar ao concluir)
- [x] **Fase 0** — Fundação de UI (todos os primitivos + libs, 47 testes web verdes, build ok)
- [x] **Fase 1** — RBAC/hierarquia (podeEditarPapel no shared, guard PUT, garantir-super-admin)
- [x] **Fase 2** — Diagnóstico "admin não vê usuários" (era conta inativa; reativada no DB)
- [x] **Fase 3** — Shell admin (AdminLayout rail) + Usuários reformada (abas/chips/RoleSelect/linha de dados/massa/skeleton/empty/erro/toast) + AdminAvisos + ContextSwitcher no TopBar + Aprovações do líder + redirects + banner só-exibe + largura por rota. Build+47 testes verdes.
- [x] **Fase 4** — Células (cep+migration, coerção, refine TZ-safe verificado, form com CEP/cidade/sem-número/placeholders, fix criação)
- [x] **Fase 5** — Perfil estado civil por checkbox (map-back seguro). FALTA 5.2 (/cadastro signup) — pendência menor
- [x] **Fase 6** — Onboarding: CelulaPicker sofisticado (bonito sem foto/líder) + Aguardando com refresh de status
- [x] **Fase 7** — QR ramo "com conta" mostra resultado do check-in via toast
- [~] **Fase 8** — PARCIAL: design-system MASTER destilado ✅; E2E backend real ✅ (login super, cria célula 201, incoerente 400, migration cep aplicada, super-admin no entrypoint). **FALTA:** migrar `<select>/<input>` crus (CronogramaForm, Calendario, Pedidos, Testemunhos) para primitivos; reformar /cadastro (signup) [Task 5.2]; screenshots visuais.

## App LIVE
Plataforma reformada rodando em **http://localhost:3200** (container rebuild com o código novo).
Deploy real validado: migrate deploy + garantir-super-admin no entrypoint OK.
Login para revisar como dono: nexusai360@gmail.com / nexus.AI@360 (SUPER_ADMIN).

## Log (task → commit)
- 0.-1 infra teste React (jsdom+testing-library, coleta src/) → 63f1696
- 0.0 `.chrome` + `.foco` no index.css → e4a7c5f
- 1.1 RBAC único em @icelula/shared (podeEditarPapel/opcoesDePapel/podeAgirSobre) → e3083f3
- 0.2 papeis.js re-exporta shared + CORES_PAPEL/CORES_STATUS/statusDeUsuario → 9a3b55a
- 0.3/0.4/0.5 mascaras/avatarCor/cidades → 06f4ac1
- 0.6/0.11/0.14 Checkbox, RoleBadge/StatusBadge, Skeleton/EmptyState/ErrorState → 5199e0d(approx)
- 0.8/0.15 Tabs + Toast (montado no App) → commit
- 0.1/0.9/0.7 useOverlayDismiss (extraído do Sheet) + Modal + Popover → commit
- 0.10/0.12/0.13 Combobox + RoleSelect + ContextSwitcher → commit (FASE 0 COMPLETA, build vite ok)
- 1.2 guard PUT /usuarios/:id (admin não edita admin/super, self-exempt) + testes CI → commit
- 1.3 garantir-super-admin.js + npm admin:super + entrypoint (verificado UPDATE 1 no DB) → commit

### Próximo: Fase 2 (rápida) → Fase 3 (shell admin + Usuários reformada, o grande payoff visível)

### NOTA ambiente
- Testes de ROTA da API (que tocam Postgres) NÃO rodam do host macOS (Docker Desktop não expõe o DB ao host; só containers na rede-docker autenticam). Rodam no CI. Validar rotas via app real em localhost:3200. Testes de lógica pura (shared/lib/componentes jsdom) rodam local e estão verdes.
- Orphan `podeEditarPapel` em `pages/Usuarios.jsx:86` será removido na Fase 3 (quando a tela é substituída por AdminUsuarios).

## Decisões-chave (não reabrir)
- Admin nomeia até Admin; **mexer em Admin/Super é só do Super Admin**. Super = `nexusai360@gmail.com`.
- RBAC (`podeEditarPapel`) é fonte única em `@icelula/shared` (front+back importam).
- QR check-in **intocado**; **não** validar diaSemana no check-in; validar coerência só na CRIAÇÃO de célula (TZ-safe via `Date.UTC` da string).
- Estado civil grava **só em transição** do checkbox (marcar→CASADO, desmarcar→SOLTEIRO).
- Marca **prata cromada** (`.chrome`); design-system MASTER só na Fase 8.
- Testes web co-locados em `src/`, jsdom + @testing-library (Task 0.-1).
