-- Vínculo de cônjuge (duplo opt-in).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "conjugeId" TEXT;

CREATE TABLE IF NOT EXISTS "ConjugeSolicitacao" (
  "id" TEXT NOT NULL,
  "solicitanteId" TEXT NOT NULL,
  "alvoId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConjugeSolicitacao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConjugeSolicitacao_solicitanteId_alvoId_key" ON "ConjugeSolicitacao"("solicitanteId", "alvoId");
CREATE INDEX IF NOT EXISTS "ConjugeSolicitacao_alvoId_idx" ON "ConjugeSolicitacao"("alvoId");
