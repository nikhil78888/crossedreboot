-- Closes the challenge loop: when someone accepts a shared challenge and races
-- the challenger's ghost, we record the outcome here so the ORIGINAL challenger
-- gets feedback ("X beat your time!" / "your time held"). One challenge link can
-- be accepted by many people, so this is one-to-many off challenges. Denormalized
-- challengerId so the challenger can poll their own results with a single eq().
create table if not exists "public"."challenge_results" (
  "id" uuid primary key default gen_random_uuid(),
  "challengeId" uuid references "public"."challenges"("id") on delete cascade,
  "challengerId" uuid not null,        -- who to give feedback to (the original challenger)
  "opponentId" uuid not null,          -- who accepted + raced the ghost
  "opponentName" text,
  "gameVariant" text not null default 'CROSSWORD',
  "challengerSeconds" integer not null, -- the time to beat (snapshot of the challenge)
  "opponentSeconds" integer not null,   -- the accepter's solve time
  "opponentWon" boolean not null,       -- did the accepter beat the challenger?
  "seenByChallenger" boolean not null default false,
  "createdAt" timestamp without time zone not null default now()
);

-- The challenger's feed: their unseen results, newest first.
create index if not exists "challenge_results_challenger_idx"
  on "public"."challenge_results" ("challengerId", "createdAt" desc);

alter table "public"."challenge_results" enable row level security;

-- Mirror the challenges table's permissive model (auth is via a backend-issued
-- token; policies don't key on auth.uid()).
create policy "challenge_results_select_all" on "public"."challenge_results"
  for select to anon, authenticated using (true);

create policy "challenge_results_insert_auth" on "public"."challenge_results"
  for insert to authenticated with check (true);

create policy "challenge_results_update_auth" on "public"."challenge_results"
  for update to authenticated using (true) with check (true);

grant select on "public"."challenge_results" to anon, authenticated;
grant insert on "public"."challenge_results" to authenticated;
grant update on "public"."challenge_results" to authenticated;
