// Season rating versioning.
//
// The season rating (profiles.seasonScore) resets to 1000 monthly. The seasonKey
// records which season a stored score belongs to. Prefixing it with a version
// lets us invalidate ALL prior season data at once (e.g. the earlier wins-based
// experiment wrote win-counts under a bare 'YYYY-MM' key) — a stale-prefixed key
// simply reads as "not the current season", so the next ranked game resets the
// player to 1000. No manual DB reset required.
export const SEASON_VERSION = "s2";

export const seasonKeyFor = (yyyymm: string): string =>
  `${SEASON_VERSION}:${yyyymm}`;

// The current season's key ('s2:YYYY-MM', UTC).
export const currentSeasonKey = (): string =>
  seasonKeyFor(new Date().toISOString().slice(0, 7));
