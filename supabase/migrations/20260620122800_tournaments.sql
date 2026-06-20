-- Tournament mode: fully-live 8-player single-elimination brackets.
-- Matches are normal `games` rows with gameType = 'TOURNAMENT' (so they reuse
-- the existing board, scoring, and Glicko-2 rating). The tables below track the
-- bracket: who is seeded where, the per-round matches, and who advances.
--
-- NOTE: run the ALTER TYPE line first on its own if your SQL editor wraps the
-- whole script in a transaction (a new enum value can't be used in the same
-- transaction it's added in — but nothing here uses it inline, so it's fine).

ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'TOURNAMENT';

-- Friendly "Play Again": when a friendly game ends, the first player to tap
-- Play Again creates the rematch and stamps its id here; the second player reads
-- it and joins that same game instead of starting a fresh invite. Lets both
-- sides auto-reconnect without re-sharing the code.
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "rematchGamesId" uuid
  REFERENCES "games"("id");

-- A tournament instance.
--   status: FILLING (gathering players) -> IN_PROGRESS -> COMPLETED
CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" text NOT NULL DEFAULT 'FILLING',
  "size" integer NOT NULL DEFAULT 8,
  "winnerId" uuid REFERENCES "profiles"("id"),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "startedAt" timestamptz,
  "completedAt" timestamptz
);

-- A seat in a tournament (a human or a bot fills it). seat 0..7 = bracket slot.
CREATE TABLE IF NOT EXISTS "tournamentPlayers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tournamentsId" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "profilesId" uuid NOT NULL REFERENCES "profiles"("id"),
  "seat" integer,
  "isBot" boolean NOT NULL DEFAULT false,
  "eliminated" boolean NOT NULL DEFAULT false,
  "joinedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tournamentsId", "profilesId")
);

-- A single bracket match. round 1 = quarterfinal (4), 2 = semifinal (2),
-- 3 = final (1). matchIndex is the slot within the round (0-based).
CREATE TABLE IF NOT EXISTS "tournamentMatches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tournamentsId" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "round" integer NOT NULL,
  "matchIndex" integer NOT NULL,
  "playerOneId" uuid REFERENCES "profiles"("id"),
  "playerTwoId" uuid REFERENCES "profiles"("id"),
  "gamesId" uuid REFERENCES "games"("id"),
  "winnerId" uuid REFERENCES "profiles"("id"),
  "status" text NOT NULL DEFAULT 'PENDING', -- PENDING | PLAYING | COMPLETED
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  -- guards against double-creating a round under concurrent finishes
  UNIQUE ("tournamentsId", "round", "matchIndex")
);

CREATE INDEX IF NOT EXISTS "tournamentPlayers_tournamentsId_idx"
  ON "tournamentPlayers" ("tournamentsId");
CREATE INDEX IF NOT EXISTS "tournamentMatches_tournamentsId_idx"
  ON "tournamentMatches" ("tournamentsId");
CREATE INDEX IF NOT EXISTS "tournamentMatches_gamesId_idx"
  ON "tournamentMatches" ("gamesId");

-- RLS: clients (anon key) only read to render the bracket; all writes go through
-- the backend with the service-role key, which bypasses RLS.
ALTER TABLE "tournaments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tournamentPlayers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tournamentMatches" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_select" ON "tournaments";
CREATE POLICY "tournaments_select" ON "tournaments"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tournamentPlayers_select" ON "tournamentPlayers";
CREATE POLICY "tournamentPlayers_select" ON "tournamentPlayers"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tournamentMatches_select" ON "tournamentMatches";
CREATE POLICY "tournamentMatches_select" ON "tournamentMatches"
  FOR SELECT TO anon, authenticated USING (true);

-- Deliver realtime row changes to subscribed clients (bracket live updates).
ALTER PUBLICATION supabase_realtime ADD TABLE "tournaments";
ALTER PUBLICATION supabase_realtime ADD TABLE "tournamentPlayers";
ALTER PUBLICATION supabase_realtime ADD TABLE "tournamentMatches";
