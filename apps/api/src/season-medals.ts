import { supabase } from "./lib/supabase";

// Awards MONTHLY_SEASON medals to the top 10% of the previous calendar month's
// ranked season, once that month has closed. Runs hourly; it's a no-op after the
// month's medals exist (checked up front) and every write is idempotent, so it's
// safe to run repeatedly and on multiple replicas.
//
// Standings are recomputed from the immutable `games` history (ranked wins in the
// month), NOT from profiles.seasonScore — that column resets as players start the
// new month, so it can't be trusted for a closed month. The metric matches the
// live board: ranked wins.

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
  const prevEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodKey = prevStart.toISOString().slice(0, 7); // 'YYYY-MM'

  const medalsDb = supabase as unknown as MedalsDb;

  // Already awarded for this month? Then nothing to do.
  const { count: existing } = await medalsDb
    .from("medals")
    .select("id", { count: "exact", head: true })
    .eq("type", "MONTHLY_SEASON")
    .eq("periodKey", periodKey);
  if ((existing || 0) > 0) return;

  // Bots never earn season medals.
  const bots = await fetchAll<{ id: string }>(async (f, t) => {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("type", "BOT")
      .range(f, t);
    return { data: (data as { id: string }[]) || [] };
  });
  const botIds = new Set(bots.map((b) => b.id));

  // Ranked wins in the closed month, from immutable game history.
  const games = await fetchAll<{ winnerId: string | null }>(async (f, t) => {
    const { data } = await supabase
      .from("games")
      .select("winnerId")
      .in("gameType", ["RANKED", "TOURNAMENT"])
      .not("winnerId", "is", null)
      .gte("createdAt", prevStart.toISOString())
      .lt("createdAt", prevEnd.toISOString())
      .order("id", { ascending: true })
      .range(f, t);
    return { data: (data as { winnerId: string | null }[]) || [] };
  });

  const wins = new Map<string, number>();
  for (const g of games) {
    const w = g.winnerId;
    if (!w || botIds.has(w)) continue;
    wins.set(w, (wins.get(w) || 0) + 1);
  }

  const ranked = [...wins.entries()]
    .map(([profileId, score]) => ({ profileId, score }))
    .sort((a, b) => b.score - a.score);
  const total = ranked.length;
  if (total < MIN_PARTICIPANTS) return; // too small a season to award

  // Top 10% by competition rank (ties share a rank; a tie on the cutoff is
  // included). cutoffRank = ceil(10% of the field).
  const cutoffRank = Math.max(1, Math.ceil(total * 0.1));
  let rank = 0;
  let last: number | null = null;
  const rows: Record<string, unknown>[] = [];
  ranked.forEach((r, i) => {
    if (last === null || r.score !== last) {
      rank = i + 1;
      last = r.score;
    }
    if (rank <= cutoffRank) {
      rows.push({
        profileId: r.profileId,
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
