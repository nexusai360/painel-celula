-- Endereço básico da célula (todos opcionais). Só o bairro é exposto na seleção.
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "cidade" TEXT;
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "bairro" TEXT;
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "endereco" TEXT;
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "numero" TEXT;
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "complemento" TEXT;
ALTER TABLE "Celula" ADD COLUMN IF NOT EXISTS "pontoReferencia" TEXT;
