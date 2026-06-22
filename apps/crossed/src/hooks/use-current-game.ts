import useSWR from "swr";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";

/*
useCurrentGame checks if there is an existing game in progress
when the app is launched. If found, the home screen redirects
to the game page.
*/

export const useCurrentGame = () => {
  const { myProfile, isLoadingMyProfile } = useMyProfile();
  const {
    data: currentGameId,
    isLoading: loadingCurrentGameId,
    error: loadCurrentGameError,
  } = useSWR(myProfile ? "current-game" : null, async () => {
    if (myProfile) {
      // Take the most recent active game. (Not .maybeSingle() — that THROWS if
      // more than one active game is returned, which happens with tournaments
      // and crashed the app when leaving one.)
      const { data, error } = await supabase
        .from("games")
        .select("id, createdAt, gameType, profiles!gamePlayers!inner(*)")
        .filter("profiles.id", "eq", myProfile.id)
        .in("playState", ["PLAYING", "WAITING_FOR_OPPONENT"])
        .order("createdAt", { ascending: false })
        .limit(1);
      if (error) {
        throw error;
      }

      // Don't auto-redirect Home into tournament matches — those are entered
      // from the bracket, and auto-redirect made leaving a tournament bounce
      // straight back in.
      const game = data?.[0];
      if (!game || game.gameType === "TOURNAMENT") return undefined;
      return game.id;
    }
  });

  if (loadCurrentGameError) {
    console.error({ loadCurrentGameError });
  }

  return {
    currentGameId,
    loadingCurrentGameId: isLoadingMyProfile || loadingCurrentGameId,
  };
};
