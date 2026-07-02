-- Aprovação de conta: auto-cadastro fica pendente até um ADMIN aprovar.
ALTER TABLE "User" ADD COLUMN "aprovado" BOOLEAN NOT NULL DEFAULT false;

-- Contas já existentes ficam aprovadas (não trancar quem já usava a plataforma).
UPDATE "User" SET "aprovado" = true;
