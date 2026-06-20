-- Ranked matchmaking queue. Replaces the fragile realtime-presence approach:
-- the backend never reliably received presence, so two real players in the
-- lobby were never paired and both fell back to bots. Now the client writes a
-- row here on entering the ranked lobby, the backend polls + pairs, and the
-- client polls for the created game. No server-side realtime dependency.

CREATE TABLE IF NOT EXISTS "rankedQueue" (
  "profilesId" uuid PRIMARY KEY REFERENCES "profiles"("id") ON DELETE CASCADE,
  "rating" numeric NOT NULL DEFAULT 1000,
  "joinedAt" timestamptz NOT NULL DEFAULT now()
);

-- The client (anon key) manages its own queue entry; the backend uses the
-- service-role key (bypasses RLS) to read + clear the queue when it pairs.
ALTER TABLE "rankedQueue" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rankedQueue_all" ON "rankedQueue";
CREATE POLICY "rankedQueue_all" ON "rankedQueue"
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
