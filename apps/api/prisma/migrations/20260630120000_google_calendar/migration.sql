-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleCalendarId" TEXT,
ADD COLUMN     "googleConectado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleRefreshTokenEnc" TEXT,
ADD COLUMN     "googleSub" TEXT,
ALTER COLUMN "senhaHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GoogleEventoSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encontroId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleEventoSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleEventoSync_userId_encontroId_key" ON "GoogleEventoSync"("userId", "encontroId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- AddForeignKey
ALTER TABLE "GoogleEventoSync" ADD CONSTRAINT "GoogleEventoSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleEventoSync" ADD CONSTRAINT "GoogleEventoSync_encontroId_fkey" FOREIGN KEY ("encontroId") REFERENCES "Encontro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
