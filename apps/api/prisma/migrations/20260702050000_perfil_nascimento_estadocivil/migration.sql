-- Perfil: data de nascimento (aniversário) e estado civil.
DO $$ BEGIN
  CREATE TYPE "EstadoCivil" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dataNascimento" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "estadoCivil" "EstadoCivil";
