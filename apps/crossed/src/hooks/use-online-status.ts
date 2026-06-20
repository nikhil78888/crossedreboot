import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";

/*
useOnlineStatus manages a player's entry in the ranked matchmaking queue.

Entering the ranked lobby writes a row to `rankedQueue`; leaving (match found,
bot fallback, or going back) removes it. The backend polls this table to pair
players. This replaced realtime presence, which the server never reliably
received — so two real players were never matched.
*/

export const useOnlineStatus = () => {
  const { myProfile } = useMyProfile();

  const leaveLobby = useCallback(async () => {
    if (!myProfile) return;
    try {
      await supabase
        .from("rankedQueue")
        .delete()
        .eq("profilesId", myProfile.id);
    } catch (error) {
      console.info(`Error leaving lobby ${error}`);
    }
  }, [myProfile]);

  const joinLobby = useCallback(async () => {
    if (!myProfile) return;
    await supabase.from("rankedQueue").upsert(
      {
        profilesId: myProfile.id,
        rating: myProfile.eloRating ?? 1000,
        joinedAt: new Date().toISOString(),
      },
      { onConflict: "profilesId" }
    );
  }, [myProfile]);

  return {
    leaveLobby,
    joinLobby,
  };
};
