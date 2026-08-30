import AsyncStorage from "@react-native-async-storage/async-storage";
import { localDay } from "./daily-duel";

// On-device Play Streak: consecutive local-calendar days the player did the
// Daily Duel. Kept simple and client-side for now (no server sync); it's the
// flame that drives daily return. One "freeze" per calendar month forgives a
// single missed day so an accidental miss doesn't nuke a long streak.

const LAST_KEY = "streak:lastPlayedDay"; // YYYY-MM-DD
const CUR_KEY = "streak:current";
const LONGEST_KEY = "streak:longest";
const FREEZE_KEY = "streak:freezeMonthUsed"; // YYYY-MM a freeze was spent

const num = async (k: string) => Number(await AsyncStorage.getItem(k)) || 0;

const dayBefore = (day: string, n = 1): string => {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - n);
  return localDay(dt);
};

export type StreakState = {
  current: number;
  longest: number;
  playedToday: boolean;
};

export const getStreak = async (): Promise<StreakState> => {
  const today = localDay();
  const last = (await AsyncStorage.getItem(LAST_KEY)) || "";
  let current = await num(CUR_KEY);
  const longest = await num(LONGEST_KEY);
  // If they missed more than the grace allows, the visible streak is already
  // broken — reflect that (0) even before they play again today.
  if (last && last !== today && last !== dayBefore(today) && current > 0) {
    // one-day miss covered by an unused monthly freeze still counts as alive
    const usedFreeze = (await AsyncStorage.getItem(FREEZE_KEY)) || "";
    const canFreeze =
      last === dayBefore(today, 2) && usedFreeze !== today.slice(0, 7);
    if (!canFreeze) current = 0;
  }
  return { current, longest, playedToday: last === today };
};

// Call when the player completes (or starts) today's Daily Duel.
export const recordDuelPlayed = async (): Promise<StreakState> => {
  const today = localDay();
  const last = (await AsyncStorage.getItem(LAST_KEY)) || "";
  let current = await num(CUR_KEY);
  let longest = await num(LONGEST_KEY);

  if (last === today) {
    // already counted today — no double increment
    return { current, longest, playedToday: true };
  }

  if (!last) {
    current = 1;
  } else if (last === dayBefore(today)) {
    current += 1; // consecutive day
  } else if (last === dayBefore(today, 2)) {
    // missed exactly one day — spend the monthly freeze if available
    const month = today.slice(0, 7);
    const usedFreeze = (await AsyncStorage.getItem(FREEZE_KEY)) || "";
    if (usedFreeze !== month) {
      await AsyncStorage.setItem(FREEZE_KEY, month);
      current += 1; // freeze forgives the gap
    } else {
      current = 1; // no freeze left → reset
    }
  } else {
    current = 1; // longer gap → reset
  }

  longest = Math.max(longest, current);
  await AsyncStorage.multiSet([
    [LAST_KEY, today],
    [CUR_KEY, String(current)],
    [LONGEST_KEY, String(longest)],
  ]);
  return { current, longest, playedToday: true };
};
