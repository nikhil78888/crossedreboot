import { createRankedMatch } from "./game/game.service";
import { supabase } from "./lib/supabase";

const lobby = supabase.channel("online-status");

let blockedPlayers: string[] = [];

// Pair up everyone currently waiting. Runs on every presence change (join AND
// sync), so players already in the lobby when the backend (re)connects still
// get matched — the old code only matched on "join", so a redeploy/reconnect
// left already-present players unmatched and they fell back to bots.
//
// Convention: prefer the closest-rated opponent (sort by rating, pair
// neighbors), block players the moment they're paired so concurrent runs can't
// double-match, and unblock on failure or leave.
const tryMatch = async () => {
  const state = lobby.presenceState();
  const players = Object.values(state)
    .map((s: any) => ({
      userId: s[0]?.userId as string,
      rating: (s[0]?.rating as number) ?? 1100,
    }))
    .filter((p) => p.userId && !blockedPlayers.includes(p.userId));

  players.sort((a, b) => a.rating - b.rating);

  for (let i = 0; i + 1 < players.length; i += 2) {
    const playerOne = players[i];
    const playerTwo = players[i + 1];
    if (
      blockedPlayers.includes(playerOne.userId) ||
      blockedPlayers.includes(playerTwo.userId)
    ) {
      continue;
    }
    blockedPlayers = [...blockedPlayers, playerOne.userId, playerTwo.userId];
    console.log(`matching ${playerOne.userId} with ${playerTwo.userId}`);
    createRankedMatch(playerOne.userId, playerTwo.userId).catch((error) => {
      blockedPlayers = blockedPlayers.filter(
        (p) => p !== playerOne.userId && p !== playerTwo.userId
      );
      console.log({ matchError: error });
    });
  }
};

export const watchLobby = async () => {
  lobby
    .on("presence", { event: "sync" }, () => {
      tryMatch();
    })
    .on("presence", { event: "join" }, () => {
      tryMatch();
    })
    .on("presence", { event: "leave" }, ({ leftPresences }) => {
      const leftPlayerId = leftPresences[0]?.userId;
      blockedPlayers = blockedPlayers.filter((p) => p !== leftPlayerId);
      console.log({ leftPlayerId, blockedPlayers });
    })
    .subscribe();
};
