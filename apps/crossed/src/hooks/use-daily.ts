import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  duelMeta,
  getTodaysDuel,
  getTodaysResult,
  type DuelResult,
} from "../lib/daily-duel";
import {
  getPlayStreak,
  recordDuelPlayed,
  type StreakState,
} from "../lib/streak";

const EMPTY: StreakState = { current: 0, longest: 0, doneToday: false };

export const useDaily = () => {
  const router = useRouter();
  const meta = duelMeta();
  const [playStreak, setPlayStreak] = useState<StreakState>(EMPTY);
  const [result, setResult] = useState<DuelResult | null>(null);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const [s, r] = await Promise.all([getPlayStreak(), getTodaysResult()]);
    setPlayStreak(s);
    setResult(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // ALSO refresh when the app returns to the foreground. Focus alone doesn't
  // fire if the Daily tab was already open when the app was backgrounded — so
  // crossing midnight in the background left the stale "you already played"
  // (yesterday's) result on screen. getTodaysResult is keyed by the local day,
  // so re-reading it after a rollover correctly clears to today's fresh duel.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Start today's duel: build (once/day) the system challenge, count the daily
  // Play Streak, and drop into the existing ghost-race pipeline.
  const startDuel = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const duel = await getTodaysDuel();
      if (!duel) return;
      setPlayStreak(await recordDuelPlayed());
      router.push(`/challenge?id=${duel.id}&daily=1`);
    } finally {
      setStarting(false);
    }
  }, [router, starting]);

  return { meta, playStreak, result, starting, startDuel, refresh };
};
