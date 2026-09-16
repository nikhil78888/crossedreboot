import useSWR from "swr";
import axios from "axios";

export type SeasonEntry = {
  profileId: string;
  username: string | null;
  avatar: string | null;
  seasonRating: number;
  rank: number;
  isYou: boolean;
};

export type SeasonLeaderboard = {
  seasonKey: string; // 'YYYY-MM'
  monthName: string; // e.g. "September"
  resetsInDays: number;
  total: number;
  myRank: number | null;
  myRating: number | null;
  entries: SeasonEntry[];
};

// The monthly SEASON leaderboard — ranked by the season rating, which resets to
// 1000 on the 1st of each month (a fresh race). Public; pass the caller's
// profileId so the server can mark the "you" row and resolve their rank when
// they're outside the returned page.
export const useSeasonLeaderboard = (profileId?: string | null) => {
  const { data, isLoading, mutate } = useSWR<SeasonLeaderboard>(
    ["season-leaderboard", profileId || "anon"],
    async () =>
      (
        await axios.get<SeasonLeaderboard>(
          `/api/profiles/season-leaderboard?limit=100${
            profileId ? `&profileId=${profileId}` : ""
          }`
        )
      ).data,
    { revalidateOnFocus: true }
  );
  return {
    season: data,
    isLoadingSeason: isLoading,
    refreshSeason: mutate,
  };
};
