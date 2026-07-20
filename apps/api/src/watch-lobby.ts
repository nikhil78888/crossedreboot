import {
  createRankedMatch,
  GameVariant,
  GameDifficulty,
} from "./game/game.service";
import { supabase } from "./lib/supabase";
import { eloColumnFor } from "./rating-fields";
import { randomUUID } from "crypto";

// Acceptable rating gap as a function of how long a player has waited. Starts
// tight (prefer a near-skill opponent) and widens over time so nobody waits
// forever; the client falls back to a near-skill bot at its own timeout (~15s).
const RATING_WINDOW_START = 150;
const RATING_WINDOW_GROWTH_PER_SEC = 80;
const ratingWindow = (waitMs: number) =>
  RATING_WINDOW_START + (waitMs / 1000) * RATING_WINDOW_GROWTH_PER_SEC;

// A row is only matchable if it was seen this recently. Heartbeating clients
// refresh lastSeenAt every ~4s so they stay live as long as they're waiting; a
// backgrounded/crashed client stops refreshing and becomes unmatchable within
// this window (down from the old 90s), so it can't no-show its opponent. Old
// clients that don't heartbeat yet have lastSeenAt = join time, so they stay
// matchable for their whole ~18s wait — this window must stay comfortably above
// that so we never regress them to bots.
const STALE_MS = 30_000;
// After this wait, pair two same-segment players regardless of rating gap, so a
// real match always beats the client's ~18s bot fallback (see pairing loop).
const FORCE_PAIR_MS = 12_000;
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

    // Sweep entries not seen within the window (client backgrounded/crashed/
    // killed) so we never pair against someone who has walked away.
    await supabase
      .from("rankedQueue")
      .delete()
      .lt("lastSeenAt", new Date(now - STALE_MS).toISOString());

    const { data: rows } = await supabase.from("rankedQueue").select("*");
    // Only pair players seen recently — a stale row means the player is gone, and
    // matching them would strand their opponent in a no-show.
    const fresh = (rows ?? []).filter((r) => {
      const lastSeen = r.lastSeenAt ?? r.joinedAt; // pre-migration rows
      return now - new Date(lastSeen).getTime() <= STALE_MS;
    });
    if (fresh.length < 2) return;

    // Authoritative ratings come from profiles, never the client-supplied queue
    // value (which a client could forge to farm easy opponents).
    const ids = fresh.map((r) => r.profilesId);
    const { data: profs } = await supabase
      .from("profiles")
      .select(
        "id, eloRating, eloRatingSudoku, eloRatingWordSearch, eloRatingTrivia"
      )
      .in("id", ids);
    const ratingOf = new Map(
      (profs ?? []).map((p) => [p.id, p])
    );

    const players: QueuedPlayer[] = fresh.map((r) => {
      const variant = (r.gameVariant ?? "CROSSWORD") as GameVariant;
      const prof = ratingOf.get(r.profilesId);
      const rating =
        (prof as Record<string, number> | undefined)?.[
          eloColumnFor(variant)
        ] ?? 1000;
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
        // Once either player has waited past the force-pair threshold, pair them
        // with their nearest-rating neighbour REGARDLESS of the window. Otherwise
        // two real players whose ratings differ by more than the window has grown
        // both time out to bots at ~15s — a human match lost to two bot matches.
        const forced =
          now - a.joinedAt >= FORCE_PAIR_MS || now - b.joinedAt >= FORCE_PAIR_MS;
        if (gap <= ratingWindow(waitMs) || forced) {
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
      if (!claimed || claimed.length < 2) {
        // PARTIAL claim: the other player was grabbed first (their own bot
        // fallback, or they left), but our DELETE still removed whoever WAS
        // present. Put them back — otherwise they sit in the lobby with no queue
        // row and no game, and their bot fallback (which only fires when it can
        // claim its own row) can never rescue them: a permanent "finding
        // player…" hang.
        const stranded = (claimed ?? []).map((c) => c.profilesId);
        for (const p of [a, b]) {
          if (!stranded.includes(p.profilesId)) continue;
          await supabase.from("rankedQueue").upsert(
            {
              profilesId: p.profilesId,
              rating: p.rating,
              gameVariant: p.gameVariant,
              difficulty: p.difficulty,
              joinedAt: new Date(p.joinedAt).toISOString(),
              lastSeenAt: new Date().toISOString(),
            },
            { onConflict: "profilesId" }
          );
        }
        return;
      }
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
