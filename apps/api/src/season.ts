// Season rating versioning + cadence.
//
// Seasons are now WEEKLY: the season rating (profiles.seasonScore) resets to
// 1000 each ISO week. The seasonKey records which season a stored score belongs
// to, prefixed with a version so bumping the version invalidates ALL prior
// season data at once (a stale-prefixed key reads as "not the current season",
// so the next ranked game resets the player to 1000 — no manual DB reset).
export const SEASON_VERSION = "s3"; // bumped from s2 when seasons went weekly

export const seasonKeyFor = (period: string): string =>
  `${SEASON_VERSION}:${period}`;

// ISO-8601 week key for a date, e.g. "2026-W39" (UTC, weeks start Monday).
export const isoWeek = (d: Date): string => {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // to the week's Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

// The current season period (ISO week, UTC).
export const currentPeriod = (): string => isoWeek(new Date());

// The current season's key ('s3:YYYY-Www', UTC).
export const currentSeasonKey = (): string => seasonKeyFor(currentPeriod());

// The period one week before now (for closing-out medal awards).
export const previousPeriod = (): string =>
  isoWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

// Whole days until the current week ends (next Monday 00:00 UTC).
export const daysUntilWeekReset = (): number => {
  const now = new Date();
  const dayNum = (now.getUTCDay() + 6) % 7; // Mon=0
  const nextMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  nextMonday.setUTCDate(nextMonday.getUTCDate() + (7 - dayNum));
  return Math.max(0, Math.ceil((nextMonday.getTime() - now.getTime()) / 86400000));
};

// The first week the reset season is active. Weeks BEFORE it are "lifetime
// seasons" — the Season board + its medal rank by the persistent lifetime
// rating. From this week on, everyone resets to 1000 each week for a fresh race.
export const FIRST_RESET_PERIOD = "2026-W40"; // week of Sep 28, 2026

// Does this period use the reset (start-at-1000) season, or the lifetime board?
export const isResetSeason = (period: string): boolean =>
  period >= FIRST_RESET_PERIOD;

// The earliest period the medal job will award — the system's launch week.
// Periods before this predate the season system and are skipped.
export const FIRST_MEDAL_PERIOD = "2026-W39";
