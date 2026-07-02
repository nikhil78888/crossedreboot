-- Push the original challenger when someone races their challenge. A backend
-- worker sends a push for each challenge_results row that hasn't been notified
-- yet, then flips this flag. Mark all EXISTING rows notified so turning this on
-- doesn't blast users with pushes for old, already-seen results.
alter table "public"."challenge_results"
  add column if not exists "notified" boolean not null default false;

update "public"."challenge_results" set "notified" = true where "notified" = false;

create index if not exists "challenge_results_unnotified_idx"
  on "public"."challenge_results" ("createdAt")
  where "notified" = false;
