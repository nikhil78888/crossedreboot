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
  createdAt: string;
};

// Stored in a recipient's game gameState under "__challenge" so the grid can
// drive the ghost bar and the result screen can compare times.
export type ChallengeMeta = {
  timeline?: TimelinePoint[] | null;
  seconds?: number | null;
  name?: string | null;
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
