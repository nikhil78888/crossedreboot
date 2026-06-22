-- Sudoku mode (full parity with crossword). Reuses games / gamePlayers /
-- matchmaking / tournaments; a game's "gameVariant" says whether it's a
-- crossword or a sudoku, and sudoku games point at a sudokus row.

CREATE TABLE IF NOT EXISTS "sudokus" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "puzzle" jsonb NOT NULL,      -- 9x9 of ints; 0 = blank
  "solution" jsonb NOT NULL,    -- 9x9 of ints; the full answer
  "difficulty" text NOT NULL DEFAULT 'medium',
  "isPublished" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "sudokus" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sudokus_select" ON "sudokus";
CREATE POLICY "sudokus_select" ON "sudokus"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "gameVariant" text NOT NULL DEFAULT 'CROSSWORD';
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "sudokusId" uuid REFERENCES "sudokus"("id");
-- A sudoku game has no crossword, so crosswordsId can no longer be required.
ALTER TABLE "games" ALTER COLUMN "crosswordsId" DROP NOT NULL;

-- Pick a sudoku the player hasn't seen (mirrors get_available_crossword).
CREATE OR REPLACE FUNCTION "public"."get_available_sudoku"("profileid" uuid)
RETURNS SETOF "public"."sudokus"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select s.* from public.sudokus s
  where s."isPublished" = true
    and s.id not in (
      select g."sudokusId" from public.games g
      where g."sudokusId" is not null and g.id in (
        select gp."gamesId" from public."gamePlayers" gp
        where gp."profilesId" = profileid
      )
    )
  order by random()
  limit 1;
  if not found then
    return query
    select s.* from public.sudokus s where s."isPublished" = true
    order by random() limit 1;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_available_ranked_sudoku"("player_one_id" uuid, "player_two_id" uuid)
RETURNS SETOF "public"."sudokus"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select s.* from public.sudokus s
  where s."isPublished" = true
    and s.id not in (
      select g."sudokusId" from public.games g
      where g."sudokusId" is not null and g.id in (
        select gp."gamesId" from public."gamePlayers" gp
        where gp."profilesId" = player_one_id or gp."profilesId" = player_two_id
      )
    )
  order by random()
  limit 1;
  if not found then
    return query
    select s.* from public.sudokus s where s."isPublished" = true
    order by random() limit 1;
  end if;
end;
$$;

-- Matchmaking + tournaments must keep crossword and sudoku players apart so a
-- sudoku seeker is never paired with a crossword seeker. Both reuse the existing
-- queue/bracket machinery, segmented by this column.
ALTER TABLE "rankedQueue" ADD COLUMN IF NOT EXISTS "gameVariant" text NOT NULL DEFAULT 'CROSSWORD';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "gameVariant" text NOT NULL DEFAULT 'CROSSWORD';
