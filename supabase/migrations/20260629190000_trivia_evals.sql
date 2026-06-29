-- Durable training set for trivia question quality, parallel to the clue `evals`
-- table. Log BOTH approved exemplars and denied/weak questions (with why) so
-- future trivia authoring is calibrated. Internal: RLS on with no policies, so
-- only the service role (scripts) can read/write it.
create table if not exists "public"."trivia_evals" (
  "id" uuid primary key default gen_random_uuid(),
  "question" text not null,
  "answer" text,
  "category" text,
  "difficulty" text,                 -- easy | medium | hard
  "verdict" text not null,           -- approved | denied
  "reasoning" text,
  "createdAt" timestamp without time zone not null default now()
);

alter table "public"."trivia_evals" enable row level security;
