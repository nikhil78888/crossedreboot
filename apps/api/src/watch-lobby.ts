import {
  createRankedMatch,
  GameVariant,
  GameDifficulty,
} from "./game/game.service";
import { supabase } from "./lib/supabase";
import { randomUUID } from "crypto";

// Acceptable rating gap as a function of how long a player has waited. Starts
// tight (prefer a near-skill opponent) and widens over time so nobody waits
// forever; the client falls back to a near-skill bot at its own timeout (~15s).
const RATING_WINDOW_START = 150;
const RATING_WINDOW_GROWTH_PER_SEC = 80;
const ratingWindow = (waitMs: number) =>
  RATING_WINDOW_START + (waitMs / 1000) * RATING_WINDOW_GROWTH_PER_SEC;

// Drop queue rows this old (a client that crashed without leaving the lobby).
const STALE_MS = 90_000;
// How many matches to create concurrently (bounds DB load during a big burst).
const CREATE_CONCURRENCY = 25;
// This process's id + how long it holds matchmaking leadership per acquisition.
const REPLICA_ID = randomUUID();
const LEASE_TTL_SECONDS = 10;

let running = false;

type QueuedPlayer = {
  profilesId: string;
  rating: number;
  joinedAt: number;
  gameVariant: GameVariant;
  difficulty: GameDifficulty;
};

// Pair the queue and create matches. Runs on every replica, but only the one
// holding the matchmaker lease actually does the work (so 1000 simultaneous
// joins are paired by a SINGLE matcher — no cross-replica duplicate scans or
// contention). Pairing is O(n log n): segment by variant+difficulty, sort by
// rating, pair adjacent players inside a wait-widened rating window. Each pair
// is claimed atomically (DELETE ... RETURNING) so it can never be double-matched.
const tryMatch = async () => {
  if (running) return;
  running = true;
  try {
    // Leader election: only the lease holder matches this tick.
    const { data: isLeader, error: leaseErr } = await supabase.rpc(
      "acquire_matchmaker_lease",
      { p_holder: REPLICA_ID, p_ttl_seconds: LEASE_TTL_SECONDS }
    );
    if (leaseErr) {
      console.log({ leaseError: leaseErr });
      return;
    }
    if (!isLeader) return;

    const now = Date.now();

    // Sweep stale entries in one batched delete.
    await supabase
      .from("rankedQueue")
      .delete()
      .lt("joinedAt", new Date(now - STALE_MS).toISOString());

    const { data: rows } = await supabase.from("rankedQueue").select("*");
    const fresh = (rows ?? []).filter(
      (r) => now - new Date(r.joinedAt).getTime() <= STALE_MS
    );
    if (fresh.length < 2) return;

    // Authoritative ratings come from profiles, never the client-supplied queue
    // value (which a client could forge to farm easy opponents).
    const ids = fresh.map((r) => r.profilesId);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, eloRating, eloRatingSudoku")
      .in("id", ids);
    const ratingOf = new Map(
      (profs ?? []).map((p) => [p.id, p])
    );

    const players: QueuedPlayer[] = fresh.map((r) => {
      const variant = (r.gameVariant ?? "CROSSWORD") as GameVariant;
      const prof = ratingOf.get(r.profilesId);
      const rating =
        variant === "SUDOKU"
          ? prof?.eloRatingSudoku ?? 1000
          : prof?.eloRating ?? 1000;
      return {
        profilesId: r.profilesId,
        rating,
        joinedAt: new Date(r.joinedAt).getTime(),
        gameVariant: variant,
        difficulty: (r.difficulty ?? "REGULAR") as GameDifficulty,
      };
    });

    // Segment by variant+difficulty (a sudoku/hard seeker only meets another).
    const segments = new Map<string, QueuedPlayer[]>();
    for (const p of players) {
      const key = `${p.gameVariant}|${p.difficulty}`;
      (segments.get(key) ?? segments.set(key, []).get(key)!).push(p);
    }

    // Build pairs: sort each segment by rating, pair adjacent within the window.
    const pairs: [QueuedPlayer, QueuedPlayer][] = [];
    for (const seg of segments.values()) {
      seg.sort((a, b) => a.rating - b.rating);
      let i = 0;
      while (i < seg.length - 1) {
        const a = seg[i];
        const b = seg[i + 1];
        const gap = Math.abs(a.rating - b.rating);
        const waitMs = now - Math.min(a.joinedAt, b.joinedAt);
        if (gap <= ratingWindow(waitMs)) {
          pairs.push([a, b]);
          i += 2;
        } else {
          // leave `a` for a later tick (its window widens as it waits)
          i += 1;
        }
      }
    }
    if (!pairs.length) return;

    // Claim + create with bounded concurrency.
    const claimAndCreate = async ([a, b]: [QueuedPlayer, QueuedPlayer]) => {
      const { data: claimed } = await supabase
        .from("rankedQueue")
        .delete()
        .in("profilesId", [a.profilesId, b.profilesId])
        .select("profilesId");
      if (!claimed || claimed.length < 2) return; // someone else grabbed one
      try {
        await createRankedMatch(a.profilesId, b.profilesId, a.gameVariant, a.difficulty);
      } catch (error) {
        // Re-queue both so a transient failure doesn't strand them.
        console.log({ matchError: error });
        await supabase.from("rankedQueue").upsert([
          { profilesId: a.profilesId, rating: a.rating, gameVariant: a.gameVariant, difficulty: a.difficulty, joinedAt: new Date(a.joinedAt).toISOString() },
          { profilesId: b.profilesId, rating: b.rating, gameVariant: b.gameVariant, difficulty: b.difficulty, joinedAt: new Date(b.joinedAt).toISOString() },
        ]);
      }
    };

    for (let i = 0; i < pairs.length; i += CREATE_CONCURRENCY) {
      await Promise.all(pairs.slice(i, i + CREATE_CONCURRENCY).map(claimAndCreate));
    }
    console.log(`matchmaker paired ${pairs.length} games across ${segments.size} segments`);
  } catch (error) {
    console.log({ tryMatchError: error });
  } finally {
    running = false;
  }
};

export const watchLobby = async () => {
  setInterval(tryMatch, 2500);
};
