-- Independent Glicko-2 rating ladders for the two new variants, mirroring the
-- existing crossword (eloRating) and sudoku (eloRatingSudoku) columns.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "eloRatingWordSearch" double precision NOT NULL DEFAULT 1000;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "ratingDeviationWordSearch" double precision NOT NULL DEFAULT 350;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "volatilityWordSearch" double precision NOT NULL DEFAULT 0.06;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "eloRatingTrivia" double precision NOT NULL DEFAULT 1000;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "ratingDeviationTrivia" double precision NOT NULL DEFAULT 350;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "volatilityTrivia" double precision NOT NULL DEFAULT 0.06;

-- Leaderboard indexes per variant.
CREATE INDEX IF NOT EXISTS "profiles_eloRatingWordSearch_idx" ON "profiles" ("eloRatingWordSearch" DESC);
CREATE INDEX IF NOT EXISTS "profiles_eloRatingTrivia_idx" ON "profiles" ("eloRatingTrivia" DESC);
