import useSWR from "swr";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";

export const useCurrentGame = () => {
  const { myProfile } = useMyProfile();
  const {
    data: currentGameId,
    isLoading: loadingCurrentGameId,
    error: loadCurrentGameError,
  } = useSWR(myProfile ? "current-game" : null, async () => {
    if (myProfile) {
      const { data, error } = await supabase
        .from("games")
        .select("*, profiles!inner(*)")
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
    loadingCurrentGameId,
  };
};
