# Deploy — CAMINHO DAS PEDRAS (ler ANTES de qualquer deploy)

> **REGRA DE RAIZ.** Ao pensar em deploy/redeploy/ajuste em produção, a PRIMEIRA
> coisa é ler este arquivo. Ele tem o fluxo certo, por que cada peça existe e os
> parâmetros/coordenadas reais. **Não improvisar, não investigar o servidor antes
> de seguir os passos daqui.** Mesmo padrão dos projetos irmãos (nexus-odoo,
> nexus-nfe, nexus-blueprint) na mesma VPS.

Produção: **https://celula.nexusai360.com**

---

## 1. TL;DR — como se faz deploy AGORA

**Você só dá push/merge na `main`. A produção se atualiza sozinha em ~10 min.**

```bash
git push origin main
# O GitHub builda a imagem e o Shepherd (na VPS) atualiza a produção sozinho.
```

Para **forçar na hora** (sem esperar o Shepherd) ou se ele estiver fora:

```bash
npm run deploy          # força o re-pull da :latest e valida o /health
npm run deploy:status   # só mostra o estado atual (não mexe)
```

Pré-requisito dos dois: a imagem nova já publicada no GHCR (workflow
"Build and Push" verde). Confere com:

```bash
gh run list --repo nexusai360/painel-celula --workflow "Build and Push" --limit 1
```

### 1.1 Mudança de schema (Prisma) — aplica sozinho no boot

Diferente do nexus-odoo: aqui as migrations **são arquivos** em
`apps/api/prisma/migrations/`. O entrypoint do container roda
`prisma migrate deploy` no boot, então **toda migration commitada é aplicada
automaticamente em produção** no primeiro container novo. Regra: gere a migration
(`prisma migrate dev` no dev), **comite a pasta da migration**, e o deploy cuida
do resto. Prefira mudanças aditivas/idempotentes; nunca DROP/rename sem plano.

---

## 2. Como funciona (arquitetura em 1 minuto)

```
git push / merge na main
        │
        ▼
GitHub Actions ── build ─►  ghcr.io/nexusai360/painel-celula:latest  (+ :sha-XXXX)
 (.github/workflows/build.yml — o job que importa)
        │  (imagem nova no registry, privada)
        ▼
Shepherd (roda DENTRO da VPS, a cada ~10 min)
        │  vê a :latest mudar → docker service update do painel-celula_app
        ▼
Traefik roteia celula.nexusai360.com → app:3000 (TLS Let's Encrypt)
        │  no boot, o entrypoint roda: prisma migrate deploy + cria/garante admin
        ▼
Produção atualizada
```

- **Imagem única** (`docker/Dockerfile`, multi-stage, `node:24-alpine`, não-root,
  porta 3000): a API Fastify serve a API **e** o front (`apps/web/dist`) na mesma
  origem (topologia "serviço único", sem CORS).
- **GitHub Actions só CONSTRÓI e PUBLICA** no GHCR. Não tente fazer o Actions
  chamar a VPS para deployar — a borda da VPS bloqueia o IP do runner (HTTP 000).
  O deploy é do Shepherd (dentro da VPS) ou do `npm run deploy` (da sua máquina).
- **CI** (`.github/workflows/ci.yml`) roda lint/build/testes com um Postgres
  limpo a cada push/PR. É o gate — mantenha verde.

---

## 3. Auto-deploy (Shepherd) — como está montado

Reusa o serviço **`shepherd-nexus-odoo`** que já roda no Swarm (um Shepherd
global serve todos os projetos). Ele observa o GHCR e atualiza **apenas** os
serviços com o label **`com.nexus.autodeploy=true`**.

- O `painel-celula_app` **tem esse label** (definido em `deploy.labels` do compose
  de produção) → o Shepherd o atualiza sozinho quando a `:latest` muda.
- `WITH_REGISTRY_AUTH=true` + a credencial do GHCR que já existe no nó
  (`/root/.docker/config.json`, `docker login ghcr.io`) → o nó **consegue puxar a
  imagem privada** da org. Por isso a imagem **não precisa ser pública**.
- Nunca toca `db`/`redis` (não têm o label).

---

## 4. Deploy MANUAL / forçado (`npm run deploy`)

`scripts/deploy.mjs` faz o mesmo que o Shepherd, sob demanda, da sua máquina:

1. lê `PORTAINER_URL`/`PORTAINER_TOKEN`/`PORTAINER_ENDPOINT_ID` de `.env.deploy`
   (gitignored);
2. pega um token de pull do GHCR via `gh auth token` (imagem privada) e monta o
   header `X-Registry-Auth`;
3. faz `POST /api/endpoints/1/docker/services/{id}/update?version=N` com
   `TaskTemplate.ForceUpdate++` → o Swarm re-puxa a `:latest`;
4. acompanha a convergência e valida `https://celula.nexusai360.com/health`.

> **NUNCA** use `/api/stacks/{id}/git/redeploy` (só serve para stack git-managed;
> retorna HTTP 405 aqui). Sempre `/docker/services/{id}/update` com ForceUpdate.

Fallback pela UI: Portainer → Stacks → `painel-celula` → **Update the stack** →
marcar **"Re-pull image and redeploy"**.

---

## 5. Coordenadas de produção (parâmetros reais)

