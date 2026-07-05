-- Matchmaking heartbeat. A client in the ranked lobby updates lastSeenAt every
-- few seconds. The matcher only pairs rows seen recently, so a backgrounded or
-- crashed client (which cannot reliably run any cleanup) becomes UNMATCHABLE
-- within seconds instead of lingering up to 90s and no-showing its opponent.
--
-- joinedAt is left untouched (it drives the rating-window widening + force-pair
-- timing); lastSeenAt is purely the liveness signal.
alter table "rankedQueue"
  add column if not exists "lastSeenAt" timestamptz not null default now();

-- Index the liveness column so the matcher's freshness filter + stale sweep stay
-- cheap under a big queue.
create index if not exists "rankedQueue_lastSeenAt_idx"
  on "rankedQueue" ("lastSeenAt");
