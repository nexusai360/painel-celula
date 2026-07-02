-- Fim da Fase A: remove o eixo legado `papel`. Todos os consumidores migraram para
-- nivelAcesso + qualificacao. Idempotente (IF EXISTS).
ALTER TABLE "User" DROP COLUMN IF EXISTS "papel";
DROP TYPE IF EXISTS "Papel";
