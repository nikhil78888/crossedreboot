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
      // Note: lastSeenAt is intentionally NOT sent here — the column defaults to
      // now() on insert, and the heartbeat keeps it fresh. Omitting it keeps this
      // insert working even if the OTA reaches a device before the heartbeat
      // migration has been applied (order-independent rollout).
      const { error } = await supabase.from("rankedQueue").upsert(
        {
          profilesId: myProfile.id,
          rating,
          joinedAt: new Date().toISOString(),
          gameVariant,
          difficulty,
        },
        { onConflict: "profilesId" }
      );
      // THROW on failure so the caller doesn't send the player into the lobby
      // with no queue row — where they'd never be matched and (since the bot
      // fallback only fires when it can claim its own row) never get a bot either.
      if (error) throw error;
    },
    [myProfile]
  );

  // Liveness ping while waiting in the lobby. The matcher only pairs rows with a
  // recent lastSeenAt, so if this stops (app backgrounded, crashed, killed) the
  // player stops being matchable within seconds — no no-show for an opponent.
  // Does NOT touch joinedAt, so the rating window keeps widening as they wait.
  const heartbeat = useCallback(async () => {
    if (!myProfile) return;
    try {
      await supabase
        .from("rankedQueue")
        .update({ lastSeenAt: new Date().toISOString() })
        .eq("profilesId", myProfile.id);
    } catch {
      // best-effort
    }
  }, [myProfile]);

  return {
    leaveLobby,
    joinLobby,
    heartbeat,
  };
};
