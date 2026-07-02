-- Adiciona CEP (opcional) à célula. Aditivo/nullable — seguro para migrate deploy.
-- IF NOT EXISTS torna a migration idempotente (evita conflito se a coluna já existir).
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "cep" TEXT;
