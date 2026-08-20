# Local database

Brings up a PostgreSQL instance carrying this project's real schema — every file in
`supabase/migrations/` applied in order — plus synthetic data to query against.

Use this when Docker is unavailable. When Docker *is* available, prefer the real
thing (`supabase start`), which also gives you Auth, PostgREST, Storage and
Realtime; this script is Postgres only.

## Usage

```bash
./scripts/local-db/up.sh            # init cluster, migrate, seed
./scripts/local-db/up.sh --no-seed  # schema only
./scripts/local-db/up.sh --reset    # throw the cluster away and rebuild
./scripts/local-db/down.sh          # stop it
```

Then:

```bash
psql "postgresql://postgres@127.0.0.1:54322/crossed"
```

Point Prisma at it with `DATABASE_URL="postgresql://postgres@127.0.0.1:54322/crossed"`
in `packages/database/.env`.

Overridable via environment: `LOCAL_DB_PORT`, `LOCAL_DB_NAME`, `LOCAL_DB_DATA`,
`LOCAL_DB_LOG`, `LOCAL_DB_PG_BIN`.

Requires PostgreSQL **server** binaries (`initdb`, `postgres`, `pg_ctl`) — the
`postgresql` package, not just `postgresql-client` — and Node for the seeder.

## What the shim covers

`supabase-shim.sql` recreates the pieces of a Supabase project that the migrations
assume are already there:

- roles: `anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin`, …
- schemas: `auth`, `extensions`, `graphql`, `vault`, `pgsodium`, `storage`, `realtime`
- `auth.uid()`, `auth.jwt()`, `auth.role()`, `auth.email()` — same semantics as
  Supabase's, reading the `request.jwt.claims` GUC, so RLS policies behave the same
- a stand-in `auth.users` table (GoTrue owns the real one)
- the `supabase_realtime` publication

`up.sh` additionally comments out `CREATE EXTENSION` for `pgsodium`, `pg_graphql`,
`pgjwt` and `supabase_vault`, which ship only on Supabase's Postgres image. Nothing
in the migrations calls into them.

To exercise RLS the way the app hits it:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"<profiles.id>","role":"authenticated"}', true);
SELECT * FROM profiles;   -- now filtered by policy
COMMIT;
```

Keep it inside a transaction: `set_config(..., true)` is transaction-local, so
outside one the claims are gone by the next statement and `auth.uid()` reads NULL.

## Seed data

`gen-seed.js` writes 15 profiles (12 players + 3 bots), 12 crosswords, 40 games with
their players, friendships, ranked-queue entries and 120 analytics events. It is
seeded from a fixed PRNG, so repeated runs produce the same rows.

Crossword grids are filled by backtracking over `wordClues` — the 14,390-row corpus
that `20260703000000_expand_wordclues_from_puzzles.sql` already loads — so every
across and down entry is a real word paired with a real clue from the project's own
data, in the shape `crosswordSchema` expects.

**None of this is production data.** The container has no credentials for the hosted
Supabase project, and nothing here is derived from real users.
