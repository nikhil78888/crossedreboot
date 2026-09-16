-- Medals + monthly season.
--
-- Two award types:
--   DAILY_DUEL     — finished in the top 10% of a day's Daily Duel
--   MONTHLY_SEASON — finished in the top 10% of a calendar month's ranked season
-- One medal per (profile, type, period). periodKey is 'YYYY-MM-DD' for daily and
-- 'YYYY-MM' for monthly. Awards are written by the API (service role); the table
-- is world-readable so a player's medal case can be shown to anyone.

create table if not exists "public"."medals" (
  "id" uuid primary key default gen_random_uuid(),
  "profileId" uuid not null references "public"."profiles" ("id") on delete cascade,
  "type" text not null,
  "periodKey" text not null,
  "rank" integer,
  "total" integer,
  "percentile" integer,
  "createdAt" timestamptz not null default now(),
  unique ("profileId", "type", "periodKey")
);

alter table "public"."medals" enable row level security;

create policy "medals are readable by everyone"
  on "public"."medals" for select using (true);

grant select on "public"."medals" to "anon", "authenticated", "service_role";
grant insert, delete on "public"."medals" to "service_role";

create index if not exists "medals_profileId_idx"
  on "public"."medals" ("profileId");

-- Monthly season score = ranked wins in the current calendar month. seasonKey is
-- the month the score belongs to ('YYYY-MM'); when a player's first ranked game
-- of a new month is finalized the score resets to 0 for the new key (lazy reset
-- in game.service). The season leaderboard reads these directly.
alter table "public"."profiles"
  add column if not exists "seasonScore" integer not null default 0;
alter table "public"."profiles"
  add column if not exists "seasonKey" text;

create index if not exists "profiles_season_idx"
  on "public"."profiles" ("seasonKey", "seasonScore" desc);
