import { supabase } from "./lib/supabase";
import { startTournament, TOURNAMENT_SIZE } from "./tournament/tournament.service";
import { randomUUID } from "crypto";

// Batch waiting players into clean 8-person tournaments. Mirrors the ranked
// matcher: runs on every replica, but only the lease holder does the work, so a
// burst of (say) 2000 simultaneous joins is packed by ONE matcher into ~250
// tournaments with no cross-replica contention. A partial group (< 8) that has
// waited past BOTFILL_MS gets a tournament with its empty seats filled by bots,
// so nobody waits forever when traffic is sparse.
const STALE_MS = 90_000;
const BOTFILL_MS = 12_000;
const CREATE_CONCURRENCY = 10;
const REPLICA_ID = randomUUID();
const LEASE_TTL_SECONDS = 10;

let running = false;

type Q = {
  profilesId: string;
  gameVariant: string;
  difficulty: string;
  joinedAt: number;
};

const matchTournamentQueue = async () => {
  if (running) return;
  running = true;
  try {
    const { data: isLeader, error: leaseErr } = await supabase.rpc("acquire_lease", {
      p_name: "tournament-matcher",
      p_holder: REPLICA_ID,
      p_ttl_seconds: LEASE_TTL_SECONDS,
    });
    if (leaseErr) {
      console.log({ tournamentLeaseError: leaseErr });
      return;
    }
    if (!isLeader) return;

    const now = Date.now();
    // sweep crashed clients
    await supabase
      .from("tournamentQueue")
      .delete()
      .lt("joinedAt", new Date(now - STALE_MS).toISOString());

    const { data: rows } = await supabase.from("tournamentQueue").select("*");
    const players: Q[] = (rows ?? [])
      .filter((r) => now - new Date(r.joinedAt).getTime() <= STALE_MS)
      .map((r) => ({
        profilesId: r.profilesId,
        gameVariant: r.gameVariant ?? "CROSSWORD",
        difficulty: r.difficulty ?? "REGULAR",
        joinedAt: new Date(r.joinedAt).getTime(),
      }));
    if (!players.length) return;

    // segment by variant+difficulty, then form full 8s + bot-fill old partials
    const segments = new Map<string, Q[]>();
    for (const p of players) {
      const key = `${p.gameVariant}|${p.difficulty}`;
      (segments.get(key) ?? segments.set(key, []).get(key)!).push(p);
    }

    const batches: Q[][] = [];
    for (const seg of segments.values()) {
      seg.sort((a, b) => a.joinedAt - b.joinedAt);
      let i = 0;
      while (seg.length - i >= TOURNAMENT_SIZE) {
        batches.push(seg.slice(i, i + TOURNAMENT_SIZE));
        i += TOURNAMENT_SIZE;
      }
      const rest = seg.slice(i);
      if (rest.length && now - rest[0].joinedAt >= BOTFILL_MS) {
        batches.push(rest); // partial group -> startTournament will bot-fill it
      }
    }
    if (!batches.length) return;

    const createOne = async (batch: Q[]) => {
      const { gameVariant, difficulty } = batch[0];
      const ids = batch.map((b) => b.profilesId);
      // Claim the batch out of the queue first (atomic). If another tick already
      // grabbed some, only seat the ones we actually claimed.
      const { data: claimed } = await supabase
        .from("tournamentQueue")
        .delete()
        .in("profilesId", ids)
        .select("profilesId");
      const claimedIds = (claimed ?? []).map((c) => c.profilesId);
      if (!claimedIds.length) return;
      try {
        const { data: t } = await supabase
          .from("tournaments")
          .insert({ status: "FILLING", size: TOURNAMENT_SIZE, gameVariant, difficulty })
          .select("*")
          .single();
        if (!t) throw new Error("tournament insert returned nothing");
        await supabase.from("tournamentPlayers").insert(
          claimedIds.map((id) => ({ tournamentsId: t.id, profilesId: id, isBot: false }))
        );
        // claims the start atomically, fills empty seats with bots, builds round 1
        await startTournament(t.id);
      } catch (error) {
        console.log({ tournamentCreateError: error });
        // re-enqueue the claimed players so a transient failure doesn't strand them
        await supabase.from("tournamentQueue").upsert(
          batch
            .filter((b) => claimedIds.includes(b.profilesId))
            .map((b) => ({
              profilesId: b.profilesId,
              gameVariant: b.gameVariant,
              difficulty: b.difficulty,
              joinedAt: new Date(b.joinedAt).toISOString(),
            })),
          { onConflict: "profilesId" }
        );
      }
    };

    for (let i = 0; i < batches.length; i += CREATE_CONCURRENCY) {
      await Promise.all(batches.slice(i, i + CREATE_CONCURRENCY).map(createOne));
    }
    console.log(`tournament matcher created ${batches.length} brackets`);
  } catch (error) {
    console.log({ matchTournamentQueueError: error });
  } finally {
    running = false;
  }
};

export const watchTournamentQueue = async () => {
  setInterval(matchTournamentQueue, 2500);
};
