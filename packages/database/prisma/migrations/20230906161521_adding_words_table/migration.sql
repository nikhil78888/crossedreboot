-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "eloRating" SET DEFAULT 1000,
ALTER COLUMN "eloRating" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "words" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "clue" TEXT,
    "score" INTEGER,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "words_word_clue_key" ON "words"("word", "clue");
