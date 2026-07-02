-- Contas nascem aprovadas por padrão; só o auto-cadastro (/auth/register) grava
-- aprovado=false explicitamente. Evita travar usuários criados por admin/seed.
ALTER TABLE "User" ALTER COLUMN "aprovado" SET DEFAULT true;
