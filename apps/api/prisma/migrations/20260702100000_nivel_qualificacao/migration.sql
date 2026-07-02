-- Fase A: separa NÍVEL DE ACESSO (plataforma) de QUALIFICAÇÃO (função).
-- Cria os enums (idempotente via DO block), adiciona as colunas com default e faz o
-- backfill a partir do `papel` legado. Mantém a coluna `papel` (dropada na Task 9).
-- Seguro para `migrate deploy` (aditivo, defaults, idempotente).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NivelAcesso') THEN
    CREATE TYPE "NivelAcesso" AS ENUM ('USUARIO', 'ADMIN', 'SUPER_ADMIN');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Qualificacao') THEN
    CREATE TYPE "Qualificacao" AS ENUM ('CONVIDADO', 'MEMBRO', 'LOUVOR', 'COLIDER', 'LIDER', 'PASTOR');
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nivelAcesso" "NivelAcesso" NOT NULL DEFAULT 'USUARIO';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "qualificacao" "Qualificacao" NOT NULL DEFAULT 'CONVIDADO';

-- Backfill a partir do papel legado:
--   MEMBRO      -> USUARIO      + MEMBRO
--   LIDER       -> USUARIO      + LIDER
--   ADMIN       -> ADMIN        + MEMBRO
--   SUPER_ADMIN -> SUPER_ADMIN  + MEMBRO
UPDATE "User" SET
  "nivelAcesso" = CASE
    WHEN "papel" = 'ADMIN' THEN 'ADMIN'::"NivelAcesso"
    WHEN "papel" = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::"NivelAcesso"
    ELSE 'USUARIO'::"NivelAcesso"
  END,
  "qualificacao" = CASE
    WHEN "papel" = 'LIDER' THEN 'LIDER'::"Qualificacao"
    ELSE 'MEMBRO'::"Qualificacao"
  END;
