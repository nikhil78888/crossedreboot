import { createRankedMatch } from "./game/game.service";
import { supabase } from "./lib/supabase";

const lobby = supabase.channel("online-status");

let blockedPlayers: string[] = [];

export const watchLobby = async () => {
  lobby
    // .on("presence", { event: "sync" }, () => {
    //   const newState = lobby.presenceState();
    //   playersInLobby = Object.values(newState).map((s) => ({
    //     userId: s[0].userId,
    //     rating: s[0].rating,
    //   }));
    // })
    .on("presence", { event: "join" }, async ({ key, newPresences }) => {
      const state = lobby.presenceState();
      const playerOne = {
        userId: newPresences[0].userId,
        rating: newPresences[0].rating,
      };
      const playersInLobby = Object.values(state).map((s: any) => ({
        userId: s[0].userId,
        rating: s[0].rating,
      }));
      const availablePlayers = playersInLobby.filter(
        (p) =>
          !blockedPlayers.includes(p.userId) && playerOne.userId !== p.userId
      );
      const playerTwo = availablePlayers[0];
      console.log({
        playerOne,
        playersInLobby,
        blockedPlayers,
        availablePlayers,
        playerTwo,
      });
      if (playerTwo) {
        console.log(`matching ${playerOne.userId} with ${playerTwo.userId}`);
        blockedPlayers = [
          ...blockedPlayers,
          playerOne.userId,
          playerTwo.userId,
        ];
        try {
          await createRankedMatch(playerOne.userId, playerTwo.userId);
        } catch (error) {
          blockedPlayers = blockedPlayers.filter(
            (p) => p !== playerOne.userId && p !== playerTwo.userId
          );
          console.log({ error });
        }
      }
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      const leftPlayerId = leftPresences[0].userId;
      blockedPlayers = blockedPlayers.filter((p) => p !== leftPlayerId);
      console.log({ leftPlayerId, blockedPlayers });
    })
    .subscribe();
};
