# STATUS — Painel de Célula (ponto de retomada)

> Atualizado para troca de sessão. Leia este arquivo + `DEPLOY.md` +
> `docs/superpowers/plans/2026-07-02-plataforma-celulas-v2.md` (plano/PROGRESSO)
> ao retomar. Trabalho é feito **direto na `main`** (sem worktree, decisão do dono).

## Onde estamos
Plataforma **no ar e estável** em **https://celula.nexusai360.com**. CI verde.
Repo público: **github.com/nexusai360/painel-celula**. Deploy: push na `main` →
build GHCR → Shepherd (ou `npm run deploy` pra forçar). Detalhes em `DEPLOY.md`.

## Entregue e LIVE (Plataforma v2, fases 0–6a)
- **Papéis**: MEMBRO ⊂ LIDER ⊂ ADMIN ⊂ **SUPER_ADMIN** (dono = `nexusai360@gmail.com`, senha `nexus.AI@360`). Só o super admin concede ADMIN/SUPER_ADMIN.
- **Gestão de usuários** (`/app/usuarios`): lista todos, busca, troca de nível (com regras), ativar/desativar, legenda; aprovações pendentes.
- **Onboarding**: cadastro pelo site → auto-login **pendente** → seleção de célula (cards: bairro/dia/horário/frequência/líderes) → "aguardando aprovação" → aprovação por **líder da célula** ou admin. Pendente **travado** (só perfil/seleção) — reforço no backend (`requireRole` lê estado fresco do banco; token não forja escopo).
- **Endereço da célula** (cidade/bairro/endereço/número/complemento/ponto ref; só bairro exposto na seleção).
- **Perfil**: data de nascimento + estado civil + **cônjuge por e-mail (duplo opt-in)**.
- **QR Code**: cadastro via QR = **sem aprovação** + vinculado; **check-in de presença** no encontro de hoje (dentro da janela).
- **Banner do admin**: aviso no topo pra todos; editor inline pro admin.

## Plataforma v2: TODAS as fases (0–7) CONCLUÍDAS e LIVE
- +6b Notificações in-app (sino no header; envio ADMIN global / LÍDER da célula).
- +7 Separação de áreas (nav agrupada Administração | Minha célula; admin com
  célula também vê a área de participante).

## Refinos/pendências (não bloqueiam nada)
- Passar `qrToken` no link "Criar conta" do Login.
- Armazenamento de **múltiplos líderes** por célula (hoje 1; a UI já lida com array).
- **E-mail transacional** (confirmação/reset de senha): falta configurar SMTP.
- Agrupar visualmente os links no NavDrawer (mobile) por seção (desktop já agrupa).
- Dono avisou que virão **mais requisitos** em áudios futuros.

## Como retomar (checklist)
1. `git pull` na `main`. Ler este STATUS + o plano/PROGRESSO.
2. Rodar local: `npm run app:up` → http://localhost:3200 (porta canônica).
3. Implementar 6b, depois 7, em fatias commitáveis; a cada fatia: `npm run build --workspace apps/web` → commit → CI verde → `npm run deploy` → verificar em https://celula.nexusai360.com.
4. Atualizar o PROGRESSO no plano a cada bloco.

## Coordenadas
- Portainer `https://painel.nexusai360.com` (endpoint 1), stack `painel-celula` (117), rede `rede_nexusAI`, certresolver `letsencryptresolver`, imagem privada `ghcr.io/nexusai360/painel-celula`.
- Segredos de deploy/app em `.env.deploy` e `.env` (gitignored). `gh` autenticado como `jvzanini` (tem `write:packages`).
- Regra de segurança: nada de segredo no Git (só `*.example`).
