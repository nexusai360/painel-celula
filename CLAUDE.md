# Instruções do projeto — Painel de Célula

> Instruções específicas deste repositório. Elas **complementam** e, quando houver
> conflito de fluxo local, **têm precedência** sobre as instruções globais do usuário
> para este projeto.

## Política de branch — TRABALHAR DIRETO NA `main`

**Decisão do dono (durável):** neste projeto **todo o trabalho é feito direto na
`main`**. **NÃO** criar worktree, **NÃO** criar `branches/…`, **NÃO** abrir branch de
feature — a menos que o dono **peça explicitamente** ("cria uma branch para isso",
"faz numa worktree", etc.).

- Sem pedido explícito → edite, teste e **commite direto na `main`**.
- Branch/worktree de standby é **exceção sob demanda**, não o padrão.
- O protocolo global de worktrees multi-agente (`~/.claude/CLAUDE.md`) **não se aplica
  aqui** salvo solicitação expressa. Este projeto se enquadra na exceção "trabalha
  direto na main aqui".
- Deploy é por push na `main` (CI → GHCR → Shepherd). Portanto commits na `main`
  devem estar verdes (tsc/lint/testes) antes do push.

## Metodologia (obrigatória, sem atalhos)

Seguir a metodologia do usuário à risca, **sem review fake nem pular etapas**:
`brainstorming → spec (v1 → 2 reviews adversariais Opus → v-final) → writing-plans
→ review do plano → execução TDD → testes verdes → verificação/E2E → commit`.

- UI/frontend: **`ui-ux-pro-max` é obrigatório** e feito **inline** (nunca delegado a subagente).
- Modelo **sempre Opus**, inclusive em todo subagente/workflow.
- Verdade contra o dado real: E2E contra o backend real antes de declarar pronto.

## Fatos do projeto (para retomada rápida)

- **Stack:** monorepo npm workspaces — `apps/api` (Fastify + Prisma/Postgres) e
  `apps/web` (React 19 + Vite + Tailwind v4, sem shadcn/base-ui; primitivos próprios
  em `apps/web/src/components/ui/`). `framer-motion`, `react-hook-form`, `zod`, `lucide`.
- **Rodar local:** `npm run app:up` → **http://localhost:3200** (porta canônica).
  `npm test` roda api + web.
- **Papéis:** `MEMBRO ⊂ LIDER ⊂ ADMIN ⊂ SUPER_ADMIN`.
- **Super Admin / dono:** `nexusai360@gmail.com` (já provisionado — confirmar antes de recriar).
- **Referências visuais:** `../nexus-insights` e `../../Clientes/Matrix Fitness Group/API e MCP Odoo`
  (Tailwind v4 + tokens; copiar *fórmulas* de chip/tabs/card/animações e a paleta
  semântica de status/roles — **manter a marca prata/grafite do Painel**, não o violeta).
- **Docs de estado:** `STATUS.md`, `DEPLOY.md`, `docs/superpowers/plans/…`,
  `docs/superpowers/specs/…`.
