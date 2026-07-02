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
