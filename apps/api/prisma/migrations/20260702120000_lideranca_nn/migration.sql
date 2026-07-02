-- Fase B: liderança N:N (junção implícita do Prisma) + status da célula + criadaPor.
-- Idempotente. Backfill: cada liderId atual vira uma linha na junção antes de dropar a coluna.

-- 1) enum CelulaStatus
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CelulaStatus') THEN
    CREATE TYPE "CelulaStatus" AS ENUM ('PENDENTE', 'APROVADA');
  END IF;
END $$;

-- 2) colunas novas em Celula (status default APROVADA cobre as existentes)
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "status" "CelulaStatus" NOT NULL DEFAULT 'APROVADA';
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "criadaPorId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Celula_criadaPorId_fkey') THEN
    ALTER TABLE "Celula" ADD CONSTRAINT "Celula_criadaPorId_fkey"
      FOREIGN KEY ("criadaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) tabela de junção N:N (implícita do Prisma: _LideresDaCelula, A=Celula, B=User)
CREATE TABLE IF NOT EXISTS "_LideresDaCelula" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "_LideresDaCelula_AB_unique" ON "_LideresDaCelula"("A", "B");
CREATE INDEX IF NOT EXISTS "_LideresDaCelula_B_index" ON "_LideresDaCelula"("B");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_LideresDaCelula_A_fkey') THEN
    ALTER TABLE "_LideresDaCelula" ADD CONSTRAINT "_LideresDaCelula_A_fkey"
      FOREIGN KEY ("A") REFERENCES "Celula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_LideresDaCelula_B_fkey') THEN
    ALTER TABLE "_LideresDaCelula" ADD CONSTRAINT "_LideresDaCelula_B_fkey"
      FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) backfill dos líderes atuais
INSERT INTO "_LideresDaCelula" ("A", "B")
SELECT "id", "liderId" FROM "Celula" WHERE "liderId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5) remove a coluna liderId (dropa unique/FK dependentes junto)
ALTER TABLE "Celula" DROP COLUMN IF EXISTS "liderId";
