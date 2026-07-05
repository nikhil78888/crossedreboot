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

  // Delete our queue row and RETURN what was removed. The removed rows act as an
  // atomic claim: the server matcher pairs two players by deleting BOTH their
  // rows in one statement and only proceeds if it got both. A Postgres row delete
  // returns to exactly one caller, so if the matcher already claimed us, our
  // delete comes back empty — which tells the bot-fallback we were matched and it
  // must NOT create a bot game (the cause of "matched to a human AND a bot").
  const leaveLobby = useCallback(async (): Promise<{ profilesId: string }[]> => {
    if (!myProfile) return [];
    try {
      const { data } = await supabase
        .from("rankedQueue")
        .delete()
        .eq("profilesId", myProfile.id)
        .select("profilesId");
      return data ?? [];
    } catch (error) {
      console.info(`Error leaving lobby ${error}`);
      return [];
    }
  }, [myProfile]);

  const joinLobby = useCallback(
    async (
      gameVariant: string = "CROSSWORD",
      difficulty: "REGULAR" | "HARD" = "REGULAR"
    ) => {
      if (!myProfile) return;
      // Queue with the rating for the variant being played, so matchmaking
      // pairs by the right skill ladder (and difficulty).
      const rating =
        gameVariant === "SUDOKU"
          ? (myProfile as { eloRatingSudoku?: number }).eloRatingSudoku ?? 1000
          : myProfile.eloRating ?? 1000;
      await supabase.from("rankedQueue").upsert(
        {
          profilesId: myProfile.id,
          rating,
          joinedAt: new Date().toISOString(),
          gameVariant,
          difficulty,
        },
        { onConflict: "profilesId" }
      );
    },
    [myProfile]
  );

  return {
    leaveLobby,
    joinLobby,
  };
};
