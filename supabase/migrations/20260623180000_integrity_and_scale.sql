-- ============================================================================
-- PRE-RELEASE HARDENING: integrity lockdown, scale indexes, atomic tournaments
--
-- The whole game lifecycle is client-driven (the app writes games/gamePlayers/
-- profiles directly with the "authenticated" role; only finish/forfeit go
-- through the service-role backend). This migration locks the columns the
-- client must NEVER write — winnerId, playState='COMPLETED', gamePlayers.score,
-- and profile rating/type/userId — WITHOUT enabling RLS on games (so reads,
-- realtime, and gameState sync are untouched). Clients can still do everything
-- they legitimately do today (create solo/friendly/ranked-bot games, start
-- them, write progress, abort, rematch).
--
-- Role check: PostgREST runs client requests as role 'authenticated' (or
-- 'anon') and the backend as 'service_role'; triggers fire for all of them, so
-- `current_user IN ('anon','authenticated')` reliably means "client write".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SCALE: indexes the hot paths were missing
-- ---------------------------------------------------------------------------
-- puzzle-selection filters on isPublished; partial index keeps it tiny
CREATE INDEX IF NOT EXISTS "crosswords_isPublished_idx" ON "public"."crosswords" ("isPublished") WHERE "isPublished";
CREATE INDEX IF NOT EXISTS "sudokus_isPublished_idx" ON "public"."sudokus" ("isPublished") WHERE "isPublished";
-- word-spacing recency query: WHERE profilesId ... ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS "seenClues_profile_recent_idx" ON "public"."seenClues" ("profilesId", "createdAt" DESC);
-- reverse lookup of a player's games (head_to_head, history); PK is (gamesId, profilesId)
CREATE INDEX IF NOT EXISTS "gamePlayers_profile_game_idx" ON "public"."gamePlayers" ("profilesId", "gamesId");

-- ---------------------------------------------------------------------------
-- 2. INTEGRITY: profiles — clients cannot forge rating / type / identity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."guard_profiles_write"() RETURNS trigger
    LANGUAGE plpgsql AS $$
begin
  if current_user in ('anon','authenticated') then
    if TG_OP = 'INSERT' then
      -- a client may only create its own HUMAN profile at the default rating
      if NEW."userId" is distinct from (auth.jwt() ->> 'sub') then
        raise exception 'cannot create a profile for another user';
      end if;
      NEW."type" := 'USER';
      NEW."eloRating" := 1000;
      NEW."eloRatingSudoku" := 1000;
      NEW."ratingDeviation" := 350;
      NEW."ratingDeviationSudoku" := 350;
      NEW."volatility" := 0.06;
      NEW."volatilitySudoku" := 0.06;
    else -- UPDATE
      if NEW."eloRating"            is distinct from OLD."eloRating"
        or NEW."eloRatingSudoku"     is distinct from OLD."eloRatingSudoku"
        or NEW."ratingDeviation"     is distinct from OLD."ratingDeviation"
        or NEW."ratingDeviationSudoku" is distinct from OLD."ratingDeviationSudoku"
        or NEW."volatility"          is distinct from OLD."volatility"
        or NEW."volatilitySudoku"    is distinct from OLD."volatilitySudoku"
        or NEW."type"                is distinct from OLD."type"
        or NEW."userId"              is distinct from OLD."userId" then
        raise exception 'rating/type/userId are read-only from the client';
      end if;
    end if;
  end if;
  return NEW;
end; $$;

DROP TRIGGER IF EXISTS "guard_profiles_write" ON "public"."profiles";
CREATE TRIGGER "guard_profiles_write" BEFORE INSERT OR UPDATE ON "public"."profiles"
  FOR EACH ROW EXECUTE FUNCTION "public"."guard_profiles_write"();

-- ---------------------------------------------------------------------------
-- 3. INTEGRITY: games — clients cannot set winnerId or mark a game COMPLETED,
--    nor insert a pre-won / pre-completed / tournament game
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."guard_games_write"() RETURNS trigger
    LANGUAGE plpgsql AS $$
begin
  if current_user in ('anon','authenticated') then
    if TG_OP = 'INSERT' then
      if NEW."winnerId" is not null
        or NEW."playState" = 'COMPLETED'
        or NEW."gameType" = 'TOURNAMENT' then
        raise exception 'clients cannot create completed/won/tournament games';
      end if;
    else -- UPDATE: only the backend may declare a winner or complete a game
      if NEW."winnerId" is distinct from OLD."winnerId" then
        raise exception 'winnerId is set by the server only';
      end if;
      if NEW."playState" = 'COMPLETED' and OLD."playState" is distinct from 'COMPLETED' then
        raise exception 'games are completed by the server only';
      end if;
    end if;
  end if;
  return NEW;
end; $$;

