-- Notificações in-app.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificacoesLidasEm" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Notificacao" (
  "id" TEXT NOT NULL,
  "autorId" TEXT NOT NULL,
  "escopo" TEXT NOT NULL,
  "celulaId" TEXT,
  "titulo" TEXT NOT NULL,
  "corpo" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notificacao_celulaId_idx" ON "Notificacao"("celulaId");
CREATE INDEX IF NOT EXISTS "Notificacao_criadoEm_idx" ON "Notificacao"("criadoEm");
