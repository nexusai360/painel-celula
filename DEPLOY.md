# Deploy — Painel Célula (Hineni)

Produção: **`https://celula.nexusai360.com`**

Segue o mesmo padrão das stacks **nexus-odoo** e **nexus-insights**:
VPS Hostinger → **Docker Swarm + Portainer** → **Traefik** (SSL Let's Encrypt,
rede externa `rede_nexusAI`) → imagem publicada no **GHCR** →
**auto-deploy pelo Shepherd** rodando dentro da VPS.

## Arquitetura da imagem

Imagem **única** (`docker/Dockerfile`, multi-stage, `node:24-alpine`, usuário
não-root `1001`, porta **3000**) que serve **API + front na mesma origem**
(topologia "serviço único"): a API Fastify serve os estáticos de `apps/web/dist`
e faz o fallback SPA. Não há CORS nesse modo.

No boot, o `docker/entrypoint.sh`:
1. `prisma migrate deploy` (nunca `migrate dev`);
2. cria/promove o admin real de forma idempotente (upsert) se `ADMIN_EMAIL` +
   `ADMIN_SENHA` estiverem definidos (o seed de **demo** nunca roda em produção);
3. inicia `node apps/api/src/server.js`.

## Fluxo de deploy (dia a dia)

```
git push / merge do PR na main
        │
        ▼
GitHub Actions "Build and Push"  →  ghcr.io/nexusai360/painel-celula:latest (+ :sha-XXXX)
        │
        ▼
Shepherd (na VPS, a cada ~5 min) detecta a nova :latest e faz
`docker service update` do serviço com label com.nexus.autodeploy=true
        │
        ▼
Traefik roteia celula.nexusai360.com  →  app:3000  (TLS Let's Encrypt)
```

**Atualizar produção = abrir e mergear um PR na `main`.** Nunca commitar direto
na `main`. Se a entrega incluir novas migrations, elas são aplicadas
automaticamente pelo entrypoint no boot do container novo.

> O runner do GitHub **não alcança** a VPS (bloqueio de borda). Por isso o
> deploy não é disparado pelo Actions — quem redeploya é o **Shepherd** dentro
> da VPS, exatamente como no nexus-odoo. O Actions só **builda e publica**.

## Registry

- **GHCR** — `ghcr.io/nexusai360/painel-celula`
- Tags: `:latest` e `:sha-<git sha>` (a `:sha` permite rollback)
- Auth de push: `GITHUB_TOKEN` embutido do Actions (`packages: write`). Sem PAT externo.
- O pacote é **privado** (org `nexusai360`, igual a nexus-odoo/nexus-nfe). O pull
  no Swarm usa a credencial de registry do nó (`docker login ghcr.io`) — a mesma
  que já serve os projetos irmãos. Não precisa ser público.
- No primeiro deploy, o serviço foi criado via API do Portainer e o pull inicial
  foi forçado com `X-Registry-Auth` (token com `read:packages`). Depois disso o
  Shepherd cuida sozinho.

## Variáveis de ambiente (definidas na stack do Portainer)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | **sim** | URL do Postgres da stack. Ex.: `postgresql://icelula:<senha>@db:5432/icelula?schema=public`. Se o DNS do overlay oscilar, use o FQDN `painel-celula_db`. |
| `DB_PASSWORD` | **sim** | Senha do Postgres da stack (usada por `db` e por `DATABASE_URL`). |
| `JWT_SECRET` | **sim** | Segredo forte. Gere: `openssl rand -hex 48`. Sem ele, com `NODE_ENV=production`, a API se recusa a subir. |
| `NODE_ENV` | sim | `production`. |
| `TZ` | **sim** | `America/Sao_Paulo` — a janela de presença usa data local. |
| `HOST` | recomendado | `0.0.0.0`. |
| `API_PORT` | não | Porta da API (default 3000). |
| `ADMIN_EMAIL` | recomendado | Cria/promove o admin real no boot (idempotente). |
| `ADMIN_SENHA` | recomendado | Senha do admin real. |
| `ADMIN_NOME` | opcional | Nome do admin (default "Administrador"). |
| `CORS_ORIGIN` | não | Só se o front for servido de outro domínio. No serviço único, deixe vazio. |
| `GOOGLE_OAUTH_ENABLED` e cia. | opcional | Integração Google Calendar — desligada por padrão. Ver `apps/api/.env.example`. |

## Primeiro deploy (bootstrap)

1. **Merge do PR de infra na `main`** → o Actions builda e publica a imagem no GHCR.
2. **Tornar o pacote GHCR público** (Packages → painel-celula → Package settings →
   Change visibility → Public) — ou configurar o registry no Portainer.
3. **Criar a stack `painel-celula` no Portainer** (Swarm): cole o conteúdo de
   `docker-compose.production.example.yml` no editor da stack e preencha as
   variáveis na aba **Environment** (`DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`,
   `ADMIN_SENHA`, `ADMIN_NOME`, `DATABASE_URL`).
   - Confirme que `entrypoints` e `certresolver` dos labels Traefik casam com o
     seu Traefik (os mesmos nomes usados por nexus-odoo/nexus-insights).
   - O entrypoint aplica as migrations e cria o admin automaticamente no boot.
4. **DNS**: apontar `celula.nexusai360.com` para o IP da VPS (registro A). O
   Traefik emite o certificado Let's Encrypt no primeiro acesso.
5. A partir daí, todo push/merge na `main` redeploya sozinho via Shepherd.

## Verificação pós-deploy

```bash
curl -sI https://celula.nexusai360.com/        # 200, cert válido
curl -s  https://celula.nexusai360.com/health  # healthcheck da API
```

## Redeploy manual (fallback, se o Shepherd estiver fora)

No Portainer: **Stacks → painel-celula → Update the stack → marcar
"Re-pull image and redeploy"**. (Para stacks Swarm não-git, é
`docker service update` com `ForceUpdate++`; **nunca** o endpoint
`/api/stacks/{id}/git/redeploy`, que retorna 405 nesse caso.)

## Segurança / segredos

- **Nenhum segredo vai para o Git.** Só `*.example` é versionado; o `.gitignore`
  bloqueia `.env`, `.env.*`, `*.pem`, `*.key`, `docker-compose.production.yml`.
- Os valores reais (senhas, `JWT_SECRET`) vivem **apenas** na aba Environment da
  stack do Portainer — nunca no repositório.
- `docker-compose.production.example.yml` é só um **template** com placeholders.

## Checklist de produção

- [ ] Pacote GHCR público (ou registry configurado no Portainer).
- [ ] Stack `painel-celula` criada no Portainer com todas as env vars.
- [ ] `JWT_SECRET` forte e único (`openssl rand -hex 48`).
- [ ] `DB_PASSWORD` forte.
- [ ] `TZ=America/Sao_Paulo` e `NODE_ENV=production`.
- [ ] Labels Traefik com `entrypoints`/`certresolver` corretos.
- [ ] DNS `celula.nexusai360.com` → VPS, HTTPS ativo.
- [ ] Serviço `app` na rede `rede_nexusAI` e com `com.nexus.autodeploy=true`.
- [ ] Admin real criado (via `ADMIN_EMAIL`/`ADMIN_SENHA`), sem dados de demo.
