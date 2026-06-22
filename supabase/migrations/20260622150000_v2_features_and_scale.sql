-- v2: per-variant ratings, private tournaments, never-repeat clue tracking,
-- plus correctness + scale fixes from the audit. Safe to re-run (idempotent).

-- ============================================================================
-- 1. PER-VARIANT RATINGS
-- Crossword keeps the existing eloRating/ratingDeviation/volatility columns;
-- sudoku gets its own trio so the two ladders (and leaderboards) are separate.
-- ============================================================================
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "ratingDeviation" double precision NOT NULL DEFAULT 350;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "volatility" double precision NOT NULL DEFAULT 0.06;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "eloRatingSudoku" double precision NOT NULL DEFAULT 1000;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "ratingDeviationSudoku" double precision NOT NULL DEFAULT 350;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "volatilitySudoku" double precision NOT NULL DEFAULT 0.06;

-- ============================================================================
-- 2. PRIVATE TOURNAMENTS
-- A tournament can be public (anyone joins) or private (invite-only). Invites
-- live in their own table.
-- ============================================================================
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "isPrivate" boolean NOT NULL DEFAULT false;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "createdByProfileId" uuid REFERENCES "profiles"("id");

CREATE TABLE IF NOT EXISTS "tournamentInvites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tournamentsId" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "invitedProfileId" uuid NOT NULL REFERENCES "profiles"("id"),
  "status" text NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | DECLINED
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tournamentsId", "invitedProfileId")
);
ALTER TABLE "tournamentInvites" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tournamentInvites_select" ON "tournamentInvites";
CREATE POLICY "tournamentInvites_select" ON "tournamentInvites"
  FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS "tournamentInvites_invitedProfileId_idx"
  ON "tournamentInvites" ("invitedProfileId");
CREATE INDEX IF NOT EXISTS "tournamentInvites_tournamentsId_idx"
  ON "tournamentInvites" ("tournamentsId");
ALTER PUBLICATION supabase_realtime ADD TABLE "tournamentInvites";

-- ============================================================================
-- 3. NEVER-REPEAT (word, clue) PAIRS
-- Per-user log of every (word, clue) pair a player has been served, so clue
-- resolution at game-creation time can pick a pair they haven't seen.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "seenClues" (
  "profilesId" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "word" text NOT NULL,
  "clue" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("profilesId", "word", "clue")
);

-- Per-game resolved clues: when a crossword game is created we swap each word's
-- baked clue for one the player hasn't seen (never-repeat). Stored per-game so
-- both players see the same override without mutating the shared crossword row.
-- NULL = use the crossword's baked clues.
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "resolvedClues" jsonb;
ALTER TABLE "seenClues" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seenClues_all" ON "seenClues";
CREATE POLICY "seenClues_all" ON "seenClues"
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS "seenClues_profilesId_idx" ON "seenClues" ("profilesId");

