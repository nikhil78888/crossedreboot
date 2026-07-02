-- Push notifications for re-engagement. The client stores its Expo push token on
-- the profile; a backend job nudges inactive users to come back. lastPushedAt
-- rate-limits so we never spam. The existing "update your own profile" RLS lets
-- the client write expoPushToken; lastPushedAt is written by the service role.
alter table "public"."profiles"
  add column if not exists "expoPushToken" text,
  add column if not exists "lastPushedAt" timestamp with time zone;

-- Fast lookup of push-eligible users for the re-engagement sweep.
create index if not exists "profiles_push_eligible_idx"
  on "public"."profiles" ("lastPushedAt")
  where "expoPushToken" is not null;
