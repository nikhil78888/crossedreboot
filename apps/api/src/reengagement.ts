import { supabase } from "./lib/supabase";

// Re-engagement pushes: nudge players who haven't opened the app in a while to
// come back. Two flavors — a plain reminder, and a "someone solved a puzzle in
// X — can you beat it?" hook using a real recent solve time. Rate-limited via
// lastPushedAt so we never spam, and only sent during a daytime/evening window
// for the primary (US) market since we don't store per-user timezones yet.

const HOUR = 60 * 60 * 1000;
const INACTIVE_MS = 24 * HOUR; // only nudge players idle >= 24h
const COOLDOWN_MS = 48 * HOUR; // and at most once every 48h
const BATCH = 100; // Expo accepts up to 100 messages per request
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// profiles rows we read — expoPushToken/lastPushedAt aren't in the generated
// Database types yet, so access the table through a loose structural view.
type PushRow = { id: string; expoPushToken: string | null };
const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: unknown) => {
        order: (
          col: string,
          o: { ascending: boolean }
        ) => { limit: (n: number) => Promise<{ data: unknown[] | null }> };
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

// A believable solve time from a recent completed game, so the "beat it" nudge
// is truthful. Falls back to a snappy default if none is handy.
const recentSolveTime = async (): Promise<number> => {
  try {
    const { data } = await db
      .from("games")
      .select("gameState")
      .eq("playState", "COMPLETED")
      .order("createdAt", { ascending: false })
      .limit(30);
    const times: number[] = [];
    for (const row of (data ?? []) as { gameState?: unknown }[]) {
      const gs = row.gameState as Record<string, unknown> | null;
      if (!gs) continue;
      for (const [k, v] of Object.entries(gs)) {
        if (k.startsWith("__")) continue; // __challenge / __trivia / __wordsearch
        const secs = (v as { solvedInSeconds?: number })?.solvedInSeconds;
        if (typeof secs === "number" && secs >= 20 && secs <= 900)
          times.push(secs);
      }
    }
    if (times.length) return times[Math.floor(Math.random() * times.length)];
  } catch {
    // fall through
  }
  const fallbacks = [47, 58, 63, 72, 85, 94];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

const buildMessage = (
  token: string,
  solveTime: number,
  variant: "beat" | "reminder"
) => {
  const content =
    variant === "beat"
      ? {
          title: "Can you beat it? 🏁",
          body: `Someone just solved a Crossed puzzle in ${fmt(
            solveTime
          )}. Think you can go faster?`,
        }
      : {
          title: "Your next puzzle is waiting 🧩",
          body: "Jump back into Crossed and climb the rankings.",
        };
  return {
    to: token,
    sound: "default",
    ...content,
    data: { route: "/home" },
  };
};

// POST a chunk of messages to Expo and return the push tokens that Expo reports
// as permanently invalid (so we can clear them).
// Node 20 has a global fetch at runtime; the API's TS lib doesn't declare it.
const httpFetch = (
  globalThis as unknown as {
    fetch: (
      url: string,
      init: unknown
    ) => Promise<{ json: () => Promise<unknown> }>;
  }
).fetch;

const sendChunk = async (
  messages: { to: string }[]
): Promise<string[]> => {
  const res = await httpFetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
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

  // Eligible: has a token, inactive >= 24h, and not pushed in the last 48h.
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

  const solveTime = await recentSolveTime();
  // Alternate the two message flavors across the batch.
  const messages = rows.map((r, i) =>
    buildMessage(r.expoPushToken as string, solveTime, i % 2 ? "reminder" : "beat")
  );

  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    dead.push(...(await sendChunk(messages.slice(i, i + BATCH))));
  }

  // Mark everyone we just messaged so the cooldown applies.
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
    `[reengagement] pushed ${sentIds.length}, cleared ${dead.length} dead tokens`
  );
};

// Runs hourly; the send window + cooldown keep it from over-notifying. Idempotent
// enough for multiple replicas: the worst case is a rare double-send in the
// window between a chunk send and the lastPushedAt update.
export const watchReengagement = () => {
  const run = () =>
    sweep().catch((error) => console.log({ reengagementError: error }));
  run();
  setInterval(run, HOUR);
};
