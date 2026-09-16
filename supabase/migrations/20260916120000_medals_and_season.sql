-- Medals (the trophy case).
--
-- Two award types:
--   DAILY_DUEL     — finished in the top 10% of a day's Daily Duel
--   MONTHLY_SEASON — finished in the top 10% of the ELO leaderboard when a month
--                    closed (the monthly "season" recognition)
-- One medal per (profile, type, period). periodKey is 'YYYY-MM-DD' for daily and
-- 'YYYY-MM' for monthly. Awards are written by the API (service role); the table
-- is world-readable so a player's trophy case can be shown to anyone.

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

-- Monthly season rating. seasonScore is a rating that RESETS to 1000 on the 1st
-- of each month and moves by the same per-game delta as the player's lifetime
-- rating; the leaderboard's Season view ranks by it. seasonKey is the month the
-- score belongs to ('YYYY-MM'); a stale key triggers a lazy reset in
-- game.service on the player's first ranked game of the new month. The lifetime
-- rating (profiles.eloRating & per-variant columns) is untouched and persists.
-- Per-variant season rating: one (score, key) pair per ladder, mirroring the
-- per-variant lifetime rating columns. seasonKey<Variant> is only set when that
-- variant is played this season, so a variant's board = players who actually
-- played it this month. (CROSSWORD reuses the base seasonScore/seasonKey names.)
alter table "public"."profiles"
  add column if not exists "seasonScore" integer not null default 0;
alter table "public"."profiles"
  add column if not exists "seasonKey" text;
alter table "public"."profiles"
  add column if not exists "seasonScoreSudoku" integer not null default 0;
alter table "public"."profiles"
  add column if not exists "seasonKeySudoku" text;
alter table "public"."profiles"
  add column if not exists "seasonScoreWordSearch" integer not null default 0;
alter table "public"."profiles"
  add column if not exists "seasonKeyWordSearch" text;
alter table "public"."profiles"
  add column if not exists "seasonScoreTrivia" integer not null default 0;
alter table "public"."profiles"
  add column if not exists "seasonKeyTrivia" text;

create index if not exists "profiles_season_idx"
  on "public"."profiles" ("seasonKey", "seasonScore" desc);
create index if not exists "profiles_season_sudoku_idx"
  on "public"."profiles" ("seasonKeySudoku", "seasonScoreSudoku" desc);
create index if not exists "profiles_season_wordsearch_idx"
  on "public"."profiles" ("seasonKeyWordSearch", "seasonScoreWordSearch" desc);
create index if not exists "profiles_season_trivia_idx"
  on "public"."profiles" ("seasonKeyTrivia", "seasonScoreTrivia" desc);
