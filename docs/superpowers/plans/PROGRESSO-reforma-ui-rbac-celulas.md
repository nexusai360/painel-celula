# PROGRESSO — Reforma UI/RBAC/Células (ponto de retomada)

> Atualizar a CADA task/commit. Ao retomar: ler este arquivo + o plano v3
> (`2026-07-02-reforma-ui-rbac-celulas.md`) + a spec v3. Trabalho **direto na `main`**.
> Local: `npm run app:up` → http://localhost:3200. Testes: `npm test`. Frontend: skill `ui-ux-pro-max`.

## Estado
- **Spec v3** e **Plano v3** finalizados e commitados (ciclo v1→R1→v2→R2→v3 nos dois).
- **Implementação:** INICIANDO Fase 0.

## Checklist de fases (marcar ao concluir)
- [ ] **Fase 0** — Fundação de UI (0.-1 infra teste → 0.0 css → 0.1..0.15 primitivos)
- [ ] **Fase 1** — RBAC/hierarquia (podeEditarPapel no shared, guard PUT, garantir-super-admin)
- [ ] **Fase 2** — Diagnóstico "admin não vê usuários" (conta inativa → reativar)
- [ ] **Fase 3** — Shell admin + Usuários + Aprovações (telas antes dos redirects)
- [ ] **Fase 4** — Células (cep, refine TZ-safe, form multi-step, fix)
- [ ] **Fase 5** — Perfil + /cadastro (estado civil checkbox)
- [ ] **Fase 6** — Onboarding & CelulaPicker
- [ ] **Fase 7** — QR (ramo com conta)
- [ ] **Fase 8** — Polimento, migração de crus, design system MASTER

## Log (task → commit)
- 0.-1 infra teste React (jsdom+testing-library, coleta src/) → 63f1696
- 0.0 `.chrome` + `.foco` no index.css → e4a7c5f
- 1.1 RBAC único em @icelula/shared (podeEditarPapel/opcoesDePapel/podeAgirSobre) → e3083f3
- 0.2 papeis.js re-exporta shared + CORES_PAPEL/CORES_STATUS/statusDeUsuario → 9a3b55a
- 0.3/0.4/0.5 mascaras/avatarCor/cidades → 06f4ac1
- 0.6/0.11/0.14 Checkbox, RoleBadge/StatusBadge, Skeleton/EmptyState/ErrorState → (commit atual)

### FALTA na Fase 0 (próximos)
- 0.7 Popover, 0.8 Tabs, 0.9 Modal (usa hook 0.1), 0.10 Combobox, 0.12 RoleSelect (usa Popover+Sheet), 0.13 ContextSwitcher, 0.15 Toast+provider, 0.1 useOverlayDismiss (extrair do Sheet).
- Depois: Fases 1–8 conforme plano v3.

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
