-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('USER', 'BOT');

-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'RANKED_BOT';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "type" "ProfileType" NOT NULL DEFAULT 'USER';
