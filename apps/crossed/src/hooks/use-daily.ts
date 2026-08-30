import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { duelMeta, getTodaysDuel } from "../lib/daily-duel";
import { getStreak, recordDuelPlayed, type StreakState } from "../lib/streak";
import { gamesPlayedToday } from "../lib/engagement";

export type DailyGoal = {
  label: string;
  target: number;
  progress: number;
  done: boolean;
};

// The daily goal is a light "play N games today" task (the trackable version of
// "play 3 ranked matches"). N is seeded so it varies day to day but is the same
// for everyone. Richer goals (invite a friend / win a ranked) can slot in later.
const goalTarget = (seed: number) => 2 + (seed % 3); // 2..4

export const useDaily = () => {
  const router = useRouter();
  const meta = duelMeta();
  const [streak, setStreak] = useState<StreakState>({
    current: 0,
    longest: 0,
    playedToday: false,
  });
  const target = goalTarget(meta.seed);
  const [goal, setGoal] = useState<DailyGoal>({
    label: `Play ${target} games today`,
    target,
    progress: 0,
    done: false,
  });
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const [s, played] = await Promise.all([getStreak(), gamesPlayedToday()]);
    setStreak(s);
    setGoal({
      label: `Play ${target} games today`,
      target,
      progress: played,
      done: played >= target,
    });
  }, [target]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Start today's duel: build (once/day) the system challenge, count the streak,
  // and drop into the existing ghost-race pipeline.
  const startDuel = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const duel = await getTodaysDuel();
      if (!duel) return;
      const s = await recordDuelPlayed();
      setStreak(s);
      router.push(`/challenge?id=${duel.id}`);
    } finally {
      setStarting(false);
    }
  }, [router, starting]);

  return { meta, streak, goal, starting, startDuel, refresh };
};
