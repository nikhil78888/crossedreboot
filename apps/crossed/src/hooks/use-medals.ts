import useSWR from "swr";
import axios from "axios";

export type MedalType = "DAILY_DUEL" | "MONTHLY_SEASON";

export type Medal = {
  id: string;
  type: MedalType;
  periodKey: string; // 'YYYY-MM-DD' (daily) | 'YYYY-MM' (monthly)
  rank: number | null;
  total: number | null;
  percentile: number | null;
  createdAt: string;
};

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
