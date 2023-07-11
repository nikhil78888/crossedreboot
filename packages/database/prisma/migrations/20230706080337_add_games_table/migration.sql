-- CreateEnum
CREATE TYPE "PlayState" AS ENUM ('WAITING_FOR_OPPONENT', 'PLAYING', 'COMPLETED', 'ABORTED');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('SINGLE', 'FRIENDLY', 'MATCH');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "gamesId" UUID;

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "crosswordsId" UUID NOT NULL,
    "gameType" "GameType" NOT NULL,
    "playState" "PlayState" NOT NULL,
    "gameState" JSONB NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_gamesId_fkey" FOREIGN KEY ("gamesId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_crosswordsId_fkey" FOREIGN KEY ("crosswordsId") REFERENCES "crosswords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
