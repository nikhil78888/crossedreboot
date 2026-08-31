import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { duelMeta, getTodaysDuel } from "../lib/daily-duel";
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
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    setPlayStreak(await getPlayStreak());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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

  return { meta, playStreak, starting, startDuel, refresh };
};
