import { supabase } from "./lib/supabase";
import {
  seasonKeyFor,
  isResetSeason,
  previousPeriod,
  FIRST_MEDAL_PERIOD,
} from "./season";
import { ratingFieldsFor, ALL_VARIANTS } from "./rating-fields";

// Awards MONTHLY_SEASON medals to the top 10% of the SEASON leaderboard once a
// calendar month closes — the monthly "season" recognition. Runs hourly; it's a
// no-op after the month's medals exist (checked up front) and every write is
// idempotent, so it's safe to run repeatedly and on multiple replicas.
//
// Ranked by the season rating (profiles.seasonScore) for the just-closed month —
// the same value the leaderboard's Season view showed. The season rating resets
// lazily on each player's first ranked game of the new month, so we read the
// standings promptly at rollover: a player whose seasonKey still equals the
// closed month hasn't reset yet, which is the finishing order we want.

const HOUR = 60 * 60 * 1000;
const MIN_PARTICIPANTS = 10; // below this, "top 10%" isn't meaningful

type MedalsDb = {
  from: (t: "medals") => {
    select: (
      c: string,
      o?: { count: "exact"; head: true }
    ) => {
      eq: (
        k: string,
        v: string
      ) => {
        eq: (k: string, v: string) => Promise<{ count: number | null }>;
      };
    };
    upsert: (
      v: Record<string, unknown>[],
      o: { onConflict: string; ignoreDuplicates: boolean }
    ) => Promise<{ error: unknown }>;
  };
};

async function fetchAll<T>(
  build: (from: number, to: number) => Promise<{ data: T[] | null }>
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  const size = 1000;
  for (;;) {
    const { data } = await build(from, from + size - 1);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < size) break;
    from += size;
  }
  return out;
}

// Award the top 10% of ONE variant's closed-month board. Medal type encodes the
// variant ('MONTHLY_SEASON_CROSSWORD', …) so the (profileId, type, periodKey)
// uniqueness lets a player earn one per variant. Reset months rank by that
// variant's season rating; the launch month(s) rank by its lifetime rating.
const awardVariant = async (
  variant: (typeof ALL_VARIANTS)[number],
  periodKey: string,
  medalsDb: MedalsDb
): Promise<number> => {
  const type = `MONTHLY_SEASON_${variant}`;
  const f = ratingFieldsFor(variant);

  const { count: existing } = await medalsDb
    .from("medals")
    .select("id", { count: "exact", head: true })
    .eq("type", type)
    .eq("periodKey", periodKey);
  if ((existing || 0) > 0) return 0;

  const players: { id: string; score: number }[] = isResetSeason(periodKey)
    ? await fetchAll<{ id: string; score: number }>(async (from, to) => {
        const { data } = await supabase
          .from("profiles")
          .select(`id, s:${f.seasonScore}`)
          .neq("type", "BOT")
          .eq(f.seasonKey, seasonKeyFor(periodKey))
          .order(f.seasonScore, { ascending: false })
          .range(from, to);
        return {
          data: ((data as { id: string; s: number }[]) || []).map((r) => ({
            id: r.id,
            score: r.s,
          })),
        };
      })
    : await fetchAll<{ id: string; score: number }>(async (from, to) => {
        const { data } = await supabase
          .from("profiles")
          .select(`id, r:${f.rating}`)
          .neq("type", "BOT")
          .or(`${f.rating}.neq.1000,${f.rd}.neq.350`)
          .order(f.rating, { ascending: false })
          .range(from, to);
        return {
          data: ((data as { id: string; r: number }[]) || []).map((r) => ({
            id: r.id,
            score: Math.round(r.r),
          })),
        };
      });

  const total = players.length;
  if (total < MIN_PARTICIPANTS) return 0; // too small a ladder to award

  const cutoffRank = Math.max(1, Math.ceil(total * 0.1));
  let rank = 0;
  let last: number | null = null;
  const rows: Record<string, unknown>[] = [];
  players.forEach((p, i) => {
    if (last === null || p.score !== last) {
      rank = i + 1;
      last = p.score;
    }
    if (rank <= cutoffRank) {
      rows.push({
        profileId: p.id,
        type,
        periodKey,
        rank,
        total,
        percentile: Math.max(1, Math.round((100 * rank) / total)),
      });
    }
  });
  if (!rows.length) return 0;

  const { error } = await medalsDb.from("medals").upsert(rows, {
    onConflict: "profileId,type,periodKey",
    ignoreDuplicates: true,
  });
  if (error) {
    console.log({ seasonMedalsUpsertError: error, variant });
    return 0;
  }
  return rows.length;
};

export const awardMonthlySeasonMedals = async (): Promise<void> => {
  // Award the just-closed WEEK's top 10% (weekly seasons).
  const periodKey = previousPeriod(); // 'YYYY-Www'

  // Don't retroactively award periods from before the system launched.
  if (periodKey < FIRST_MEDAL_PERIOD) return;

  const medalsDb = supabase as unknown as MedalsDb;
  let awarded = 0;
  for (const variant of ALL_VARIANTS) {
    awarded += await awardVariant(variant, periodKey, medalsDb);
  }
  if (awarded > 0) {
    console.log(
      `[season-medals] awarded ${awarded} MONTHLY_SEASON medals for ${periodKey}`
    );
  }
};

export const watchSeasonMedals = (): void => {
  const run = () =>
    awardMonthlySeasonMedals().catch((error) =>
      console.log({ seasonMedalsError: error })
    );
  run();
  setInterval(run, HOUR);
};
