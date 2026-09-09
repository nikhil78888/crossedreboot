import useSWR from "swr";
import axios from "axios";

export type DailyRank = {
  played: boolean;
  yourSeconds?: number;
  rank?: number;
  total?: number;
  percentile?: number; // "top X%" (rank / total)
  beatPct?: number; // "faster than Y% of players"
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
