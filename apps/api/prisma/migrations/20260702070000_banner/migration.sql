-- Banner administrativo (aviso no topo da plataforma).
CREATE TABLE IF NOT EXISTS "Banner" (
  "id" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT false,
  "atualizadoPorId" TEXT,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);
