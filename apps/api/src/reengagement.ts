import { supabase } from "./lib/supabase";

// Re-engagement pushes: nudge players who haven't opened the app in a while to
// come back. The hook is "someone solved a puzzle in X — can you beat it?" and
// tapping drops them into a ghost race on the EXACT puzzle that solve came from
// (reusing the challenge system). The original solver is never told — challengeId
// with a null challengerId means no result is recorded back to anyone.
//
// Rate-limited via lastPushedAt so we never spam, and only sent during a
// daytime/evening window for the primary (US) market since we don't store
// per-user timezones yet.

const HOUR = 60 * 60 * 1000;
const INACTIVE_MS = 24 * HOUR; // only nudge players idle >= 24h
const COOLDOWN_MS = 48 * HOUR; // and at most once every 48h
const BATCH = 100; // Expo accepts up to 100 messages per request
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// profiles rows we read — expoPushToken/lastPushedAt aren't in the generated
// Database types yet, so reassert the row shape via .returns().
type PushRow = { id: string; expoPushToken: string | null };

// challenges isn't in the generated types — structural view for the insert.
const challengesTable = supabase as unknown as {
  from: (t: "challenges") => {
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
  };
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(
    2,
    "0"
  )}`;

// Noon–8pm US Eastern-ish. 17:00–01:00 UTC.
const inSendWindow = () => {
  const h = new Date().getUTCHours();
  return h >= 17 || h < 1;
};

const nounFor = (variant: string) =>
  variant === "WORD_SEARCH"
    ? "word search"
    : variant === "TRIVIA"
    ? "trivia round"
    : "crossword";

type Solve = {
  variant: string;
  difficulty: string;
  seconds: number;
  timeline: unknown;
  crosswordsId: string | null;
  resolvedClues: unknown;
  puzzle: unknown;
};

// Find a recent completed game with a clean solve (time + progress timeline) we
// can rebuild as a challenge. Prefers the fastest solve in each game.
const pickRecentSolve = async (): Promise<Solve | null> => {
  const { data } = await supabase
    .from("games")
    .select("gameVariant, crosswordsId, resolvedClues, difficulty, gameState")
    .eq("playState", "COMPLETED")
    .order("createdAt", { ascending: false })
    .limit(50);
  for (const g of data ?? []) {
    const gs = g.gameState as Record<string, unknown> | null;
    if (!gs) continue;
    let best: { seconds: number; timeline: unknown } | null = null;
    for (const [k, v] of Object.entries(gs)) {
      if (k.startsWith("__")) continue; // __challenge / __trivia / __wordsearch
      const entry = v as { solvedInSeconds?: number; timeline?: unknown };
      const secs = entry?.solvedInSeconds;
      const tl = entry?.timeline;
      if (
        typeof secs === "number" &&
        secs >= 20 &&
        secs <= 900 &&
        Array.isArray(tl) &&
        tl.length > 0 &&
        (!best || secs < best.seconds)
      ) {
        best = { seconds: secs, timeline: tl };
      }
    }
    if (!best) continue;
    const variant = g.gameVariant || "CROSSWORD";
    if (variant === "WORD_SEARCH" || variant === "TRIVIA") {
      const puzzle =
        variant === "WORD_SEARCH"
          ? (gs as { __wordsearch?: unknown }).__wordsearch
          : (gs as { __trivia?: unknown }).__trivia;
      if (!puzzle) continue;
      return {
        variant,
        difficulty: (g.difficulty as string) ?? "REGULAR",
        seconds: best.seconds,
        timeline: best.timeline,
        crosswordsId: null,
        resolvedClues: null,
        puzzle,
      };
    }
    if (!g.crosswordsId) continue;
    return {
      variant: "CROSSWORD",
      difficulty: (g.difficulty as string) ?? "REGULAR",
      seconds: best.seconds,
      timeline: best.timeline,
      crosswordsId: g.crosswordsId,
      resolvedClues: g.resolvedClues,
      puzzle: null,
    };
  }
  return null;
};

// Persist a system challenge (no challengerId → nobody gets a result). Returns
// the challenge id to deep-link the push to, or null on failure.
const createSystemChallenge = async (s: Solve): Promise<string | null> => {
  try {
    const { data, error } = await challengesTable
      .from("challenges")
      .insert({
        challengerId: null, // system-generated: never notify anyone
        challengerName: "the record",
        gameVariant: s.variant,
        crosswordsId: s.crosswordsId,
        difficulty: s.difficulty,
        resolvedClues: s.resolvedClues ?? null,
        solveSeconds: s.seconds,
        timeline: s.timeline ?? null,
        puzzle: s.puzzle ?? null,
      })
      .select("id")
      .single();
    if (error || !data?.id) return null;
    return data.id;
  } catch {
    return null;
  }
};

const message = (token: string, solve: Solve | null, challengeId: string | null) => {
  if (solve && challengeId) {
    return {
      to: token,
      sound: "default",
      title: "Can you beat it? 🏁",
      body: `Someone solved a Crossed ${nounFor(solve.variant)} in ${fmt(
        solve.seconds
      )}. Tap to race the exact puzzle.`,
      data: { route: `/challenge?id=${challengeId}` },
    };
  }
  return {
    to: token,
    sound: "default",
    title: "Your next puzzle is waiting 🧩",
    body: "Jump back into Crossed and climb the rankings.",
    data: { route: "/home" },
  };
};

// Node 20 has a global fetch at runtime; the API's TS lib doesn't declare it.
const httpFetch = (
  globalThis as unknown as {
    fetch: (
      url: string,
      init: unknown
    ) => Promise<{ json: () => Promise<unknown> }>;
  }
).fetch;

// POST a chunk of messages to Expo; return tokens Expo reports as dead.
const sendChunk = async (messages: { to: string }[]): Promise<string[]> => {
  const res = await httpFetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  const dead: string[] = [];
  try {
    const json = (await res.json()) as {
      data?: { status?: string; details?: { error?: string } }[];
    };
    (json.data ?? []).forEach((ticket, i) => {
      if (
        ticket?.status === "error" &&
        ticket?.details?.error === "DeviceNotRegistered"
      ) {
        dead.push(messages[i].to);
      }
    });
  } catch {
    // ignore malformed receipt bodies
  }
  return dead;
};

const sweep = async () => {
  if (!inSendWindow()) return;
  const now = Date.now();
  const inactiveBefore = new Date(now - INACTIVE_MS).toISOString();
  const cooldownBefore = new Date(now - COOLDOWN_MS).toISOString();

  // Eligible: has a token, inactive >= 24h, not pushed in the last 48h.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, expoPushToken, lastSeenAt, lastPushedAt")
    .not("expoPushToken", "is", null)
    .eq("type", "USER")
    .lt("lastSeenAt", inactiveBefore)
    .or(`lastPushedAt.is.null,lastPushedAt.lt.${cooldownBefore}`)
    .limit(BATCH)
    .returns<PushRow[]>();
  if (error) {
    console.log({ reengagementQueryError: error });
    return;
  }
  const rows = (data ?? []).filter((r) => r.expoPushToken);
  if (!rows.length) return;

  // Build one exact-puzzle ghost race for this batch (all pushes share it).
  const solve = await pickRecentSolve();
  const challengeId = solve ? await createSystemChallenge(solve) : null;

  const messages = rows.map((r) =>
    message(r.expoPushToken as string, solve, challengeId)
  );

  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    dead.push(...(await sendChunk(messages.slice(i, i + BATCH))));
  }

  // Apply the cooldown to everyone we just messaged.
  const sentIds = rows.map((r) => r.id);
  await supabase
    .from("profiles")
    // @ts-expect-error lastPushedAt not in generated types
    .update({ lastPushedAt: new Date().toISOString() })
    .in("id", sentIds);

  // Clear tokens Expo says are dead so we stop pushing to them.
  if (dead.length) {
    await supabase
      .from("profiles")
      // @ts-expect-error expoPushToken not in generated types
      .update({ expoPushToken: null })
      .in("expoPushToken", dead);
  }
  console.log(
    `[reengagement] pushed ${sentIds.length} (challenge=${
      challengeId ?? "none"
    }), cleared ${dead.length} dead tokens`
  );
};

// Runs hourly; the send window + cooldown keep it from over-notifying.
export const watchReengagement = () => {
  const run = () =>
    sweep().catch((error) => console.log({ reengagementError: error }));
  run();
  setInterval(run, HOUR);
};
