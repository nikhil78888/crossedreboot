import AsyncStorage from "@react-native-async-storage/async-storage";
import { localDay } from "./daily-duel";

// On-device streaks: consecutive local-calendar days a thing was done. Used for
// the Play Streak (did the Daily Duel) and the Goal Streak (completed the Daily
// Goal). One "freeze" per calendar month forgives a single missed day so an
// accidental miss doesn't nuke a long streak. Client-side for now (no server
// sync) — it's the flame that drives daily return.

const keys = (name: string) => ({
  LAST: `streak:${name}:lastDay`,
  CUR: `streak:${name}:current`,
  LONGEST: `streak:${name}:longest`,
  FREEZE: `streak:${name}:freezeMonth`,
});

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
  doneToday: boolean;
};

const readStreak = async (name: string): Promise<StreakState> => {
  const k = keys(name);
  const today = localDay();
  const last = (await AsyncStorage.getItem(k.LAST)) || "";
  let current = await num(k.CUR);
  const longest = await num(k.LONGEST);
  // If the miss is already beyond the grace, reflect a broken streak (0) even
  // before they act again today.
  if (last && last !== today && last !== dayBefore(today) && current > 0) {
    const usedFreeze = (await AsyncStorage.getItem(k.FREEZE)) || "";
    const canFreeze =
      last === dayBefore(today, 2) && usedFreeze !== today.slice(0, 7);
    if (!canFreeze) current = 0;
  }
  return { current, longest, doneToday: last === today };
};

const recordStreak = async (name: string): Promise<StreakState> => {
  const k = keys(name);
  const today = localDay();
  const last = (await AsyncStorage.getItem(k.LAST)) || "";
  let current = await num(k.CUR);
  let longest = await num(k.LONGEST);

  if (last === today) return { current, longest, doneToday: true };

  if (!last) {
    current = 1;
  } else if (last === dayBefore(today)) {
    current += 1;
  } else if (last === dayBefore(today, 2)) {
    // missed exactly one day — spend the monthly freeze if available
    const month = today.slice(0, 7);
    const usedFreeze = (await AsyncStorage.getItem(k.FREEZE)) || "";
    if (usedFreeze !== month) {
      await AsyncStorage.setItem(k.FREEZE, month);
      current += 1;
    } else {
      current = 1;
    }
  } else {
    current = 1;
  }

  longest = Math.max(longest, current);
  await AsyncStorage.multiSet([
    [k.LAST, today],
    [k.CUR, String(current)],
    [k.LONGEST, String(longest)],
  ]);
  return { current, longest, doneToday: true };
};

// Play Streak — kept by doing the Daily Duel.
export const getPlayStreak = () => readStreak("play");
export const recordDuelPlayed = () => recordStreak("play");

// Goal Streak — kept by completing the Daily Goal.
export const getGoalStreak = () => readStreak("goal");
export const recordGoalDone = () => recordStreak("goal");
