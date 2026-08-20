#!/usr/bin/env bash
# Stop the local Postgres started by up.sh. Pass --destroy to delete its data directory.
set -euo pipefail

PGDATA_DIR="${LOCAL_DB_DATA:-${TMPDIR:-/tmp}/crossed-local-db/pgdata}"
PG_BIN="${LOCAL_DB_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)}"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || echo /usr/bin/false)")}"

RUNAS=(); [ "$(id -u)" -eq 0 ] && RUNAS=(sudo -u postgres)

if [ -d "$PGDATA_DIR" ]; then
  "${RUNAS[@]}" "$PG_BIN/pg_ctl" -D "$PGDATA_DIR" -m fast stop >/dev/null 2>&1 && echo "stopped" || echo "not running"
else
  echo "no cluster at $PGDATA_DIR"
fi

if [ "${1:-}" = "--destroy" ]; then
  rm -rf "$PGDATA_DIR"
  echo "removed $PGDATA_DIR"
fi
