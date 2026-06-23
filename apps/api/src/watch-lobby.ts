import {
  createRankedMatch,
  GameVariant,
  GameDifficulty,
} from "./game/game.service";
import { supabase } from "./lib/supabase";

// Acceptable rating gap as a function of how long a player has waited. Starts
// tight (prefer a near-skill opponent) and widens over time so nobody waits
// forever; the client falls back to a near-skill bot at its own timeout (~15s).
const RATING_WINDOW_START = 150;
const RATING_WINDOW_GROWTH_PER_SEC = 80;
const ratingWindow = (waitMs: number) =>
  RATING_WINDOW_START + (waitMs / 1000) * RATING_WINDOW_GROWTH_PER_SEC;

// Drop queue rows this old (a client that crashed without leaving the lobby).
const STALE_MS = 90_000;

let running = false;

// Poll the ranked queue and pair players. DB-backed (not realtime presence),
// because the server never reliably received presence — which left two real
// players in the lobby unmatched, both falling back to bots.
//
// Convention (multiplayer standard): prefer the closest-rated opponent, only
// pair inside a rating window that widens with wait time, and serve the
// longest-waiting players first. Paired rows are deleted immediately so the
// next poll can't double-match them.
const tryMatch = async () => {
  if (running) return;
  running = true;
  try {
    const { data: rows } = await supabase.from("rankedQueue").select("*");
    const now = Date.now();

    // Sweep stale entries.
    const stale = (rows ?? []).filter(
      (r) => now - new Date(r.joinedAt).getTime() > STALE_MS
    );
    for (const s of stale) {
      await supabase.from("rankedQueue").delete().eq("profilesId", s.profilesId);
    }

    const players = (rows ?? [])
      .filter((r) => now - new Date(r.joinedAt).getTime() <= STALE_MS)
      .map((r) => ({
        profilesId: r.profilesId,
        rating: r.rating ?? 1100,
        joinedAt: new Date(r.joinedAt).getTime(),
        gameVariant: (r.gameVariant ?? "CROSSWORD") as GameVariant,
        difficulty: (r.difficulty ?? "REGULAR") as GameDifficulty,
      }))
      // longest-waiting first
      .sort((a, b) => a.joinedAt - b.joinedAt);

    const used = new Set<string>();
    for (const p1 of players) {
      if (used.has(p1.profilesId)) continue;

      // closest-rated opponent still available — same variant AND difficulty,
      // so a sudoku/hard seeker only matches another sudoku/hard seeker.
      let best: (typeof players)[number] | null = null;
      let bestGap = Infinity;
      for (const p2 of players) {
        if (p2.profilesId === p1.profilesId || used.has(p2.profilesId)) continue;
        if (p2.gameVariant !== p1.gameVariant) continue;
        if (p2.difficulty !== p1.difficulty) continue;
        const gap = Math.abs(p1.rating - p2.rating);
        if (gap < bestGap) {
          bestGap = gap;
          best = p2;
        }
      }
      if (!best) continue;

      const waitMs = now - Math.min(p1.joinedAt, best.joinedAt);
      if (bestGap > ratingWindow(waitMs)) continue;

      used.add(p1.profilesId);
      used.add(best.profilesId);
      // Atomically CLAIM both queue rows (delete + returning) before creating
      // the match. If another poller/replica already claimed either, the delete
      // returns fewer than 2 rows and we bail — preventing double-matching the
      // same pair into two games.
      const { data: claimed } = await supabase
        .from("rankedQueue")
        .delete()
        .in("profilesId", [p1.profilesId, best.profilesId])
        .select("profilesId");
      if (!claimed || claimed.length < 2) {
        continue; // someone else grabbed one of them
      }
      console.log(
        `matching ${p1.profilesId} with ${best.profilesId} (${p1.gameVariant}/${p1.difficulty}, gap ${bestGap}, waited ${Math.round(
          waitMs / 1000
        )}s)`
      );
      try {
        await createRankedMatch(
          p1.profilesId,
          best.profilesId,
          p1.gameVariant,
          p1.difficulty
        );
      } catch (error) {
        console.log({ matchError: error });
      }
    }
  } catch (error) {
    console.log({ tryMatchError: error });
  } finally {
    running = false;
  }
};

export const watchLobby = async () => {
  setInterval(tryMatch, 2500);
};
