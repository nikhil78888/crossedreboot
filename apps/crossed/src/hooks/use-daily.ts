import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { duelMeta, getTodaysDuel } from "../lib/daily-duel";
import {
  getPlayStreak,
  recordDuelPlayed,
  getGoalStreak,
  recordGoalDone,
  type StreakState,
} from "../lib/streak";
import { gamesPlayedToday } from "../lib/engagement";

export type DailyGoal = {
  label: string;
  target: number;
  progress: number;
  done: boolean;
};

const EMPTY: StreakState = { current: 0, longest: 0, doneToday: false };

// The daily goal is a light "play N games today" task (the trackable version of
// "play 3 ranked matches"). N is seeded so it varies day to day.
const goalTarget = (seed: number) => 2 + (seed % 3); // 2..4

export const useDaily = () => {
  const router = useRouter();
  const meta = duelMeta();
  const target = goalTarget(meta.seed);

  const [playStreak, setPlayStreak] = useState<StreakState>(EMPTY);
  const [goalStreak, setGoalStreak] = useState<StreakState>(EMPTY);
  const [goal, setGoal] = useState<DailyGoal>({
    label: `Play ${target} games today`,
    target,
    progress: 0,
    done: false,
  });
  const [starting, setStarting] = useState(false);
  const goalRecorded = useRef(false);

  const refresh = useCallback(async () => {
    const [ps, gs, played] = await Promise.all([
      getPlayStreak(),
      getGoalStreak(),
      gamesPlayedToday(),
    ]);
    setPlayStreak(ps);
    const done = played >= target;
    setGoal({ label: `Play ${target} games today`, target, progress: played, done });
    // First time the goal completes today, tick the Goal Streak.
    if (done && !gs.doneToday && !goalRecorded.current) {
      goalRecorded.current = true;
      setGoalStreak(await recordGoalDone());
    } else {
      setGoalStreak(gs);
    }
  }, [target]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Start today's duel: build (once/day) the system challenge, count the Play
  // Streak, and drop into the existing ghost-race pipeline.
  const startDuel = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const duel = await getTodaysDuel();
      if (!duel) return;
      setPlayStreak(await recordDuelPlayed());
      router.push(`/challenge?id=${duel.id}`);
    } finally {
      setStarting(false);
    }
  }, [router, starting]);

  return { meta, playStreak, goalStreak, goal, starting, startDuel, refresh };
};