DROP TRIGGER IF EXISTS "guard_games_write" ON "public"."games";
CREATE TRIGGER "guard_games_write" BEFORE INSERT OR UPDATE ON "public"."games"
  FOR EACH ROW EXECUTE FUNCTION "public"."guard_games_write"();

-- ---------------------------------------------------------------------------
-- 4. INTEGRITY: revoke the writes clients never legitimately perform
--    (score is written by the backend; games/players are never deleted by the
--    client; queue rows are owner-scoped below). service_role is unaffected.
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON TABLE "public"."gamePlayers" FROM "anon", "authenticated";
REVOKE DELETE ON TABLE "public"."games" FROM "anon", "authenticated";
REVOKE DELETE ON TABLE "public"."profiles" FROM "anon", "authenticated";

-- ---------------------------------------------------------------------------
-- 5. INTEGRITY: rankedQueue — a client may only touch its OWN queue row
--    (was FOR ALL USING(true); let users fake ratings / grief others' rows)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rankedQueue_all" ON "public"."rankedQueue";
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."rankedQueue";
CREATE POLICY "rankedQueue_owner" ON "public"."rankedQueue" FOR ALL TO "authenticated"
  USING ("profilesId" IN (SELECT "id" FROM "public"."profiles" WHERE "userId" = auth.jwt() ->> 'sub'))
  WITH CHECK ("profilesId" IN (SELECT "id" FROM "public"."profiles" WHERE "userId" = auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- 6. CONCURRENCY: atomic tournament seat-claim + start-claim (fixes overfill
--    and double-start races — read-count-then-insert had no capacity lock)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."claim_tournament_seat"("p_tournament" uuid, "p_profile" uuid, "p_is_bot" boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql AS $$
declare cap int; seated int;
begin
  -- lock the tournament row so concurrent claims serialize
  select size into cap from public.tournaments where id = p_tournament for update;
  if cap is null then return 'no_tournament'; end if;
  select count(*) into seated from public."tournamentPlayers" where "tournamentsId" = p_tournament;
  if seated >= cap then return 'full'; end if;
  insert into public."tournamentPlayers"("tournamentsId","profilesId","isBot")
    values (p_tournament, p_profile, p_is_bot)
    on conflict ("tournamentsId","profilesId") do nothing;
  select count(*) into seated from public."tournamentPlayers" where "tournamentsId" = p_tournament;
  if seated >= cap then return 'seated_full'; else return 'seated'; end if;
end; $$;

-- atomically claim the FILLING->IN_PROGRESS transition; true = this caller won
CREATE OR REPLACE FUNCTION "public"."claim_tournament_start"("p_tournament" uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
declare n int;
begin
  update public.tournaments set status = 'IN_PROGRESS'
    where id = p_tournament and status = 'FILLING';
  get diagnostics n = row_count;
  return n > 0;
end; $$;

GRANT EXECUTE ON FUNCTION "public"."claim_tournament_seat"(uuid, uuid, boolean) TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."claim_tournament_start"(uuid) TO "anon", "authenticated", "service_role";

-- ---------------------------------------------------------------------------
-- 7. SCALE: bound seenClues growth. Keeps the recency window intact (active
--    users' recent 300 words are well within 60 days). Schedule via pg_cron or
--    call periodically: select public.prune_seen_clues();
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."prune_seen_clues"() RETURNS void
    LANGUAGE sql AS $$
  delete from public."seenClues" where "createdAt" < now() - interval '60 days';
$$;

-- ---------------------------------------------------------------------------
-- 8. SCALE: single-leader matchmaking. Every Railway replica runs the poller;
--    a DB-backed lease (pool-safe, unlike session advisory locks) ensures only
--    ONE replica does the O(n) pairing each tick — so 1000 simultaneous ranked
--    joins are paired by a single matcher with no cross-replica contention or
--    duplicated scans. Lease auto-expires if the leader dies.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."matchmakerLease" (
  "id" int PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "holder" text,
  "expiresAt" timestamptz NOT NULL DEFAULT now()
);
INSERT INTO "public"."matchmakerLease" ("id", "expiresAt") VALUES (1, now())
  ON CONFLICT ("id") DO NOTHING;

CREATE OR REPLACE FUNCTION "public"."acquire_matchmaker_lease"("p_holder" text, "p_ttl_seconds" int)
RETURNS boolean LANGUAGE plpgsql AS $$
declare n int;
begin
  update public."matchmakerLease"
    set "holder" = p_holder,
        "expiresAt" = now() + make_interval(secs => p_ttl_seconds)
    where "id" = 1 and ("expiresAt" < now() or "holder" = p_holder);
  get diagnostics n = row_count;
  return n > 0;
end; $$;

GRANT EXECUTE ON FUNCTION "public"."acquire_matchmaker_lease"(text, int) TO "service_role";
