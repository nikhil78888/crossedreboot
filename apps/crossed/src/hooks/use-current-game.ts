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
      const { data, error } = await supabase
        .from("games")
        .select("*, profiles!gamePlayers!inner(*)")
        .filter("profiles.id", "eq", myProfile.id)
        .in("playState", ["PLAYING", "WAITING_FOR_OPPONENT"])
        .maybeSingle();
      if (error) {
        throw error;
      }

      return data?.id;
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
