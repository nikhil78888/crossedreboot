import { supabase } from "./lib/supabase";

// When someone finishes racing a shared challenge, push the original challenger
// to tell them whether their time held or was beaten. The recipient's client
// already wrote a challenge_results row (with a real challengerId — system
// "beat this puzzle" nudges use a null challengerId and never land here). This
// worker sends one push per un-notified row, then flips the flag.

const POLL_MS = 30_000;
const BATCH = 100;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ResultRow = {
  id: string;
  challengerId: string;
  opponentName: string | null;
  gameVariant: string | null;
  opponentWon: boolean;
};

// challenge_results isn't in the generated types → structural view.
const resultsTable = supabase as unknown as {
  from: (t: "challenge_results") => {
    select: (c: string) => {
      eq: (
        col: string,
        v: unknown
      ) => {
        order: (
          col: string,
          o: { ascending: boolean }
        ) => {
          limit: (
            n: number
          ) => Promise<{ data: ResultRow[] | null; error: unknown }>;
        };
      };
    };
    update: (v: { notified: boolean }) => {
      in: (col: string, vals: string[]) => Promise<{ error: unknown }>;
    };
  };
};

const httpFetch = (
  globalThis as unknown as {
    fetch: (
      url: string,
      init: unknown
    ) => Promise<{ json: () => Promise<unknown> }>;
  }
).fetch;

const nounFor = (v: string | null) =>
  v === "WORD_SEARCH" ? "word search" : v === "TRIVIA" ? "trivia" : "crossword";

const messageFor = (row: ResultRow, token: string) => {
  const who = row.opponentName || "Someone";
  const noun = nounFor(row.gameVariant);
  return row.opponentWon
    ? {
        to: token,
        sound: "default",
        title: "Your challenge was beaten 😤",
        body: `${who} beat your ${noun} challenge — get the rematch!`,
        data: { route: "/home" },
      }
    : {
        to: token,
        sound: "default",
        title: "Your time held! 🛡️",
        body: `${who} took on your ${noun} challenge but couldn't beat you.`,
        data: { route: "/home" },
      };
};

const sweep = async () => {
  const { data, error } = await resultsTable
    .from("challenge_results")
    .select("id, challengerId, opponentName, gameVariant, opponentWon")
    .eq("notified", false)
    .order("createdAt", { ascending: true })
    .limit(BATCH);
  if (error) {
    console.log({ challengeNotifyQueryError: error });
    return;
  }
  const rows = data ?? [];
  if (!rows.length) return;

  // Look up the challengers' push tokens in one query.
  const ids = [...new Set(rows.map((r) => r.challengerId))];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, expoPushToken")
    .in("id", ids)
    .returns<{ id: string; expoPushToken: string | null }[]>();
  const tokenById = new Map((profs ?? []).map((p) => [p.id, p.expoPushToken]));

  const messages = rows
    .map((r) => {
      const token = tokenById.get(r.challengerId);
      return token ? messageFor(r, token) : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  for (let i = 0; i < messages.length; i += BATCH) {
    try {
      await httpFetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages.slice(i, i + BATCH)),
      });
    } catch (e) {
      console.log({ challengeNotifySendError: e });
    }
  }

  // Flip the flag for everything we processed (even rows whose challenger has no
  // token) so we never resend.
  await resultsTable
    .from("challenge_results")
    .update({ notified: true })
    .in(
      "id",
      rows.map((r) => r.id)
    );
  if (messages.length)
    console.log(`[challenge-notify] pushed ${messages.length} result(s)`);
};

export const watchChallengeResults = () => {
  const run = () =>
    sweep().catch((e) => console.log({ challengeNotifyError: e }));
  run();
  setInterval(run, POLL_MS);
};
