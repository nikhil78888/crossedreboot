-- Per-player "seen question" log so trivia never repeats a question across games
-- until the player has exhausted the bank (parallel to the crossword seenClues
-- system). The client records the questions shown each game and excludes them
-- when building the next quiz. Permissive RLS like the other client-written
-- tables (auth is via a backend-issued token).
create table if not exists "public"."seen_trivia" (
  "id" uuid primary key default gen_random_uuid(),
  "profilesId" uuid not null,
  "questionId" text not null,
  "createdAt" timestamp without time zone not null default now()
);

create index if not exists "seen_trivia_profile_idx"
  on "public"."seen_trivia" ("profilesId", "createdAt" desc);

alter table "public"."seen_trivia" enable row level security;

create policy "seen_trivia_select" on "public"."seen_trivia"
  for select to anon, authenticated using (true);
create policy "seen_trivia_insert" on "public"."seen_trivia"
  for insert to authenticated with check (true);

grant select on "public"."seen_trivia" to anon, authenticated;
grant insert on "public"."seen_trivia" to authenticated;
