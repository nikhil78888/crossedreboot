import { supabase } from "./lib/supabase";
import { seasonKeyFor, isResetSeason } from "./season";

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

export const awardMonthlySeasonMedals = async (): Promise<void> => {
  const now = new Date();
  const prevStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );
  const periodKey = prevStart.toISOString().slice(0, 7); // 'YYYY-MM'

  const medalsDb = supabase as unknown as MedalsDb;

  // Already awarded for this month? Then nothing to do.
  const { count: existing } = await medalsDb
    .from("medals")
    .select("id", { count: "exact", head: true })
    .eq("type", "MONTHLY_SEASON")
    .eq("periodKey", periodKey);
  if ((existing || 0) > 0) return;

  // The closed month's finishing order. Reset months (FIRST_RESET_MONTH on) rank
  // by the season rating; the launch month(s) before that ranked by lifetime
  // rating, so award those the same way.
  const players: { id: string; score: number }[] = isResetSeason(periodKey)
    ? await fetchAll<{ id: string; score: number }>(async (f, t) => {
        const { data } = await supabase
          .from("profiles")
          .select("id, seasonScore")
          .neq("type", "BOT")
          .eq("seasonKey", seasonKeyFor(periodKey))
          .order("seasonScore", { ascending: false })
          .range(f, t);
        return {
          data: (
            (data as { id: string; seasonScore: number }[]) || []
          ).map((r) => ({ id: r.id, score: r.seasonScore })),
        };
      })
    : await fetchAll<{ id: string; score: number }>(async (f, t) => {
        const { data } = await supabase
          .from("profiles")
          .select("id, eloRating")
          .neq("type", "BOT")
          .or("eloRating.neq.1000,ratingDeviation.neq.350")
          .order("eloRating", { ascending: false })
          .range(f, t);
        return {
          data: (
            (data as { id: string; eloRating: number }[]) || []
          ).map((r) => ({ id: r.id, score: Math.round(r.eloRating) })),
        };
      });

  const total = players.length;
  if (total < MIN_PARTICIPANTS) return; // too small a season to award

  // Top 10% by competition rank (ties share a rank; a tie on the cutoff is
  // included). cutoffRank = ceil(10% of the field).
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
        type: "MONTHLY_SEASON",
        periodKey,
        rank,
        total,
        percentile: Math.max(1, Math.round((100 * rank) / total)),
      });
    }
  });
  if (!rows.length) return;

  const { error } = await medalsDb.from("medals").upsert(rows, {
    onConflict: "profileId,type,periodKey",
    ignoreDuplicates: true,
  });
  if (error) {
    console.log({ seasonMedalsUpsertError: error });
    return;
  }
  console.log(
    `[season-medals] awarded ${rows.length} MONTHLY_SEASON medals for ${periodKey} (field ${total})`
  );
};

export const watchSeasonMedals = (): void => {
  const run = () =>
    awardMonthlySeasonMedals().catch((error) =>
      console.log({ seasonMedalsError: error })
    );
  run();
  setInterval(run, HOUR);
};
