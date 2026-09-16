import useSWR from "swr";
import axios from "axios";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 'DAILY_DUEL' or 'MONTHLY_SEASON_<VARIANT>' (e.g. MONTHLY_SEASON_CROSSWORD).
// Legacy monthly medals are the bare 'MONTHLY_SEASON'.
export type Medal = {
  id: string;
  type: string;
  periodKey: string; // 'YYYY-MM-DD' (daily) | 'YYYY-MM' (monthly)
  rank: number | null;
  total: number | null;
  percentile: number | null;
  createdAt: string;
};

export const isSeasonMedal = (m: Medal) => m.type.startsWith("MONTHLY_SEASON");
export const isDailyMedal = (m: Medal) => m.type === "DAILY_DUEL";
// The variant a season medal is for ('' for legacy bare MONTHLY_SEASON).
export const seasonMedalVariant = (m: Medal) =>
  m.type.replace("MONTHLY_SEASON_", "").replace("MONTHLY_SEASON", "");

// A player's earned medals (top-10% daily duels + top-10% monthly seasons),
// newest first.
export const useMedals = (profileId?: string | null) => {
  const { data, isLoading, mutate } = useSWR<Medal[]>(
    profileId ? ["medals", profileId] : null,
    async () =>
      (await axios.get<Medal[]>(`/api/profiles/medals?profileId=${profileId}`))
        .data,
    { revalidateOnFocus: true }
  );
  return {
    medals: data,
    isLoadingMedals: isLoading,
    refreshMedals: mutate,
  };
};

// Unseen-medal alerting: we store the medal count the player has last "seen"
// (i.e. opened their trophy case at), so the dashboard can badge the Trophies
// button when a new one is earned — daily OR monthly — without them going to
// look. Cheap: just a running count, no per-medal bookkeeping.
const SEEN_KEY = "medals:seenCount";

export const markMedalsSeen = async (count: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(SEEN_KEY, String(count));
  } catch {
    // best-effort
  }
};

// How many medals the player hasn't acknowledged yet (re-checks on focus).
export const useUnseenMedalCount = (total: number | undefined): number => {
  const [unseen, setUnseen] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (total == null) return;
        let seen = 0;
        try {
          seen = Number((await AsyncStorage.getItem(SEEN_KEY)) || 0);
        } catch {
          seen = 0;
        }
        if (active) setUnseen(Math.max(0, total - seen));
      })();
      return () => {
        active = false;
      };
    }, [total])
  );
  return unseen;
};
