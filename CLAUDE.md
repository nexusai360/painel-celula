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

## Metodologia (obrigatória, sem atalhos, SEM review fake)

### Ciclo de review SEQUENCIAL (regra do dono — nunca em paralelo)

O ciclo de refino de **spec** e de **plano** é **sequencial e cumulativo**, cada review
sempre sobre a versão MAIS RECENTE — **jamais** duas reviews em paralelo sobre a mesma versão:

```
v1  ──►  REVIEW 1 (perícia profunda e completa da v1: caçar erro, lacuna, o que
              foi esquecido, o que não bate com o pedido; perícia abrangente)
    ──►  v2  (reescrita incorporando TODOS os achados da Review 1)
    ──►  REVIEW 2 (pente fino sobre a v2 — ainda MAIS aprofundada, criteriosa e
              detalhista que a Review 1; buscar precisão fina, não repetir a R1)
    ──►  v3  (versão FINAL — não há Review 3; segue adiante)
```

- **Spec:** `v1 → R1 → v2 → R2 → v3(final)` → então vai para o **plano**.
- **Plano:** `v1 → R1 → v2 → R2 → v3(final)` → então vai para a **implementação**
  (tasks/fases/ondas conforme definido no plano).
- Review 2 é **sempre sobre a v2**, nunca sobre a v1. Review é **genuína e adversarial**
  (caçar erro real), em **Opus**. Pode usar múltiplas lentes numa mesma review (ex.:
  fidelidade ao pedido + corretude técnica) — isso torna a perícia mais completa, mas
  continua sendo UMA rodada de review sobre aquela versão.
- **Proibido:** review fake, "fingir" que revisou, pular etapa, ou rodar R1 e R2 juntas.

### Demais regras

- Fluxo completo: `brainstorming → spec(v1→R1→v2→R2→v3) → writing-plans(v1→R1→v2→R2→v3)
  → execução TDD → testes verdes → verificação/E2E → commit`.
- UI/frontend: **SEMPRE invocar a skill `/ui-ux-pro-max:ui-ux-pro-max`** antes de qualquer
  trabalho de frontend (layout, componente, tela, estilo, design). É **obrigatório e
  inegociável em TODA tarefa de frontend**, e feito **inline** na sessão principal
  (nunca delegado a subagente). Regra durável do dono.
- Modelo **sempre Opus**, inclusive em todo subagente/workflow.
- **Verdade contra o dado real:** confrontar premissas com `SELECT` no banco real antes de
  cravá-las na spec; E2E contra o backend real antes de declarar pronto.

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
