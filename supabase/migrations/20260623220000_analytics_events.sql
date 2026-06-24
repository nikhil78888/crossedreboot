-- ============================================================================
-- PRODUCT ANALYTICS: lightweight event log (self-owned, queryable via SQL).
-- The client's trackEvent() writes here (fire-and-forget). Combined with the
-- existing games/profiles/tournaments tables, this covers funnels (paywall,
-- game start->finish, tournament), engagement, and retention without a 3rd-party
-- SDK / native rebuild. Clients can INSERT only; reads are service-role (admin).
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."analyticsEvents" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" text NOT NULL, "profilesId" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL, "properties" jsonb, "platform" text, "createdAt" timestamptz NOT NULL DEFAULT now());

ALTER TABLE "public"."analyticsEvents" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analyticsEvents_insert" ON "public"."analyticsEvents";
CREATE POLICY "analyticsEvents_insert" ON "public"."analyticsEvents" FOR INSERT TO "anon", "authenticated" WITH CHECK (true);

CREATE INDEX IF NOT EXISTS "analyticsEvents_name_createdAt_idx" ON "public"."analyticsEvents" ("name", "createdAt");
CREATE INDEX IF NOT EXISTS "analyticsEvents_createdAt_idx" ON "public"."analyticsEvents" ("createdAt");
CREATE INDEX IF NOT EXISTS "analyticsEvents_profile_idx" ON "public"."analyticsEvents" ("profilesId", "createdAt");