| Item | Valor |
|---|---|
| Domínio | `celula.nexusai360.com` (DNS já aponta para a VPS via wildcard `*.nexusai360.com`) |
| VPS | Hostinger `82.29.61.175`, Docker Swarm |
| Portainer | `https://painel.nexusai360.com` · endpoint id **1** · swarmID em `.env.deploy` |
| Stack | `painel-celula` (id **117**) · serviços `painel-celula_app`, `painel-celula_db` |
| Registry | GHCR `ghcr.io/nexusai360/painel-celula` (**privado**) · registry id **1** no Portainer |
| Rede Traefik | externa `rede_nexusAI` · entrypoint `websecure` · certresolver **`letsencryptresolver`** |
| Credenciais | `PORTAINER_URL/TOKEN/ENDPOINT_ID`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_*` — em `.env.deploy` (gitignored) e na aba Environment da stack no Portainer |

O compose real de produção fica em `docker-compose.production.yml` (gitignored) e
na definição da stack no Portainer. O template versionado é
`docker-compose.production.example.yml`.

---

## 6. Variáveis de ambiente da stack (no Portainer)

`DATABASE_URL` (Postgres da stack), `DB_PASSWORD`, `JWT_SECRET` (forte;
`openssl rand -hex 48`), `NODE_ENV=production`, `TZ=America/Sao_Paulo`,
`ADMIN_EMAIL`/`ADMIN_SENHA`/`ADMIN_NOME` (o entrypoint cria/garante o dono no
boot, idempotente). `CORS_ORIGIN` não é necessário no modo serviço único.

---

## 7. Primeiro deploy do zero (bootstrap) — receita reutilizável

1. Push na `main` → Actions builda e publica `ghcr.io/nexusai360/painel-celula:latest`.
2. Criar a stack `painel-celula` no Portainer (Swarm): colar
   `docker-compose.production.example.yml` no editor + preencher as env vars
   (seção 6) na aba Environment.
   - Os labels Traefik já usam `websecure` + `letsencryptresolver` + `rede_nexusAI`
     (as convenções desta VPS). O `com.nexus.autodeploy=true` liga o Shepherd.
3. **Pull da imagem privada no primeiro subir:** o nó puxa via a credencial do
   GHCR que já tem (`/root/.docker/config.json`). Se um serviço ficar
   `rejected: No such image`, force com `npm run deploy` (passa `X-Registry-Auth`).
4. O entrypoint aplica as migrations e cria o admin automaticamente.
5. A partir daqui, todo push na `main` redeploya sozinho (Shepherd).

> A visibilidade de um pacote **de org** no GHCR **não** muda por API (o
> endpoint `PATCH /orgs/.../packages/...` retorna 404). Não perca tempo tentando:
> a imagem fica privada e o pull funciona pela credencial do nó / `X-Registry-Auth`.

---

## 8. Verificação e rollback

```bash
curl -sI https://celula.nexusai360.com/        # 200, cert válido
curl -s  https://celula.nexusai360.com/health  # {"status":"ok"}
npm run deploy:status                           # imagem/versão do serviço + health
```

- **Rollback:** deployar uma tag `:sha-XXXX` anterior (Portainer → serviço →
  Update → trocar a imagem para a revisão anterior), ou reverter o commit e push.

---

## 9. Segurança

- **Nenhum segredo no Git.** Só `*.example` é versionado. O `.gitignore` bloqueia
  `.env`, `.env.*` (inclui `.env.deploy`), `docker-compose.production.yml`, chaves.
- Segredos reais vivem em `.env.deploy` (local, para o `npm run deploy`) e na aba
  Environment da stack no Portainer.
- App: `@fastify/helmet` (CSP) + `@fastify/rate-limit` (global + login/registro).
  Cadastro é **aberto com aprovação de admin** (conta nasce pendente; login só
  após aprovação em `/app/usuarios`). E-mail transacional (confirmação/reset)
  ainda **não** está ativo — pendente de configurar SMTP.

---

## 10. Troubleshooting (causas-raiz já resolvidas — não reinvestigar)

- **`rejected: No such image` ao subir/atualizar:** o pull não autenticou.
  Rode `npm run deploy` (manda `X-Registry-Auth` do `gh`); ou garanta o
  `docker login ghcr.io` no nó. **Não** é preciso tornar a imagem pública.
- **HTTP 405 no redeploy:** você usou `/api/stacks/{id}/git/redeploy` (só p/
  git-managed). Use `/docker/services/{id}/update?version=N` com ForceUpdate.
- **HTTP 404 ao tornar pacote público:** esperado para pacote de org via API.
  Ignorar; a imagem fica privada e funciona.
- **Deploy pelo runner do GitHub não conecta (HTTP 000):** a borda da VPS
  bloqueia o runner. Por isso o deploy é do Shepherd / `npm run deploy`.
- **Feature nova quebra por coluna faltando:** confirme que a migration foi
  **commitada** em `apps/api/prisma/migrations/`; o `migrate deploy` do boot só
  aplica arquivos de migration.
- **Deploy "não pega" a imagem nova (roda a antiga):** o Swarm **fixa o digest**
  da imagem no spec; um `ForceUpdate` sozinho reinicia com o MESMO digest. Por
  isso o `npm run deploy` **resolve o digest atual da `:latest` no GHCR e aponta
  o serviço para ele** (é o que o Shepherd faz). Se editar o deploy à mão, sempre
  fixe `repo@sha256:<novo-digest>`, não só a tag `:latest`.
- **Verificação logo após o deploy mostra estado antigo:** durante o rolling
  update coexistem o container velho (draining) e o novo. Espere a convergência
  (`npm run deploy` já aguarda) e valide o container cujo `Image` casa com o
  digest novo.
