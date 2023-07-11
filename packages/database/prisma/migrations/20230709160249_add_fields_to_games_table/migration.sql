/*
  Warnings:

  - Added the required column `gameDurationInSeconds` to the `games` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "gamePlayers" DROP CONSTRAINT "gamePlayers_gamesId_fkey";

-- DropForeignKey
ALTER TABLE "gamePlayers" DROP CONSTRAINT "gamePlayers_profilesId_fkey";

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gameDurationInSeconds" INTEGER NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "gamePlayers" ADD CONSTRAINT "gamePlayers_gamesId_fkey" FOREIGN KEY ("gamesId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamePlayers" ADD CONSTRAINT "gamePlayers_profilesId_fkey" FOREIGN KEY ("profilesId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
