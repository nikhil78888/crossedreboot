-- Regular / Hard difficulty.
-- Crossword: SAME puzzles in both modes; Hard serves harder CLUES, resolved at
--   game-creation from the difficulty-tagged wordClues bank (not grid size).
-- Sudoku:    Regular = easy+medium puzzles, Hard = hard puzzles.
-- Ranked + tournaments are segmented by difficulty (and variant).

ALTER TABLE "rankedQueue" ADD COLUMN IF NOT EXISTS "difficulty" text NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "difficulty" text NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "difficulty" text NOT NULL DEFAULT 'REGULAR';

-- Tag each clue in the bank so clue resolution can pick a Regular vs Hard clue.
ALTER TABLE "wordClues" ADD COLUMN IF NOT EXISTS "difficulty" text NOT NULL DEFAULT 'REGULAR';
CREATE INDEX IF NOT EXISTS "wordClues_word_difficulty_idx" ON "wordClues" ("word", "difficulty");

-- Leaderboard order-by had no supporting index -> full scan + top-N sort of the
-- whole profiles table on every load (audit fix).
CREATE INDEX IF NOT EXISTS "profiles_eloRating_idx" ON "profiles" ("eloRating" DESC);
CREATE INDEX IF NOT EXISTS "profiles_eloRatingSudoku_idx" ON "profiles" ("eloRatingSudoku" DESC);

-- Sudoku difficulty-aware pickers (overloads alongside the 1-arg versions, so
-- currently-deployed builds that call the 1-arg pickers keep working).
CREATE OR REPLACE FUNCTION "public"."get_available_sudoku"("profileid" uuid, "is_hard" boolean)
RETURNS SETOF "public"."sudokus"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select s.* from public.sudokus s
  where s."isPublished" = true
    and (case when is_hard then s.difficulty = 'hard' else s.difficulty in ('easy','medium') end)
    and not exists (
      select 1 from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where gp."profilesId" = profileid and g."sudokusId" = s.id
    )
  order by random()
  limit 1;
  if not found then
    return query
    select s.* from public.sudokus s
    where s."isPublished" = true
      and (case when is_hard then s.difficulty = 'hard' else s.difficulty in ('easy','medium') end)
    order by random()
    limit 1;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_available_ranked_sudoku"("player_one_id" uuid, "player_two_id" uuid, "is_hard" boolean)
RETURNS SETOF "public"."sudokus"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select s.* from public.sudokus s
  where s."isPublished" = true
    and (case when is_hard then s.difficulty = 'hard' else s.difficulty in ('easy','medium') end)
    and not exists (
      select 1 from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."sudokusId" = s.id
        and gp."profilesId" in (player_one_id, player_two_id)
    )
  order by random()
  limit 1;
  if not found then
    return query
    select s.* from public.sudokus s
    where s."isPublished" = true
      and (case when is_hard then s.difficulty = 'hard' else s.difficulty in ('easy','medium') end)
    order by random()
    limit 1;
  end if;
end;
$$;
