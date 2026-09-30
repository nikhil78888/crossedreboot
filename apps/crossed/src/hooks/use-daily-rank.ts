import useSWR from "swr";
import axios from "axios";

export type DailyRankEntry = {
  profileId: string;
  username: string | null;
  avatar: string | null;
  seconds: number | null; // null when the player DNF'd (didn't beat the clock)
  rank: number | null; // null for DNF rows
  isYou: boolean;
  dnf?: boolean;
};

export type DailyRank = {
  played: boolean;
  youDnf?: boolean;
  yourSeconds?: number | null;
  rank?: number | null;
  total?: number;
  percentile?: number | null; // "top X%" (rank / total)
  beatPct?: number; // "faster than Y% of players"
  entries?: DailyRankEntry[];
};

// Your standing on today's daily duel — rank + percentile among everyone who
// played the SAME puzzle. Server groups by the deterministic puzzle key, so it's
// timezone-proof. Returns { played:false } until you've finished today's duel.
export const useDailyRank = (enabled: boolean = true) => {
  const { data, isLoading, mutate } = useSWR<DailyRank>(
    enabled ? "daily-rank" : null,
    async () => (await axios.get<DailyRank>("/api/games/daily-rank")).data,
    { revalidateOnFocus: true }
  );
  return {
    dailyRank: data,
    isLoadingDailyRank: isLoading,
    refreshDailyRank: mutate,
  };
};
