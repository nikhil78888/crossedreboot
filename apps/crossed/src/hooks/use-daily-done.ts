import { useEffect, useState } from "react";
import { getTodaysResult } from "../lib/daily-duel";

// Whether today's Daily Duel is already done — drives the red badge on the Daily
// tab. Polls (cheap AsyncStorage read) so the badge clears shortly after the
// player finishes on another screen. null = still loading (don't flash a badge).
export const useDailyDone = (): boolean | null => {
  const [done, setDone] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const check = async () => {
      const r = await getTodaysResult();
      if (active) setDone(r != null);
    };
    check();
    const id = setInterval(check, 8000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);
  return done;
};
