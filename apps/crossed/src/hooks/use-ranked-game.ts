import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";
import axios from "axios";

/*
useRankedGame uses an swr subscription combined with
supabse realtime updates to listen for new ranked games
when a player is waiting in lobby.

It subscribes to the `gamePlayers` table for new entries.
When a new entry is made, the new gameId is updated.

The ranked-lobby screen listens of the new gameId and
starts a ranked match.
*/

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
