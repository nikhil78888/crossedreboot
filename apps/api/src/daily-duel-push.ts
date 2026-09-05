import { supabase } from "./lib/supabase";
import { sendChunk } from "./reengagement";

// Morning nudge to do the Daily Duel — targets recently-active players who
// haven't opened today, so it reads as "your duel is ready, keep your streak"
// rather than a generic win-back. Deep-links straight to the Daily tab.
//
// The duel-done state is on-device, so we can't tell who's already done it; we
// approximate with "hasn't opened in ~12h" (if they were on today, they saw it).
// Rate-limited via lastPushedAt (shared with the other push jobs = max 1/day).

const HOUR = 60 * 60 * 1000;
const BATCH = 100;

// ~8–11am US Eastern.
const inMorningWindow = () => {
  const h = new Date().getUTCHours();
  return h >= 13 && h < 16;
};

type PushRow = { id: string; expoPushToken: string | null };

const sweep = async () => {
  if (!inMorningWindow()) return;
  const now = Date.now();
  const activeSince = new Date(now - 7 * 24 * HOUR).toISOString();
  const notTodayBefore = new Date(now - 12 * HOUR).toISOString();
  const cooldownBefore = new Date(now - 20 * HOUR).toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, expoPushToken, lastSeenAt, lastPushedAt")
    .not("expoPushToken", "is", null)
    .eq("type", "USER")
    .gte("lastSeenAt", activeSince) // active in the last week
    .lt("lastSeenAt", notTodayBefore) // but not in the last ~12h
    .or(`lastPushedAt.is.null,lastPushedAt.lt.${cooldownBefore}`)
    .limit(BATCH)
    .returns<PushRow[]>();
  if (error) {
    console.log({ dailyDuelPushError: error });
    return;
  }
  const rows = (data ?? []).filter((r) => r.expoPushToken);
  if (!rows.length) return;

  const messages = rows.map((r) => ({
    to: r.expoPushToken as string,
    sound: "default",
    title: "⚔️ Your Daily Duel is ready",
    body: "A new opponent is waiting — keep your streak alive!",
    data: { route: "/daily" },
  }));

  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    dead.push(...(await sendChunk(messages.slice(i, i + BATCH))));
  }

  const sentIds = rows.map((r) => r.id);
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
    `[daily-duel-push] pushed ${sentIds.length}, cleared ${dead.length} dead tokens`
  );
};

// Hourly; the morning window + cooldown keep it to one nudge/day.
export const watchDailyDuelPush = () => {
  const run = () =>
    sweep().catch((error) => console.log({ dailyDuelPushError: error }));
  run();
  setInterval(run, HOUR);
};
