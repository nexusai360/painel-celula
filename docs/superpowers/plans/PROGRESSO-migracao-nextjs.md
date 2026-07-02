# PROGRESSO — Migração para Next.js + hotfixes (2026-07-02)

Ponto de retomada da sessão autônoma. Ler junto com a spec/plano em
`docs/superpowers/specs/2026-07-02-migracao-nextjs-*.md` e
`docs/superpowers/plans/2026-07-02-migracao-nextjs-plan.md`.

## Decisões do dono (duráveis)
- **Migrar** o Painel de Célula para a MESMA stack do `nexus-insights`:
  **Next.js 16 App Router + TypeScript + shadcn/ui (style base-nova, lucide) +
  next-auth + Prisma**, com a **API Fastify dobrada para dentro do Next**
  (`src/app/api/**`), **mesmo Postgres e mesmo schema Prisma** (sem migração de
  dados; next-auth Credentials validando os hashes **bcrypt** já existentes em
  `senhaHash`).
- **Greenfield** ao lado do atual (`apps/web-next`), **cutover** só ao atingir
  paridade. Produção atual (`celula.nexusai360.com`, push→GHCR→Shepherd) fica
  intocada até o cutover.
- **Navegação alvo: SIDEBAR** agrupada (como nexus-insights). Manter a **marca
  prata/grafite** do Painel (não o tema do nexus-insights).
- Entregar **tudo** (hotfix + migração), sem parar; handoff automático ao chegar
  ~80% de contexto.
- Referência de stack: `/Users/joaovitorzanini/Developer/Claude Code/Nexus AI/Projetos Internos/nexus-insights`.

## Já entregue e LIVE nesta jornada (main, deployado)
1. Backend: `POST /usuarios` (criar), `PATCH /usuarios/:id/senha` (reset),
   validação de WhatsApp, payload expõe `minhasCelulas` (lideradas ∪ criadas).
2. Web: reforma da tela de Usuários (lista enxuta + modal redesenhado, e-mail
   editável, reset de senha, qualificação/nível em linhas, Popover via portal).
3. DateTimePicker: abre no clique do input, jornada ano→mês→dia (aniversário),
   portal. Perfil: WhatsApp com máscara+validação.
4. Aba "Criar usuário".
5. `criar-admin.js` não sobrescreve mais nome/qualificação/senha (fim do "nome
   volta ao padrão no deploy"). E2E validado contra o banco real (container
   reconstruído): login/minhasCelulas(4)/criar/reset/duplicado/inválido OK; nome
   do dono preservado. Super admin ficou como **Pastor** (pedido do dono).
6. Hotfix UX: cabeçalho enxuto (menu "Mais" p/ ações de liderança), Presença
   restaurada para líder-sem-vínculo (usa célula principal), ícone de Testemunhos
   corrigido (HeartHandshake).

## Em andamento
- **Workflow** `migracao-nextjs-spec-plano` (background) gravando:
  - `docs/superpowers/specs/2026-07-02-migracao-nextjs-referencia.md`
  - `docs/superpowers/specs/2026-07-02-migracao-nextjs-design.md` (spec v1→R1→v2→R2→v3)
  - `docs/superpowers/plans/2026-07-02-migracao-nextjs-plan.md` (plano v1→R1→v2→R2→v3)

## Próxima ação concreta (retomar aqui)
1. Ler os 3 docs acima quando o workflow terminar.
2. Executar **Fase 0 (scaffold)** do plano em `apps/web-next`: package.json com as
   deps do nexus-insights, next.config/tsconfig/postcss/components.json,
   `globals.css` com tokens da marca prata/grafite, `lib/utils` (cn), `lib/db`
   (Prisma singleton no MESMO `DATABASE_URL`), copiar `schema.prisma`, next-auth
   Credentials+bcrypt, middleware, layout raiz + providers (sonner/session),
   **sidebar** shell, página de login + 1 página protegida (prova de auth).
   Reusar componentes shadcn `ui/*` do nexus-insights via `cp` (custo zero de
   contexto). Verificar com `next build`.
3. Portar por área independente (paralelizável via workflow): auth/RBAC →
   usuários (criar/reset) → células/cronograma/encontros → presença/QR →
   pedidos → testemunhos → notificações/banners → perfil/cônjuge → Google
   Calendar → onboarding público.
4. Cutover só ao atingir paridade (Dockerfile/entrypoint novos; apontar domínio).

## Guardrails
- UI **inline** com `ui-ux-pro-max`; modelo **Opus** em tudo; TDD onde couber.
- Commits atômicos na `main` (projeto trabalha direto na main). Deploy = push.
- Não quebrar produção atual; `apps/web-next` é isolado até o cutover.