-- Head-to-head record between two players across all their completed games
-- (used on a friend's profile). SECURITY DEFINER so the client can call it.
CREATE OR REPLACE FUNCTION "public"."head_to_head"("viewer_id" uuid, "opponent_id" uuid)
RETURNS TABLE("viewer_wins" integer, "opponent_wins" integer, "ties" integer, "total" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  with shared as (
    select g.id, g."winnerId"
    from public.games g
    where g."playState" = 'COMPLETED'
      and exists (select 1 from public."gamePlayers" gp
                  where gp."gamesId" = g.id and gp."profilesId" = viewer_id)
      and exists (select 1 from public."gamePlayers" gp
                  where gp."gamesId" = g.id and gp."profilesId" = opponent_id)
  )
  select
    count(*) filter (where "winnerId" = viewer_id)::int,
    count(*) filter (where "winnerId" = opponent_id)::int,
    count(*) filter (where "winnerId" is null
                       or ("winnerId" <> viewer_id and "winnerId" <> opponent_id))::int,
    count(*)::int
  from shared;
$$;

-- The multi-clue bank, seeded from curated-words.mjs by a script. Lets clue
-- resolution happen server/DB-side instead of being baked into each puzzle.
CREATE TABLE IF NOT EXISTS "wordClues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "word" text NOT NULL,
  "clue" text NOT NULL,
  UNIQUE ("word", "clue")
);
ALTER TABLE "wordClues" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wordClues_select" ON "wordClues";
CREATE POLICY "wordClues_select" ON "wordClues"
  FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS "wordClues_word_idx" ON "wordClues" ("word");

-- ============================================================================
-- 4. SCALE: missing indexes on hot query paths (audit S5)
-- ============================================================================
CREATE INDEX IF NOT EXISTS "gamePlayers_profilesId_idx" ON "gamePlayers" ("profilesId");
CREATE INDEX IF NOT EXISTS "games_crosswordsId_idx" ON "games" ("crosswordsId");
CREATE INDEX IF NOT EXISTS "games_sudokusId_idx" ON "games" ("sudokusId");
CREATE INDEX IF NOT EXISTS "games_type_state_idx" ON "games" ("gameType", "playState");
CREATE INDEX IF NOT EXISTS "games_createdAt_idx" ON "games" ("createdAt");
CREATE INDEX IF NOT EXISTS "tournamentPlayers_profilesId_idx" ON "tournamentPlayers" ("profilesId");
CREATE INDEX IF NOT EXISTS "rankedQueue_joinedAt_idx" ON "rankedQueue" ("joinedAt");

-- NOTE (audit S1 / rankedQueue policy): games, gamePlayers, and rankedQueue
-- have permissive client access. Locking these down requires moving authoritative
-- writes to the service-role backend and is a deliberate, test-required change —
-- intentionally NOT done blind here (it would break live matchmaking/play).

-- ============================================================================
-- 5. CORRECTNESS + SCALE: rewrite get_available_* RPCs as NULL-safe NOT EXISTS
-- anti-joins (audit S5). The old NOT IN broke crossword dedup for any user who
-- had played a sudoku game (sudoku rows have crosswordsId = NULL, and
-- `x NOT IN (.., NULL)` is never true). NOT EXISTS is null-safe and uses the
-- new indexes. Keeps the size-weighting + least-recently-played fallback.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."get_available_crossword"("profileid" "uuid")
RETURNS TABLE("id" "uuid", "size" integer, "difficulty" integer, "isPublished" boolean, "source" "public"."CrosswordSource", "category" "public"."CrosswordCategory", "puzzle" "text"[], "solution" "text"[], "clues" "jsonb", "createdAt" timestamp without time zone, "usedWords" "text"[])
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
         c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
  from public.crosswords c
  where c."isPublished" = true
    and not exists (
      select 1 from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where gp."profilesId" = profileid and g."crosswordsId" = c.id
    )
  order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
  limit 1;
  if not found then
    return query
    select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
           c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
    from public.crosswords c
    where c."isPublished" = true
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."crosswordsId" = c.id and gp."profilesId" = profileid
    ) asc nulls first,
    power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid")
RETURNS SETOF "public"."crosswords"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select c.* from public.crosswords c
  where c."isPublished" = true
    and not exists (
      select 1 from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."crosswordsId" = c.id
        and gp."profilesId" in (player_one_id, player_two_id)
    )
  order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
  limit 1;
  if not found then
    return query
    select c.* from public.crosswords c
    where c."isPublished" = true
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."crosswordsId" = c.id
        and gp."profilesId" in (player_one_id, player_two_id)
    ) asc nulls first,
    power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_available_sudoku"("profileid" uuid)
RETURNS SETOF "public"."sudokus"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select s.* from public.sudokus s
  where s."isPublished" = true
    and not exists (
      select 1 from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where gp."profilesId" = profileid and g."sudokusId" = s.id
    )
  order by random()
  limit 1;
  if not found then
    return query
    select s.* from public.sudokus s where s."isPublished" = true
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."sudokusId" = s.id and gp."profilesId" = profileid
    ) asc nulls first, random()
    limit 1;
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
    select s.* from public.sudokus s where s."isPublished" = true
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."sudokusId" = s.id
        and gp."profilesId" in (player_one_id, player_two_id)
    ) asc nulls first, random()
    limit 1;
  end if;
end;
$$;
