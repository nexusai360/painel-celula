# Painel de Célula

Plataforma de gestão de células cristãs — QR Code de entrada, presença, pedidos de
oração, testemunhos, painel de "Vidas" e administração de células/membros.

Monorepo com **npm workspaces**:

- `apps/api` — API **Fastify 5 + Prisma 6 + PostgreSQL** (ESM), auth JWT própria.
- `apps/web` — front **Vite + React 19 + Tailwind** (framer-motion, react-hook-form).
- `packages/shared` — schemas **zod** compartilhados entre API e front.

Papéis: **MEMBRO ⊂ LIDER ⊂ ADMIN**.

## Rodar localmente

Pré-requisitos: Node 24, Docker (para o Postgres).

```bash
npm install
npm run db:up                              # sobe o Postgres (Docker)
cp apps/api/.env.example apps/api/.env     # ajuste se necessário
cp apps/web/.env.example apps/web/.env     # (opcional; o padrão já aponta para :3000)
npm run prisma:migrate                     # cria o schema
npm run prisma:seed                        # admin + célula de exemplo (demo)
```

Em dois terminais:

```bash
npm run dev:api                            # API em http://localhost:3000
npm run dev --workspace apps/web           # front em http://localhost:5173
```

Contas do seed (demo): `admin@icelula.app` / `admin123` (admin) · `lider@icelula.app`
e `ana@/bruno@/carla@icelula.app` / `123456`.

### Rodar tudo em container (porta 3200 — canônica local)

Para ver a plataforma completa (API + front na mesma URL, igual a produção) sem
subir dois terminais, use a imagem em container:

```bash
npm run app:up      # builda + sobe app e Postgres → http://localhost:3200
npm run app:logs    # acompanha os logs da app
npm run app:down    # derruba
```

> **A porta local canônica deste projeto é a `3200`** (a `3000` costuma estar
> ocupada por outro projeto). O container sobe com `restart: unless-stopped`,
> então fica de pé sozinho. Ao mudar código, rode `npm run app:up` de novo para
> rebuildar. Para iteração rápida com hot-reload, use o fluxo de dois terminais
> acima (`dev:api` + `dev` do web).

> Após atualizar versões de Prisma/esbuild, pode ser necessário `npm approve-scripts`
> (bloco `allowScripts` no `package.json`).

## Scripts úteis

| Script | O que faz |
|---|---|
| `npm test` | roda os testes de todos os workspaces |
| `npm run test --workspace apps/api` | testes da API (vitest, usa o Postgres) |
| `npm run test --workspace apps/web` | testes do front (funções puras) |
| `npm run build --workspace apps/web` | build de produção do front (gera `apps/web/dist`) |
| `npm run db:up` / `db:down` | sobe/derruba o Postgres local |
| `npm run prisma:migrate` | aplica migrations em dev |
| `npm run prisma:seed` | popula dados de demonstração |

## Deploy / produção

Veja **[DEPLOY.md](./DEPLOY.md)** — variáveis de ambiente, passos de subida,
topologias (serviço único vs. front separado) e o fluxo de atualização
(**PR → merge na `main` → deploy**).

## Documentação

Specs e planos de cada fase/fatia ficam em `docs/superpowers/`.
