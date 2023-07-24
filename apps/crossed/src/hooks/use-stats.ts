import useSWR from "swr";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";

export const useStats = () => {
  const { myProfile } = useMyProfile();

  const { data: stats, mutate: refreshStats } = useSWR(
    myProfile ? `stats-${myProfile.id}` : null,
    async () => {
      if (myProfile) {
        const { count: gamesPlayed, error: fetchGamesPlayedError } =
          await supabase
            .from("games")
            .select("*, players:profiles!gamePlayers!inner(*)", {
              count: "exact",
              head: true,
            })
            .eq("playState", "COMPLETED")
            .filter("profiles.id", "eq", myProfile.id);

        if (fetchGamesPlayedError) {
          console.info({ fetchGamesPlayedError });
          throw fetchGamesPlayedError;
        }

        const { count: gamesWon, error: fetchGamesWonError } = await supabase
          .from("games")
          .select("*, players:profiles!gamePlayers!inner(*)", {
            count: "exact",
            head: true,
          })
          .eq("winnerId", myProfile.id);

        if (fetchGamesWonError) {
          console.info({ fetchGamesWonError });
          throw fetchGamesWonError;
        }

        return { gamesPlayed, gamesWon };
      }
    }
  );

  return { stats, refreshStats };
};
