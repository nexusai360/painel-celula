/*
  Warnings:

  - You are about to drop the column `texto` on the `PedidoOracao` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pedidoId]` on the table `Testemunho` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `titulo` to the `PedidoOracao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titulo` to the `Testemunho` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PedidoOracao" DROP COLUMN "texto",
ADD COLUMN     "detalhes" TEXT,
ADD COLUMN     "titulo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Testemunho" ADD COLUMN     "pedidoId" TEXT,
ADD COLUMN     "titulo" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Testemunho_pedidoId_key" ON "Testemunho"("pedidoId");

-- AddForeignKey
ALTER TABLE "Testemunho" ADD CONSTRAINT "Testemunho_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoOracao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
