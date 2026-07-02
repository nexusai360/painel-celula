-- Adiciona CEP (opcional) à célula. Aditivo/nullable — seguro para migrate deploy.
ALTER TABLE "Celula" ADD COLUMN "cep" TEXT;
