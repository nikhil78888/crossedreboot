-- CreateEnum
CREATE TYPE "CrosswordSource" AS ENUM ('wizium');

-- CreateEnum
CREATE TYPE "CrosswordCategory" AS ENUM ('general', 'sports', 'history', 'geography', 'science', 'politics', 'movies', 'television', 'pop_culture');

-- CreateTable
CREATE TABLE "profiles" (
    "userId" TEXT NOT NULL,
    "country" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crosswords" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "size" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL,
    "source" "CrosswordSource" NOT NULL,
    "category" "CrosswordCategory" NOT NULL,
    "puzzle" TEXT[],
    "solution" TEXT[],
    "clues" JSONB NOT NULL,

    CONSTRAINT "crosswords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_userId_idx" ON "profiles"("userId");
