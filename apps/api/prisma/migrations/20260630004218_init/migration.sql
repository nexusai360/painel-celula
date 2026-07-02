-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('MEMBRO', 'LIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EncontroStatus" AS ENUM ('AGENDADO', 'REALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PedidoStatus" AS ENUM ('ATIVO', 'ATENDIDO');

-- CreateEnum
CREATE TYPE "TestemunhoStatus" AS ENUM ('PENDENTE', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'MEMBRO',
    "celulaId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcesso" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Celula" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "qrToken" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "frequenciaDias" INTEGER NOT NULL,
    "dataPrimeiroEncontro" TIMESTAMP(3) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liderId" TEXT,

    CONSTRAINT "Celula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encontro" (
    "id" TEXT NOT NULL,
    "celulaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "status" "EncontroStatus" NOT NULL DEFAULT 'AGENDADO',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encontro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presenca" (
    "id" TEXT NOT NULL,
    "encontroId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marcadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoOracao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "celulaId" TEXT,
    "texto" TEXT NOT NULL,
    "status" "PedidoStatus" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoOracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testemunho" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "celulaId" TEXT,
    "status" "TestemunhoStatus" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "Testemunho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Celula_qrToken_key" ON "Celula"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Celula_liderId_key" ON "Celula"("liderId");

-- CreateIndex
CREATE UNIQUE INDEX "Encontro_celulaId_data_key" ON "Encontro"("celulaId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Presenca_encontroId_userId_key" ON "Presenca"("encontroId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "Celula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Celula" ADD CONSTRAINT "Celula_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encontro" ADD CONSTRAINT "Encontro_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "Celula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_encontroId_fkey" FOREIGN KEY ("encontroId") REFERENCES "Encontro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOracao" ADD CONSTRAINT "PedidoOracao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOracao" ADD CONSTRAINT "PedidoOracao_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "Celula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testemunho" ADD CONSTRAINT "Testemunho_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testemunho" ADD CONSTRAINT "Testemunho_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "Celula"("id") ON DELETE SET NULL ON UPDATE CASCADE;
