import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";

/*
useTournamentQueue manages a player's entry in the tournament matchmaking queue
(mirrors useOnlineStatus for ranked). Entering the tournament lobby writes a row
to `tournamentQueue`; leaving (assigned to a bracket, or going back) removes it.
A single-leader backend matcher batches waiting players into 8-person brackets.
*/
export const useTournamentQueue = () => {
  const { myProfile } = useMyProfile();

  const leaveTournamentQueue = useCallback(async () => {
    if (!myProfile) return;
    try {
      await supabase
        .from("tournamentQueue")
        .delete()
        .eq("profilesId", myProfile.id);
    } catch (error) {
      console.info(`Error leaving tournament queue ${error}`);
    }
  }, [myProfile]);

  const joinTournamentQueue = useCallback(
    async (
      gameVariant: "CROSSWORD" | "SUDOKU" = "CROSSWORD",
      difficulty: "REGULAR" | "HARD" = "REGULAR"
    ) => {
      if (!myProfile) return;
      await supabase.from("tournamentQueue").upsert(
        {
          profilesId: myProfile.id,
          gameVariant,
          difficulty,
          joinedAt: new Date().toISOString(),
        },
        { onConflict: "profilesId" }
      );
    },
    [myProfile]
  );

  return { joinTournamentQueue, leaveTournamentQueue };
};
