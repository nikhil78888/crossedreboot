import { createRankedMatch } from "./game/game.service";
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
      }))
      // longest-waiting first
      .sort((a, b) => a.joinedAt - b.joinedAt);

    const used = new Set<string>();
    for (const p1 of players) {
      if (used.has(p1.profilesId)) continue;

      // closest-rated opponent still available
      let best: (typeof players)[number] | null = null;
      let bestGap = Infinity;
      for (const p2 of players) {
        if (p2.profilesId === p1.profilesId || used.has(p2.profilesId)) continue;
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
      // Remove from the queue before creating the match so a slow create can't
      // be double-matched on the next tick.
      await supabase
        .from("rankedQueue")
        .delete()
        .in("profilesId", [p1.profilesId, best.profilesId]);
      console.log(
        `matching ${p1.profilesId} with ${best.profilesId} (gap ${bestGap}, waited ${Math.round(
          waitMs / 1000
        )}s)`
      );
      try {
        await createRankedMatch(p1.profilesId, best.profilesId);
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
