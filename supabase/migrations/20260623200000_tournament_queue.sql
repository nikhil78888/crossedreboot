-- ============================================================================
-- QUEUE-BASED TOURNAMENT MATCHMAKING
-- Direct synchronous tournament joins don't pack cleanly under a burst (lots of
-- clients targeting the same "oldest filling" tournament → lock contention +
-- fragmented partial brackets). This mirrors ranked matchmaking: clients enqueue
-- into tournamentQueue, and a single-leader matcher batches waiting players into
-- clean 8-person tournaments (bot-filling stragglers after a short wait).
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."tournamentQueue" ("profilesId" uuid PRIMARY KEY REFERENCES "public"."profiles"("id") ON DELETE CASCADE, "gameVariant" text NOT NULL DEFAULT 'CROSSWORD', "difficulty" text NOT NULL DEFAULT 'REGULAR', "joinedAt" timestamptz NOT NULL DEFAULT now());
ALTER TABLE "public"."tournamentQueue" ENABLE ROW LEVEL SECURITY;
-- a client may only touch its own queue row (mirrors rankedQueue_owner)
DROP POLICY IF EXISTS "tournamentQueue_owner" ON "public"."tournamentQueue";
CREATE POLICY "tournamentQueue_owner" ON "public"."tournamentQueue" FOR ALL TO "authenticated"
  USING ("profilesId" IN (SELECT "id" FROM "public"."profiles" WHERE "userId" = auth.jwt() ->> 'sub'))
  WITH CHECK ("profilesId" IN (SELECT "id" FROM "public"."profiles" WHERE "userId" = auth.jwt() ->> 'sub'));
CREATE INDEX IF NOT EXISTS "tournamentQueue_joinedAt_idx" ON "public"."tournamentQueue" ("joinedAt");

-- Generic named single-leader lease (separate from the ranked matchmaker lease,
-- so the tournament matcher and ranked matcher don't block each other).
CREATE TABLE IF NOT EXISTS "public"."serviceLease" ("name" text PRIMARY KEY, "holder" text, "expiresAt" timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION "public"."acquire_lease"("p_name" text, "p_holder" text, "p_ttl_seconds" int)
RETURNS boolean LANGUAGE plpgsql AS $$
declare n int;
begin
  insert into public."serviceLease"("name","holder","expiresAt")
    values (p_name, p_holder, now() + make_interval(secs => p_ttl_seconds))
    on conflict ("name") do update
      set "holder" = p_holder,
          "expiresAt" = now() + make_interval(secs => p_ttl_seconds)
      where public."serviceLease"."expiresAt" < now()
         or public."serviceLease"."holder" = p_holder;
  get diagnostics n = row_count;
  return n > 0;
end; $$;
GRANT EXECUTE ON FUNCTION "public"."acquire_lease"(text, text, int) TO "service_role";
