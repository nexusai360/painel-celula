-- Fase C: segmentação de avisos (3 eixos AND) + banner com expiração + leitura por item.
-- Idempotente. Defaults nas colunas para não quebrar linhas existentes.

-- ── Notificacao: remove escopo/celulaId; adiciona os 3 eixos de alvo ─────────
ALTER TABLE "Notificacao" DROP COLUMN IF EXISTS "escopo";
ALTER TABLE "Notificacao" DROP COLUMN IF EXISTS "celulaId";
DROP INDEX IF EXISTS "Notificacao_celulaId_idx";
ALTER TABLE "Notificacao" ADD COLUMN IF NOT EXISTS "celulasTodas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notificacao" ADD COLUMN IF NOT EXISTS "celulasAlvo" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Notificacao" ADD COLUMN IF NOT EXISTS "qualificacoesTodas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notificacao" ADD COLUMN IF NOT EXISTS "qualificacoesAlvo" "Qualificacao"[] NOT NULL DEFAULT ARRAY[]::"Qualificacao"[];
ALTER TABLE "Notificacao" ADD COLUMN IF NOT EXISTS "niveisTodas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notificacao" ADD COLUMN IF NOT EXISTS "niveisAlvo" "NivelAcesso"[] NOT NULL DEFAULT ARRAY[]::"NivelAcesso"[];

-- ── NotificacaoLeitura (leitura por item) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "NotificacaoLeitura" (
  "id" TEXT NOT NULL,
  "notificacaoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificacaoLeitura_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificacaoLeitura_userId_notificacaoId_key" ON "NotificacaoLeitura"("userId", "notificacaoId");
CREATE INDEX IF NOT EXISTS "NotificacaoLeitura_userId_idx" ON "NotificacaoLeitura"("userId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificacaoLeitura_notificacaoId_fkey') THEN
    ALTER TABLE "NotificacaoLeitura" ADD CONSTRAINT "NotificacaoLeitura_notificacaoId_fkey"
      FOREIGN KEY ("notificacaoId") REFERENCES "Notificacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Banner: singleton -> vários, com expiração e alvo ───────────────────────
ALTER TABLE "Banner" DROP COLUMN IF EXISTS "atualizadoPorId";
ALTER TABLE "Banner" DROP COLUMN IF EXISTS "atualizadoEm";
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "expiraEm" TIMESTAMP(3);
UPDATE "Banner" SET "expiraEm" = CURRENT_TIMESTAMP + INTERVAL '30 days' WHERE "expiraEm" IS NULL;
ALTER TABLE "Banner" ALTER COLUMN "expiraEm" SET NOT NULL;
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "autorId" TEXT;
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Banner" ALTER COLUMN "ativo" SET DEFAULT true;
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "celulasTodas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "celulasAlvo" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "qualificacoesTodas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "qualificacoesAlvo" "Qualificacao"[] NOT NULL DEFAULT ARRAY[]::"Qualificacao"[];
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "niveisTodas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "niveisAlvo" "NivelAcesso"[] NOT NULL DEFAULT ARRAY[]::"NivelAcesso"[];
-- Banner legado (singleton "para todos") passa a mirar todos os eixos.
UPDATE "Banner" SET "celulasTodas" = true, "qualificacoesTodas" = true, "niveisTodas" = true;
CREATE INDEX IF NOT EXISTS "Banner_ativo_expiraEm_idx" ON "Banner"("ativo", "expiraEm");
