/*
  Warnings:

  - You are about to drop the column `gamesId` on the `profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_gamesId_fkey";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "gamesId";

-- CreateTable
CREATE TABLE "_gamesToprofiles" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_gamesToprofiles_AB_unique" ON "_gamesToprofiles"("A", "B");

-- CreateIndex
CREATE INDEX "_gamesToprofiles_B_index" ON "_gamesToprofiles"("B");

-- AddForeignKey
ALTER TABLE "_gamesToprofiles" ADD CONSTRAINT "_gamesToprofiles_A_fkey" FOREIGN KEY ("A") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_gamesToprofiles" ADD CONSTRAINT "_gamesToprofiles_B_fkey" FOREIGN KEY ("B") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
