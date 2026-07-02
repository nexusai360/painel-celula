#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────
# Entrypoint do Painel Célula.
# 1) Aplica as migrations do Prisma (migrate deploy — nunca "migrate dev").
# 2) (Opcional) cria/promove o admin real, de forma idempotente (upsert),
#    se ADMIN_EMAIL e ADMIN_SENHA estiverem definidos. NUNCA roda o seed de demo.
# 3) exec no CMD (node apps/api/src/server.js).
# ─────────────────────────────────────────────────────────────────────────
set -e

echo "[entrypoint] Aplicando migrations (prisma migrate deploy)..."
npm run prisma:deploy --workspace apps/api

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_SENHA" ]; then
  echo "[entrypoint] Garantindo admin ${ADMIN_EMAIL} (idempotente)..."
  npm run admin --workspace apps/api
else
  echo "[entrypoint] ADMIN_EMAIL/ADMIN_SENHA ausentes — pulando criação de admin."
fi

echo "[entrypoint] Iniciando aplicação..."
exec "$@"
