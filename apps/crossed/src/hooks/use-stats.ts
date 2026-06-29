import useSWR from "swr";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";
import { startOfDay } from "date-fns";

export const useStats = (variant: string = "CROSSWORD") => {
  const { myProfile } = useMyProfile();

  const { data: stats, mutate: refreshStats } = useSWR(
    myProfile ? `stats-${myProfile.id}-${variant}` : null,
    async () => {
      if (myProfile) {
        const { count: gamesPlayed, error: fetchGamesPlayedError } =
          await supabase
            .from("games")
            .select("*, players:profiles!gamePlayers!inner(*)", {
              count: "exact",
              head: true,
            })
            .eq("gameType", "RANKED")
            .eq("gameVariant", variant)
            .eq("playState", "COMPLETED")
            .filter("profiles.id", "eq", myProfile.id);

        if (fetchGamesPlayedError) {
          console.info({ fetchGamesPlayedError });
          throw fetchGamesPlayedError;
        }

        const { count: gamesPlayedToday, error: fetchGamesPlayedTodayError } =
          await supabase
            .from("games")
            .select("*, players:profiles!gamePlayers!inner(*)", {
              count: "exact",
              head: true,
            })
            .eq("gameVariant", variant)
            .eq("playState", "COMPLETED")
            .gte("createdAt", startOfDay(new Date()).toISOString())
            .filter("profiles.id", "eq", myProfile.id);

        if (fetchGamesPlayedTodayError) {
          console.info({ fetchGamesPlayedTodayError });
          throw fetchGamesPlayedError;
        }

        const { count: gamesWon, error: fetchGamesWonError } = await supabase
          .from("games")
          .select("*, players:profiles!gamePlayers!inner(*)", {
            count: "exact",
            head: true,
          })
          .eq("gameType", "RANKED")
          .eq("gameVariant", variant)
          .eq("winnerId", myProfile.id);

        if (fetchGamesWonError) {
          console.info({ fetchGamesWonError });
          throw fetchGamesWonError;
        }

        return { gamesPlayed, gamesPlayedToday, gamesWon };
      }
    }
  );

  return { stats, refreshStats };
};
