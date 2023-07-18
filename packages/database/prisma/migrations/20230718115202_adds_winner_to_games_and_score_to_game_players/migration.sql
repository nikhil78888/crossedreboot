-- AlterTable
ALTER TABLE "gamePlayers" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "winnerId" UUID;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
