-- Word search & trivia puzzles live inline in the game (no content table), so a
-- challenge must carry the puzzle itself for the recipient to race the exact
-- same one. (Crossword challenges keep using crosswordsId + resolvedClues.)
ALTER TABLE "public"."challenges" ADD COLUMN IF NOT EXISTS "puzzle" jsonb;
