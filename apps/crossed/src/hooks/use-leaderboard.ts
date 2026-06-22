import useSWR from "swr";
import axios from "axios";

export type LeaderboardEntry = {
  id: string;
  username: string;
  eloRating: number;
  country?: string | null;
  avatar?: string | null;
};

// Fetches the global leaderboard from the backend (service-role endpoint, so it
// can read all profiles — anon reads are blocked by RLS). Ranked per variant:
// crossword and sudoku have separate ladders.
export const useLeaderboard = (
  variant: "CROSSWORD" | "SUDOKU" = "CROSSWORD",
  scope: "GLOBAL" | "FRIENDS" = "GLOBAL"
) => {
  const { data, isLoading, error, mutate } = useSWR(
    ["leaderboard", variant, scope],
    async () => {
      const res = await axios.get<LeaderboardEntry[]>(
        `/api/profiles/leaderboard?limit=100&variant=${variant}${
          scope === "FRIENDS" ? "&scope=friends" : ""
        }`
      );
      return res.data;
    },
    { revalidateOnFocus: true }
  );

  return {
    leaderboard: data,
    isLoadingLeaderboard: isLoading,
    leaderboardError: error,
    refreshLeaderboard: mutate,
  };
};
