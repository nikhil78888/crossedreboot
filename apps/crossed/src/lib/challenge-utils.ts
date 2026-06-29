import { supabase } from "./supabase";

export type TimelinePoint = { t: number; p: number };

export type ChallengeRow = {
  id: string;
  challengerId: string | null;
  challengerName: string | null;
  gameVariant: string;
  crosswordsId: string | null;
  difficulty: string | null;
  resolvedClues: unknown;
  solveSeconds: number | null;
  timeline: TimelinePoint[] | null;
  // Inline puzzle for word search / trivia (the crossword path uses crosswordsId).
  puzzle: unknown;
  createdAt: string;
};

// Stored in a recipient's game gameState under "__challenge" so the grid can
// drive the ghost bar and the result screen can compare times. id + challengerId
// let us write a result row back to the original challenger when the race ends.
export type ChallengeMeta = {
  id?: string | null;
  challengerId?: string | null;
  timeline?: TimelinePoint[] | null;
  seconds?: number | null;
  name?: string | null;
};

// One row per accepted-and-raced challenge — the feedback the original
// challenger sees ("X beat your time" / "your time held").
export type ChallengeResultRow = {
  id: string;
  challengeId: string | null;
  challengerId: string;
  opponentId: string;
  opponentName: string | null;
  gameVariant: string | null;
  challengerSeconds: number;
  opponentSeconds: number;
  opponentWon: boolean;
  seenByChallenger: boolean;
  createdAt: string;
};

type ChallengeResultInsert = {
  challengeId: string | null;
  challengerId: string;
  opponentId: string;
  opponentName: string | null;
  gameVariant: string | null;
  challengerSeconds: number;
  opponentSeconds: number;
  opponentWon: boolean;
};

// Progress (0-100) the ghost had reached `seconds` into the challenger's solve.
export const ghostProgressAt = (
  timeline: TimelinePoint[] | null | undefined,
  seconds: number
): number => {
  if (!timeline || timeline.length === 0) return 0;
  let p = 0;
  for (const point of timeline) {
    if (point.t <= seconds) p = point.p;
    else break;
  }
  return p;
};

// `challenges` isn't in the generated supabase types yet — a structural view so
// we can read it without `any` or a types-package rebuild.
type ChallengeClient = {
  from: (t: "challenges") => {
    select: (c: string) => {
      eq: (
        col: string,
        val: string
      ) => {
        single: () => Promise<{ data: ChallengeRow | null; error: unknown }>;
      };
    };
  };
};

export const loadChallenge = async (
  id: string
): Promise<ChallengeRow | null> => {
  const client = supabase as unknown as ChallengeClient;
  const { data } = await client
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
};

// Most recent challenge id — used by the in-app test entry (real opens come via
// the share link / Branch).
type LatestClient = {
  from: (t: "challenges") => {
    select: (c: string) => {
      order: (
        col: string,
        o: { ascending: boolean }
      ) => {
        limit: (n: number) => Promise<{ data: { id: string }[] | null }>;
      };
    };
  };
};

export const loadLatestChallengeId = async (): Promise<string | null> => {
  const client = supabase as unknown as LatestClient;
  const { data } = await client
    .from("challenges")
    .select("id")
    .order("createdAt", { ascending: false })
    .limit(1);
  return data?.[0]?.id ?? null;
};

// --- challenge_results (the feedback loop) -------------------------------------
// Also not in the generated types yet → structural casts, same as challenges.

// Record the outcome of an accepted challenge so the original challenger gets
// feedback. Best-effort: never throws into the completion flow.
export const recordChallengeResult = async (
  row: ChallengeResultInsert
): Promise<void> => {
  const client = supabase as unknown as {
    from: (t: "challenge_results") => {
      insert: (v: ChallengeResultInsert) => Promise<{ error: unknown }>;
    };
  };
  try {
    await client.from("challenge_results").insert(row);
  } catch {
    // swallow — feedback is non-critical, the race already finished
  }
};

// supabase query builders are thenable AND chainable — model both.
type ResultQuery = PromiseLike<{
  data: ChallengeResultRow[] | null;
  error: unknown;
}> & {
  eq: (col: string, val: string | boolean) => ResultQuery;
  order: (col: string, o: { ascending: boolean }) => ResultQuery;
};

// The challenger's feed: results addressed to them, newest first.
export const loadChallengeResults = async (
  challengerId: string,
  opts?: { unseenOnly?: boolean }
): Promise<ChallengeResultRow[]> => {
  const client = supabase as unknown as {
    from: (t: "challenge_results") => { select: (c: string) => ResultQuery };
  };
  let q = client
    .from("challenge_results")
    .select("*")
    .eq("challengerId", challengerId);
  if (opts?.unseenOnly) q = q.eq("seenByChallenger", false);
  const { data } = await q.order("createdAt", { ascending: false });
  return data ?? [];
};

export const markChallengeResultsSeen = async (
  ids: string[]
): Promise<void> => {
  if (!ids.length) return;
  const client = supabase as unknown as {
    from: (t: "challenge_results") => {
      update: (v: { seenByChallenger: boolean }) => {
        in: (col: string, vals: string[]) => Promise<{ error: unknown }>;
      };
    };
  };
  try {
    await client
      .from("challenge_results")
      .update({ seenByChallenger: true })
      .in("id", ids);
  } catch {
    // non-critical
  }
};
