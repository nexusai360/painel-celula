# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────
# Painel Célula (Hineni) — imagem única que serve API (Fastify) + front (Vite).
# Monorepo npm workspaces: apps/api, apps/web, packages/shared.
# Topologia "serviço único": a API serve apps/web/dist na mesma origem (porta 3000).
# ─────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependências + build ────────────────────────────────────────
FROM node:24-alpine AS builder
# openssl é exigido pelo engine do Prisma no Alpine.
RUN apk add --no-cache openssl
WORKDIR /app

# Manifests primeiro (camada de cache de dependências).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Código-fonte.
COPY . .

# Gera o Prisma Client (schema em apps/api/prisma/schema.prisma).
RUN npm run prisma:generate --workspace apps/api

# Build do front. VITE_API_URL vazio => caminho relativo (mesma origem que a API).
ENV VITE_API_URL=""
RUN npm run build --workspace apps/web

# ── Stage 2: runtime ─────────────────────────────────────────────────────
FROM node:24-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3000
ENV HOST=0.0.0.0
ENV TZ=America/Sao_Paulo
# Carimbado no build pelo CI (--build-arg APP_VERSION=<git sha>).
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

# Usuário não-root.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S hineni -G nodejs

# Copia o app já instalado/buildado do estágio anterior.
# Inclui node_modules (com Prisma Client gerado + CLI para migrate deploy),
# apps/api (código + prisma), apps/web/dist e packages/shared.
COPY --from=builder --chown=1001:1001 /app ./

COPY --chown=1001:1001 docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER hineni
EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/api/src/server.js"]
