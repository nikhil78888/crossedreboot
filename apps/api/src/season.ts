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

// The current calendar month ('YYYY-MM', UTC).
export const currentMonth = (): string =>
  new Date().toISOString().slice(0, 7);

// The current season's key ('s2:YYYY-MM', UTC).
export const currentSeasonKey = (): string => seasonKeyFor(currentMonth());

// The reset starts on the 1st of this month. Months BEFORE it are "lifetime
// seasons" — the Season board and its medal rank by the persistent lifetime
// rating. Months from here on RESET everyone to 1000 for a fresh monthly race.
// (Set to the month after launch so the current month keeps lifetime standings.)
export const FIRST_RESET_MONTH = "2026-10";

// Does this month use the reset (start-at-1000) season, or the lifetime board?
export const isResetSeason = (yyyymm: string): boolean =>
  yyyymm >= FIRST_RESET_MONTH;

// The earliest month the medal job will award — the system's launch month. Months
// before this predate the season system, so the job skips them (otherwise, on
// first deploy it would retroactively mint medals for, e.g., August).
export const FIRST_MEDAL_PERIOD = "2026-09";
