import { createRankedMatch } from "./game/game.service";
import { supabase } from "./lib/supabase";

const lobby = supabase.channel("online-status");

let blockedPlayers: string[] = [];

// When each waiting player first appeared in the lobby, so we can widen the
// acceptable rating gap the longer they've been waiting.
const joinedAt = new Map<string, number>();

// Acceptable rating gap as a function of how long a player has waited.
// Starts tight (prefer a near-skill opponent) and widens over time so nobody
// waits forever; after ~25s anyone is fair game (the client falls back to a
// near-skill bot at its own timeout if still unmatched).
const RATING_WINDOW_START = 150;
const RATING_WINDOW_GROWTH_PER_SEC = 80;
const ratingWindow = (waitMs: number) =>
  RATING_WINDOW_START + (waitMs / 1000) * RATING_WINDOW_GROWTH_PER_SEC;

// Matchmaking convention (multiplayer standard): prefer the closest-rated
// opponent, only pair when the rating gap is inside a window that widens with
// wait time, prioritise whoever has waited longest, and block players the
// moment they're paired so concurrent runs can't double-match.
//
// Runs on every presence change (join AND sync) and on a short interval, so
// the window keeps widening even when no new presence events arrive.
const tryMatch = async () => {
  const state = lobby.presenceState();
  const now = Date.now();
  const players = Object.values(state)
    .map((s: any) => ({
      userId: s[0]?.userId as string,
      rating: (s[0]?.rating as number) ?? 1100,
    }))
    .filter((p) => p.userId && !blockedPlayers.includes(p.userId));

  // Track join times: stamp new arrivals, forget anyone who left.
  const present = new Set(players.map((p) => p.userId));
  for (const id of Array.from(joinedAt.keys())) {
    if (!present.has(id)) joinedAt.delete(id);
  }
  for (const p of players) {
    if (!joinedAt.has(p.userId)) joinedAt.set(p.userId, now);
  }

  // Longest-waiting players get matched first.
  players.sort(
    (a, b) => (joinedAt.get(a.userId) ?? now) - (joinedAt.get(b.userId) ?? now)
  );

  const used = new Set<string>();
  for (const playerOne of players) {
    if (used.has(playerOne.userId) || blockedPlayers.includes(playerOne.userId))
      continue;

    // Find the closest-rated opponent still available.
    let best: (typeof players)[number] | null = null;
    let bestGap = Infinity;
    for (const playerTwo of players) {
      if (
        playerTwo.userId === playerOne.userId ||
        used.has(playerTwo.userId) ||
        blockedPlayers.includes(playerTwo.userId)
      )
        continue;
      const gap = Math.abs(playerOne.rating - playerTwo.rating);
      if (gap < bestGap) {
        bestGap = gap;
        best = playerTwo;
      }
    }
    if (!best) continue;

    // Only match if the gap fits the (time-widening) window of whichever of the
    // pair has waited longest.
    const waitMs =
      now -
      Math.min(
        joinedAt.get(playerOne.userId) ?? now,
        joinedAt.get(best.userId) ?? now
      );
    if (bestGap > ratingWindow(waitMs)) continue;

    used.add(playerOne.userId);
    used.add(best.userId);
    const playerTwo = best;
    blockedPlayers = [...blockedPlayers, playerOne.userId, playerTwo.userId];
    joinedAt.delete(playerOne.userId);
    joinedAt.delete(playerTwo.userId);
    console.log(
      `matching ${playerOne.userId} with ${playerTwo.userId} (gap ${bestGap}, waited ${Math.round(
        waitMs / 1000
      )}s)`
    );
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
      joinedAt.delete(leftPlayerId);
      console.log({ leftPlayerId, blockedPlayers });
    })
    .subscribe();

  // Re-evaluate periodically so the rating window keeps widening for players
  // who are waiting even when no presence events fire.
  setInterval(() => {
    tryMatch();
  }, 3000);
};
