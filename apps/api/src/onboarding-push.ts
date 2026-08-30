import { supabase } from "./lib/supabase";
import {
  pickRecentSolve,
  createSystemChallenge,
  sendChunk,
  inSendWindow,
  fmt,
  nounFor,
  type Solve,
} from "./reengagement";

// New-user onboarding drip: for the first 5 days after signup, nudge players who
// haven't opened the app that day to come back — one push/day, message varied by
// which day they're on. The first few days are the habit-formation window, so
// new users get a tighter cadence than the general 48h win-back (which skips
// anyone this sweep owns). Days 1/3/5 use the "beat this recorded time" ghost
// race (our strongest hook, reused from reengagement); 2/4 are lighter nudges.
//
// Guardrails: only fires if they've been idle ~18h (i.e. didn't play today), at
// most once per 20h (one/day), and only during the daytime send window. Shares
// lastPushedAt with the other push jobs so nobody ever gets two in a day.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const DRIP_DAYS = 5;
const INACTIVE_MS = 18 * HOUR; // "hasn't played today"
const COOLDOWN_MS = 20 * HOUR; // at most one drip push/day
const BATCH = 100;

type Row = {
  id: string;
  expoPushToken: string | null;
  createdAt: string;
};

type PushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: { route: string };
};

// Whole days since signup (1 = they're in their second day, etc.).
const dayIndex = (createdAt: string, now: number) =>
  Math.floor((now - new Date(createdAt).getTime()) / DAY);

const dripMessage = (
  day: number,
  token: string,
  solve: Solve | null,
  challengeId: string | null
): PushMessage => {
  const ghost: PushMessage | null =
    solve && challengeId
      ? {
          to: token,
          sound: "default",
          title: "Can you beat it? 🏁",
          body: `Someone solved a Crossed ${nounFor(solve.variant)} in ${fmt(
            solve.seconds
          )}. Tap to race the exact puzzle.`,
          data: { route: `/challenge?id=${challengeId}` },
        }
      : null;
  const home = (title: string, body: string): PushMessage => ({
    to: token,
    sound: "default",
    title,
    body,
    data: { route: "/home" },
  });
  switch (day) {
    case 1:
      return ghost ?? home("Ready for another round? 🧩", "Jump back into Crossed for a quick race.");
    case 2:
      return home("You're just getting started 📈", "Play a round and start climbing the rankings.");
    case 3:
      return ghost ?? home("There's a time to beat 🏁", "Someone just set a fast solve — think you can beat it?");
    case 4:
      return home("Crossed is more fun with a friend 👥", "Challenge a friend to a live race.");
    default:
      return ghost ?? home("One more race? 🏁", "Squeeze in a quick puzzle before the day's done.");
  }
};

const sweep = async () => {
  if (!inSendWindow()) return;
  const now = Date.now();
  const inactiveBefore = new Date(now - INACTIVE_MS).toISOString();
  const cooldownBefore = new Date(now - COOLDOWN_MS).toISOString();
  const oldestNew = new Date(now - DRIP_DAYS * DAY).toISOString(); // joined within 5 days

  const { data, error } = await supabase
    .from("profiles")
    .select("id, expoPushToken, createdAt, lastSeenAt, lastPushedAt")
    .not("expoPushToken", "is", null)
    .eq("type", "USER")
    .gte("createdAt", oldestNew)
    .lt("lastSeenAt", inactiveBefore)
    .or(`lastPushedAt.is.null,lastPushedAt.lt.${cooldownBefore}`)
    .limit(BATCH)
    .returns<Row[]>();
  if (error) {
    console.log({ onboardingQueryError: error });
    return;
  }

  // Keep only days 1..5 — skip <24h-old accounts (day 0) so we don't nudge
  // someone the same day they signed up.
  const rows = (data ?? [])
    .filter((r) => r.expoPushToken)
    .map((r) => ({ r, day: dayIndex(r.createdAt, now) }))
    .filter((x) => x.day >= 1 && x.day <= DRIP_DAYS);
  if (!rows.length) return;

  // One shared ghost race for the whole batch (used by the day 1/3/5 messages).
  const solve = await pickRecentSolve();
  const challengeId = solve ? await createSystemChallenge(solve) : null;

  const messages = rows.map(({ r, day }) =>
    dripMessage(day, r.expoPushToken as string, solve, challengeId)
  );

  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    dead.push(...(await sendChunk(messages.slice(i, i + BATCH))));
  }

  const sentIds = rows.map((x) => x.r.id);
  await supabase
    .from("profiles")
    // @ts-expect-error lastPushedAt not in generated types
    .update({ lastPushedAt: new Date().toISOString() })
    .in("id", sentIds);

  if (dead.length) {
    await supabase
      .from("profiles")
      // @ts-expect-error expoPushToken not in generated types
      .update({ expoPushToken: null })
      .in("expoPushToken", dead);
  }
  console.log(
    `[onboarding] pushed ${sentIds.length} drip nudge(s) (challenge=${
      challengeId ?? "none"
    }), cleared ${dead.length} dead tokens`
  );
};

// Runs hourly; the send window + per-day cooldown keep it to one nudge/day.
export const watchOnboardingPush = () => {
  const run = () =>
    sweep().catch((error) => console.log({ onboardingError: error }));
  run();
  setInterval(run, HOUR);
};
