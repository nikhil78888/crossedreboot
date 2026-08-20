#!/usr/bin/env bash
#
# Bring up a local Postgres that matches this project's Supabase schema, then
# fill it with synthetic data.
#
#   ./scripts/local-db/up.sh              # init + migrate + seed
#   ./scripts/local-db/up.sh --no-seed    # schema only
#   ./scripts/local-db/up.sh --reset      # drop the cluster and start over
#
# Prefer `supabase start` when Docker is available — it gives you Auth, PostgREST,
# Storage and Realtime as well. This script exists for environments without a
# Docker daemon: it is Postgres only.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$REPO_ROOT/scripts/local-db"

PGPORT="${LOCAL_DB_PORT:-54322}"
PGDATABASE="${LOCAL_DB_NAME:-crossed}"
PGDATA_DIR="${LOCAL_DB_DATA:-${TMPDIR:-/tmp}/crossed-local-db/pgdata}"
LOGFILE="${LOCAL_DB_LOG:-${TMPDIR:-/tmp}/crossed-local-db/postgres.log}"
PG_BIN="${LOCAL_DB_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)}"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || echo /usr/bin/false)")}"

SEED=1
RESET=0
for arg in "$@"; do
  case "$arg" in
    --no-seed) SEED=0 ;;
    --reset)   RESET=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

[ -x "$PG_BIN/initdb" ] || { echo "postgres server binaries not found (looked in '$PG_BIN')" >&2; exit 1; }

# initdb and postgres refuse to run as root, so drop to a service account when we are.
RUNAS=()
if [ "$(id -u)" -eq 0 ]; then
  RUNAS=(sudo -u postgres)
  install -d -o postgres -g postgres "$(dirname "$PGDATA_DIR")" "$(dirname "$LOGFILE")"
  # the whole path has to be traversable by that account
  d="$(dirname "$PGDATA_DIR")"
  while [ "$d" != "/" ]; do chmod o+x "$d" 2>/dev/null || true; d="$(dirname "$d")"; done
fi

pg() { "${RUNAS[@]}" "$PG_BIN/$@"; }
psql_() { psql -h 127.0.0.1 -p "$PGPORT" -U postgres "$@"; }

if [ "$RESET" -eq 1 ] && [ -d "$PGDATA_DIR" ]; then
  echo "==> stopping and removing existing cluster"
  pg pg_ctl -D "$PGDATA_DIR" stop >/dev/null 2>&1 || true
  rm -rf "$PGDATA_DIR"
fi

if [ ! -s "$PGDATA_DIR/PG_VERSION" ]; then
  echo "==> initialising cluster at $PGDATA_DIR"
  rm -rf "$PGDATA_DIR"
  install -d ${RUNAS:+-o postgres -g postgres} -m 700 "$PGDATA_DIR"
  pg initdb -D "$PGDATA_DIR" -U postgres --auth=trust -E UTF8 >/dev/null
fi

if ! pg pg_ctl -D "$PGDATA_DIR" status >/dev/null 2>&1; then
  echo "==> starting postgres on port $PGPORT"
  : > "$LOGFILE"; [ ${#RUNAS[@]} -gt 0 ] && chown postgres:postgres "$LOGFILE"
  # wal_level=logical keeps the supabase_realtime publication happy
  pg pg_ctl -D "$PGDATA_DIR" -l "$LOGFILE" \
    -o "-p $PGPORT -c listen_addresses=127.0.0.1 -c wal_level=logical" -w start >/dev/null
fi

echo "==> (re)creating database $PGDATABASE"
psql_ -d postgres -q -c "DROP DATABASE IF EXISTS \"$PGDATABASE\" WITH (FORCE);" \
                     -c "CREATE DATABASE \"$PGDATABASE\";"

echo "==> applying Supabase compatibility shim"
psql_ -d "$PGDATABASE" -q -v ON_ERROR_STOP=1 -f "$HERE/supabase-shim.sql" 2>/dev/null

echo "==> applying migrations"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  # these extensions only exist on Supabase's Postgres image
  sed -E 's/^(CREATE EXTENSION IF NOT EXISTS "?(pgsodium|pg_graphql|pgjwt|supabase_vault)"?.*)$/-- [local-db] \1/' \
    "$f" > "$work/$name"
  if psql_ -d "$PGDATABASE" -q -v ON_ERROR_STOP=1 -f "$work/$name" > "$work/$name.log" 2>&1; then
    echo "    ok   $name"
  else
    echo "    FAIL $name" >&2
    grep -iE 'ERROR|DETAIL|HINT' "$work/$name.log" | head -5 >&2
    exit 1
  fi
done

if [ "$SEED" -eq 1 ]; then
  echo "==> generating seed data"
  psql_ -d "$PGDATABASE" -tAF$'\t' -c "select word, clue, difficulty from \"wordClues\" where word ~ '^[A-Z]+\$'" > "$work/wordclues.tsv"
  node "$HERE/gen-seed.js" "$work"
  psql_ -d "$PGDATABASE" -q -v ON_ERROR_STOP=1 -f "$work/seed-data.sql"
  echo "==> seeded"
fi

URL="postgresql://postgres@127.0.0.1:$PGPORT/$PGDATABASE"
cat <<INFO

Local database is up.

  DATABASE_URL="$URL"
  psql "$URL"

  logs:  $LOGFILE
  stop:  ./scripts/local-db/down.sh
INFO
