import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";
import axios from "axios";

export const useRankedGame = () => {
  const { myProfile } = useMyProfile();
  const { data: gameId } = useSWRSubscription(
    myProfile ? ["ranked-game"] : null,
    (key, { next }: SWRSubscriptionOptions<string, Error>) => {
      const subscription = supabase
        .channel(`new-ranked-game`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "gamePlayers",
          },
          async (data) => {
            if (
              data.new.profilesId === myProfile?.id &&
              data.new.playState !== "COMPLETED"
            )
              next(null, data.new.gamesId);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  );

  const startRankedGame = async () => {
    if (myProfile) {
      await axios.post(`/api/games/ranked`, {
        userId: myProfile.id,
      });
    }
  };

  return {
    startRankedGame,
    gameId,
  };
};
