-- Async ghost-race challenges. Self-contained enough that a recipient (even a
-- brand-new anon user) can read one by id and race it. Public select; any
-- authenticated user can create their own.
create table if not exists "public"."challenges" ("id" uuid primary key default gen_random_uuid(), "challengerId" uuid, "challengerName" text, "gameVariant" text not null default 'CROSSWORD', "crosswordsId" uuid, "difficulty" text not null default 'REGULAR', "resolvedClues" jsonb, "solveSeconds" integer, "timeline" jsonb, "createdAt" timestamp without time zone not null default now());

alter table "public"."challenges" enable row level security;

create policy "challenges_select_all" on "public"."challenges" for select to anon, authenticated using (true);

create policy "challenges_insert_auth" on "public"."challenges" for insert to authenticated with check (true);

grant select on "public"."challenges" to anon, authenticated;

grant insert on "public"."challenges" to authenticated;
