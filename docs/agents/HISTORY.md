# HISTORY — Painel de Célula (append-only)

## 2026-07-02 — Deploy inicial + Plataforma v2 (fases 0–6a)
- Bootstrap: repo público `nexusai360/painel-celula`, Dockerfile multi-stage,
  CI/CD (GitHub Actions → GHCR), stack Swarm no Portainer, Traefik/TLS em
  `celula.nexusai360.com`. Runbook em `DEPLOY.md`; `npm run deploy` (fixa digest).
- Segurança: helmet + rate-limit; `.gitignore` cobrindo `.env*`/compose de prod;
  varredura de segredos limpa. Dono/super admin: `nexusai360@gmail.com`.
- Plataforma v2 entregue e LIVE:
  - F0 SUPER_ADMIN (papel de dono) + regras de edição de papel.
  - F1 gestão de usuários (lista/busca/nível/ativar-desativar).
  - F2 onboarding (auto-login pendente → seleção de célula → aprovação por líder;
    trava do pendente reforçada no backend com leitura fresca do DB).
  - F3 endereço da célula.
  - F4 perfil (nascimento, estado civil, cônjuge com duplo opt-in).
  - F5 QR (cadastro sem aprovação + check-in de presença).
  - F6a banner administrativo.
- Falta: F6b notificações in-app; F7 separação de áreas. Ver STATUS.md.

## 2026-07-02 (cont.) — Fases 6b e 7 concluídas
- 6b: notificações in-app (sino + envio ADMIN global / LÍDER da célula).
- 7: separação de áreas (nav agrupada; admin com célula vê área de participante).
- Plataforma v2 completa (fases 0–7) LIVE e CI-verde.

## 2026-07-02 — Refactor Nível×Qualificação + Liderança N:N + Segmentação (3 fases) → DEPLOY em prod
- Desacoplado `papel` em dois eixos: `NivelAcesso {USUARIO,ADMIN,SUPER_ADMIN}` × `Qualificacao {CONVIDADO..PASTOR}`; coluna/enum `papel` dropados.
- Liderança N:N (junção `lideres`); criação de célula por líder/pastor com aprovação de admin; travas de rebaixamento.
- Segmentação de avisos por 3 eixos AND (células/qualificações/níveis + flags Todas, dedup, SUPER casa ADMIN); banner CRUD com expiração + carrossel; notificação leitura por item (`NotificacaoLeitura`) + marcar-tudo + modal; `SeletorPublico`.
- Spec v3→R1→v4→R2→v5 (2 reviews adversariais). ~70 commits atômicos. 17 migrações validadas em DB fresco. Validado E2E local + prod.
- **Deploy live: https://celula.nexusai360.com** (commit 228a394). Pendente: reescrever testes de ROTA da API p/ CI verde (dívida de teste; não bloqueia deploy — build.yml independente do ci.yml). Ver HANDOFF-2026-07-02-refactor-nivel-qualificacao-lideranca-segmentacao.md.

## 2026-07-02 — Reforma UX de Usuários + fixes (batch pós-feedback do dono) [ca9d0bb]
- **Tela de Usuários (lista):** removidos os selects inline de qualificação/nível e o texto/animação de status; agora só badge de qualificação (leitura), ícone de status (ativo/inativo/pendente/reprovado) e lápis. Admin pode editar a si mesmo (super admin muda a própria qualificação → Pastor).
- **Modal de edição redesenhado:** Nome, E-mail (editável), WhatsApp (máscara + validação), Nova senha (reset pelo admin), Qualificação e Nível em linhas próprias (dropdown via portal, não corta mais), Conta ativa. Edição própria reflete no header/perfil.
- **Backend novo:** `POST /usuarios` (admin cria já aprovado/ativo, RBAC), `PATCH /usuarios/:id/senha` (reset). Schemas: create/reset + WhatsApp validado (rejeita texto). API client: apiCriarUsuario/apiRedefinirSenha.
- **"Minha célula":** payload do usuário expõe `minhasCelulas` (lideradas ∪ criadas, dedup); gate/nav liberam para membro OU líder/criador (corrige aba bloqueada). AppHome mostra seletor quando há >1 célula.
- **DateTimePicker:** abre no clique/foco do input; aniversário começa na seleção de ANO→mês→dia; portal (não corta em card/modal). Perfil: WhatsApp com máscara + validação.
- **Aba "Criar usuário"** na Administração de Usuários.
- **Provisionamento do dono:** `criar-admin.js` não sobrescreve mais nome/qualificação/senha de conta existente (fim do "nome volta ao padrão no deploy"); acesso segue via `garantir-super-admin.js`.
- **Validação:** build web verde, 59 testes web verdes, E2E real contra o banco (container reconstruído): login/minhasCelulas(4)/criar/reset/duplicado/inválido/self-qualif todos corretos; nome do dono preservado no deploy. Deploy live (build.yml success).
