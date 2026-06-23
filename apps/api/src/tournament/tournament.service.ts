import { addSeconds } from "date-fns";
import { supabase } from "../lib/supabase";
import { resolveCluesForDifficulty } from "../game/clue-resolver";

// Time limit scales with puzzle size (kept local to avoid a circular import
// with game.service, which depends on this module).
const durationForSize = (size: number | null | undefined, base: number) =>
  size && size >= 9 ? 420 : size && size >= 7 ? 300 : base;

const TOURNAMENT_SIZE = 8;
const SUDOKU_DURATION_SECONDS = 900;

export type GameVariant = "CROSSWORD" | "SUDOKU";
export type GameDifficulty = "REGULAR" | "HARD";

type TPlayer = {
  id: string;
  tournamentsId: string;
  profilesId: string;
  seat: number | null;
  isBot: boolean;
};
type TMatch = {
  id: string;
  tournamentsId: string;
  round: number;
  matchIndex: number;
  playerOneId: string | null;
  playerTwoId: string | null;
  gamesId: string | null;
  winnerId: string | null;
  status: string;
};

const shuffle = <T>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getRating = async (profileId: string): Promise<number> => {
  const { data } = await supabase
    .from("profiles")
    .select("eloRating")
    .eq("id", profileId)
    .single();
  return data?.eloRating ?? 1000;
};

const markEliminated = async (tournamentId: string, profileId: string) => {
  await supabase
    .from("tournamentPlayers")
    .update({ eliminated: true })
    .eq("tournamentsId", tournamentId)
    .eq("profilesId", profileId);
};

// A player joins (or is matched into) a tournament. Returns the tournament id.
// Re-joining returns the player's existing active tournament.
export const joinTournament = async (
  profileId: string,
  gameVariant: GameVariant = "CROSSWORD",
  difficulty: GameDifficulty = "REGULAR"
): Promise<string> => {
  const { data: mine } = await supabase
    .from("tournamentPlayers")
    .select("tournamentsId")
    .eq("profilesId", profileId);
  const tids = (mine ?? []).map((r) => r.tournamentsId);
  if (tids.length) {
    const { data: activeT } = await supabase
      .from("tournaments")
      .select("*")
      .in("id", tids)
      .in("status", ["FILLING", "IN_PROGRESS"])
      .eq("gameVariant", gameVariant)
      .eq("difficulty", difficulty)
      .order("createdAt", { ascending: false })
      .limit(1);
    if (activeT?.length) return activeT[0].id;
  }

  // Oldest PUBLIC FILLING tournament of this variant + difficulty with an open
  // seat. Private tournaments are invite-only and never matched into here.
  const { data: filling } = await supabase
    .from("tournaments")
    .select("*")
    .eq("status", "FILLING")
    .eq("gameVariant", gameVariant)
    .eq("difficulty", difficulty)
    .eq("isPrivate", false)
    .order("createdAt", { ascending: true });
  let target = null as null | { id: string; size: number };
  for (const t of filling ?? []) {
    const { data: ps } = await supabase
      .from("tournamentPlayers")
      .select("id")
      .eq("tournamentsId", t.id);
    if ((ps?.length ?? 0) < (t.size ?? TOURNAMENT_SIZE)) {
      target = t;
      break;
    }
  }
  if (!target) {
    const { data: created } = await supabase
      .from("tournaments")
      .insert({
        status: "FILLING",
        size: TOURNAMENT_SIZE,
        gameVariant,
        difficulty,
      })
      .select("*")
      .single();
    target = created;
  }
  if (!target) throw new Error("could not create tournament");

  await supabase
    .from("tournamentPlayers")
    .insert({ tournamentsId: target.id, profilesId: profileId, isBot: false });

  // Start immediately if a full field of humans showed up.
  const { data: count } = await supabase
    .from("tournamentPlayers")
    .select("id")
    .eq("tournamentsId", target.id);
  if ((count?.length ?? 0) >= (target.size ?? TOURNAMENT_SIZE)) {
    await startTournament(target.id);
  }
  return target.id;
};

// --- Private (friends-only) tournaments ------------------------------------

// Create a private bracket and seat the creator. Friends are added by invite;
// it never appears in public matchmaking.
export const createPrivateTournament = async (
  creatorId: string,
  gameVariant: GameVariant = "CROSSWORD",
  difficulty: GameDifficulty = "REGULAR"
): Promise<string> => {
  const { data: t } = await supabase
    .from("tournaments")
    .insert({
      status: "FILLING",
      size: TOURNAMENT_SIZE,
      gameVariant,
      difficulty,
      isPrivate: true,
      createdByProfileId: creatorId,
    })
    .select("*")
    .single();
  if (!t) throw new Error("could not create tournament");
  await supabase
    .from("tournamentPlayers")
    .insert({ tournamentsId: t.id, profilesId: creatorId, isBot: false });
  return t.id;
};

// Creator invites friends to a private tournament (idempotent per friend).
export const inviteToTournament = async (
  tournamentId: string,
  inviterId: string,
  friendIds: string[]
) => {
  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  if (!t || t.createdByProfileId !== inviterId) {
    throw new Error("only the creator can invite");
  }
  if (!friendIds?.length) return;
  await supabase.from("tournamentInvites").upsert(
    friendIds.map((fid) => ({
      tournamentsId: tournamentId,
      invitedProfileId: fid,
    })),
    { onConflict: "tournamentsId,invitedProfileId", ignoreDuplicates: true }
  );
};

// An invited player accepts and is seated. Auto-starts when the field is full.
export const acceptTournamentInvite = async (
  profileId: string,
  tournamentId: string
): Promise<string> => {
  const { data: inv } = await supabase
    .from("tournamentInvites")
    .select("*")
    .eq("tournamentsId", tournamentId)
    .eq("invitedProfileId", profileId)
    .maybeSingle();
  if (!inv) throw new Error("no invite for this tournament");
  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  if (!t || t.status !== "FILLING") throw new Error("tournament not joinable");

  const { data: seated } = await supabase
    .from("tournamentPlayers")
    .select("id")
    .eq("tournamentsId", tournamentId);
  if ((seated?.length ?? 0) >= (t.size ?? TOURNAMENT_SIZE)) {
    throw new Error("tournament is full");
  }

  await supabase
    .from("tournamentInvites")
    .update({ status: "ACCEPTED" })
    .eq("id", inv.id);
  await supabase.from("tournamentPlayers").upsert(
    { tournamentsId: tournamentId, profilesId: profileId, isBot: false },
    { onConflict: "tournamentsId,profilesId", ignoreDuplicates: true }
  );

  const { data: count } = await supabase
    .from("tournamentPlayers")
    .select("id")
    .eq("tournamentsId", tournamentId);
  if ((count?.length ?? 0) >= (t.size ?? TOURNAMENT_SIZE)) {
    await startTournament(tournamentId);
  }
  return tournamentId;
};

// Pending tournament invites for a player (only to still-FILLING brackets),
// with the inviter's name + tournament variant for display.
export const listTournamentInvitesForProfile = async (profileId: string) => {
  const { data: invites } = await supabase
    .from("tournamentInvites")
    .select("*")
    .eq("invitedProfileId", profileId)
    .eq("status", "PENDING");
  if (!invites?.length) return [];
  const tids = invites.map((i) => i.tournamentsId);
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, status, gameVariant, createdByProfileId")
    .in("id", tids)
    .eq("status", "FILLING");
  const tMap = new Map((tournaments ?? []).map((t) => [t.id, t]));
  const creatorIds = (tournaments ?? [])
    .map((t) => t.createdByProfileId)
    .filter(Boolean) as string[];
  const { data: creators } = creatorIds.length
    ? await supabase
        .from("profiles")
        .select("id, username")
        .in("id", creatorIds)
    : { data: [] as { id: string; username: string }[] };
  const cMap = new Map((creators ?? []).map((c) => [c.id, c.username]));
  return invites
    .filter((i) => tMap.has(i.tournamentsId))
    .map((i) => {
      const t = tMap.get(i.tournamentsId)!;
      return {
        tournamentId: i.tournamentsId,
        gameVariant: t.gameVariant,
        fromUsername: t.createdByProfileId
          ? cMap.get(t.createdByProfileId) ?? "A friend"
          : "A friend",
      };
    });
};

// Creator starts a FILLING private tournament now (remaining seats -> bots).
export const startTournamentByCreator = async (
  tournamentId: string,
  creatorId: string
) => {
  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  if (!t || t.createdByProfileId !== creatorId) {
    throw new Error("only the creator can start");
  }
  await startTournament(tournamentId);
};

// Fill empty seats with bots, seed the bracket, and kick off round 1.
export const startTournament = async (tournamentId: string) => {
  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  if (!t || t.status !== "FILLING") return;

  const size = t.size ?? TOURNAMENT_SIZE;
  const { data: existing } = await supabase
    .from("tournamentPlayers")
    .select("*")
    .eq("tournamentsId", tournamentId);
  let players = (existing ?? []) as TPlayer[];

  const need = size - players.length;
  if (need > 0) {
    const { data: bots } = await supabase
      .from("random_bot_profiles")
      .select("*");
    const used = new Set(players.map((p) => p.profilesId));
    const chosen = (bots ?? [])
      .filter((b) => b.id && !used.has(b.id))
      .slice(0, need);
    if (chosen.length) {
      const rows = chosen.map((b) => ({
        tournamentsId: tournamentId,
        profilesId: b.id as string,
        isBot: true,
      }));
      const { data: insertedBots } = await supabase
        .from("tournamentPlayers")
        .insert(rows)
        .select("*");
      players = players.concat((insertedBots ?? []) as TPlayer[]);
    }
  }

  // Random seeding.
  const shuffled = shuffle(players);
  for (let i = 0; i < shuffled.length; i += 1) {
    await supabase
      .from("tournamentPlayers")
      .update({ seat: i })
      .eq("id", shuffled[i].id);
    shuffled[i].seat = i;
  }

  await supabase
    .from("tournaments")
    .update({ status: "IN_PROGRESS", startedAt: new Date().toISOString() })
    .eq("id", tournamentId);

  // Round 1: seat pairs (0v1, 2v3, ...).
  const bySeat = shuffled
    .slice()
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  const created: { row: TMatch; p1: TPlayer; p2: TPlayer }[] = [];
  for (let i = 0; i < bySeat.length; i += 2) {
    const p1 = bySeat[i];
    const p2 = bySeat[i + 1];
    const { data: row } = await supabase
      .from("tournamentMatches")
      .insert({
        tournamentsId: tournamentId,
        round: 1,
        matchIndex: i / 2,
        playerOneId: p1?.profilesId,
        playerTwoId: p2?.profilesId,
        status: "PENDING",
      })
      .select("*")
      .single();
    if (row) created.push({ row: row as TMatch, p1, p2 });
  }
  const variant = (t.gameVariant ?? "CROSSWORD") as GameVariant;
  const tDiff = (t.difficulty ?? "REGULAR") as GameDifficulty;
  for (const m of created) {
    await startMatch(tournamentId, m.row, m.p1, m.p2, variant, tDiff);
  }
  // Cascade in case an entire round resolved instantly (all-bot matches).
  await advanceTournament(tournamentId);
};

// Start one match: create a real game if a human is involved, else resolve it
// by rating (bot vs bot).
const startMatch = async (
  tournamentId: string,
  match: TMatch,
  p1?: TPlayer,
  p2?: TPlayer,
  gameVariant: GameVariant = "CROSSWORD",
  difficulty: GameDifficulty = "REGULAR"
) => {
  if (!p1 || !p2) return;
  if (p1.isBot && p2.isBot) {
    await resolveBotMatch(tournamentId, match, p1, p2);
    return;
  }
  const isHard = difficulty === "HARD";

  let gameInsert:
    | {
        crosswordsId?: string;
        sudokusId?: string;
        gameVariant: GameVariant;
        gameType: "TOURNAMENT";
        difficulty: GameDifficulty;
        playState: "PLAYING";
        gameDurationInSeconds: number;
        startedAt: string;
        resolvedClues?: unknown;
      }
    | null = null;

  if (gameVariant === "SUDOKU") {
    const { data: sk } = await supabase.rpc("get_available_ranked_sudoku", {
      player_one_id: p1.profilesId,
      player_two_id: p2.profilesId,
      is_hard: isHard,
    });
    const sudoku = sk?.[0];
    if (!sudoku) {
      console.log({ tournamentMatchNoSudoku: match.id });
      return;
    }
    gameInsert = {
      sudokusId: sudoku.id,
      gameVariant: "SUDOKU",
      gameType: "TOURNAMENT",
      difficulty,
      playState: "PLAYING",
      gameDurationInSeconds: SUDOKU_DURATION_SECONDS,
      startedAt: addSeconds(new Date(), 10).toISOString(),
    };
  } else {
    const { data: cw } = await supabase.rpc("get_available_ranked_crossword", {
      player_one_id: p1.profilesId,
      player_two_id: p2.profilesId,
    });
    const crossword = cw?.[0];
    if (!crossword) {
      console.log({ tournamentMatchNoCrossword: match.id });
      return;
    }
    const resolvedClues = await resolveCluesForDifficulty(
      {
        puzzle: crossword.puzzle as unknown as string[][],
        solution: crossword.solution as unknown as (string | null)[][],
        clues: crossword.clues as never,
      },
      isHard
    );
    gameInsert = {
      crosswordsId: crossword.id,
      gameVariant: "CROSSWORD",
      gameType: "TOURNAMENT",
      difficulty,
      playState: "PLAYING",
      gameDurationInSeconds: durationForSize(crossword.size, 180),
      startedAt: addSeconds(new Date(), 10).toISOString(),
      ...(resolvedClues ? { resolvedClues } : {}),
    };
  }

  const { data: game } = await supabase
    .from("games")
    .insert(gameInsert as never)
    .select("*")
    .single();
  if (!game) return;
  await supabase.from("gamePlayers").insert([
    { gamesId: game.id, profilesId: p1.profilesId },
    { gamesId: game.id, profilesId: p2.profilesId },
  ]);
  await supabase
    .from("tournamentMatches")
    .update({ gamesId: game.id, status: "PLAYING" })
    .eq("id", match.id);
};

const resolveBotMatch = async (
  tournamentId: string,
  match: TMatch,
  p1: TPlayer,
  p2: TPlayer
) => {
  const r1 = await getRating(p1.profilesId);
  const r2 = await getRating(p2.profilesId);
  const pOneWins = 1 / (1 + Math.pow(10, (r2 - r1) / 400));
  const winnerId = Math.random() < pOneWins ? p1.profilesId : p2.profilesId;
  const loserId =
    winnerId === p1.profilesId ? p2.profilesId : p1.profilesId;
  await supabase
    .from("tournamentMatches")
    .update({ winnerId, status: "COMPLETED" })
    .eq("id", match.id);
  await markEliminated(tournamentId, loserId);
};

// Called by game.service.finalizeGame whenever a TOURNAMENT game completes.
export const onTournamentGameFinished = async (
  gameId: string,
  winnerId: string | null
) => {
  const { data: matches } = await supabase
    .from("tournamentMatches")
    .select("*")
    .eq("gamesId", gameId);
  const match = matches?.[0] as TMatch | undefined;
  if (!match) return;
  if (match.status !== "COMPLETED") {
    const loserId =
      winnerId === match.playerOneId ? match.playerTwoId : match.playerOneId;
    await supabase
      .from("tournamentMatches")
      .update({ winnerId, status: "COMPLETED" })
      .eq("id", match.id);
    if (loserId) await markEliminated(match.tournamentsId, loserId);
  }
  await advanceTournament(match.tournamentsId);
};

// If the current round is fully decided, build + start the next round (or crown
// the champion). Idempotent and safe to call from multiple finishers.
export const advanceTournament = async (tournamentId: string) => {
  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  if (!t || t.status !== "IN_PROGRESS") return;

  const { data: all } = await supabase
    .from("tournamentMatches")
    .select("*")
    .eq("tournamentsId", tournamentId);
  const allMatches = (all ?? []) as TMatch[];
  if (!allMatches.length) return;

  const maxRound = Math.max(...allMatches.map((m) => m.round));
  const current = allMatches
    .filter((m) => m.round === maxRound)
    .sort((a, b) => a.matchIndex - b.matchIndex);
  if (current.some((m) => m.status !== "COMPLETED")) return; // round not done

  if (current.length === 1) {
    await supabase
      .from("tournaments")
      .update({
        status: "COMPLETED",
        winnerId: current[0].winnerId,
        completedAt: new Date().toISOString(),
      })
      .eq("id", tournamentId);
    return;
  }

  const nextRound = maxRound + 1;
  if (allMatches.some((m) => m.round === nextRound)) return; // already created

  const { data: tpRows } = await supabase
    .from("tournamentPlayers")
    .select("*")
    .eq("tournamentsId", tournamentId);
  const byProfile = new Map(
    ((tpRows ?? []) as TPlayer[]).map((r) => [r.profilesId, r])
  );

  const created: { row: TMatch; p1?: TPlayer; p2?: TPlayer }[] = [];
  for (let i = 0; i < current.length; i += 2) {
    const w1 = current[i].winnerId;
    const w2 = current[i + 1].winnerId;
    const { data: row, error } = await supabase
      .from("tournamentMatches")
      .insert({
        tournamentsId: tournamentId,
        round: nextRound,
        matchIndex: i / 2,
        playerOneId: w1,
        playerTwoId: w2,
        status: "PENDING",
      })
      .select("*")
      .single();
    if (error) {
      // Unique (tournament, round, matchIndex) violation — another finisher is
      // already building this round. Bail out and let them own it.
      console.log({ advanceInsertError: error.message });
      return;
    }
    created.push({
      row: row as TMatch,
      p1: w1 ? byProfile.get(w1) : undefined,
      p2: w2 ? byProfile.get(w2) : undefined,
    });
  }
  const variant = (t.gameVariant ?? "CROSSWORD") as GameVariant;
  const tDiff = (t.difficulty ?? "REGULAR") as GameDifficulty;
  for (const m of created) {
    await startMatch(tournamentId, m.row, m.p1, m.p2, variant, tDiff);
  }

  // If the whole new round resolved instantly (all bots), keep advancing.
  const { data: refreshed } = await supabase
    .from("tournamentMatches")
    .select("status")
    .eq("tournamentsId", tournamentId)
    .eq("round", nextRound);
  if (refreshed && refreshed.every((m) => m.status === "COMPLETED")) {
    await advanceTournament(tournamentId);
  }
};

// --- Used by the watcher ---------------------------------------------------

// FILLING tournaments that should start now: a full human field, or at least
// one human and the fill window has elapsed (the rest become bots).
export const getFillingTournamentsToStart = async (
  fillTimeoutMs: number
): Promise<string[]> => {
  const { data: filling } = await supabase
    .from("tournaments")
    .select("*")
    .eq("status", "FILLING");
  const ids: string[] = [];
  for (const t of filling ?? []) {
    const { data: ps } = await supabase
      .from("tournamentPlayers")
      .select("id")
      .eq("tournamentsId", t.id);
    const n = ps?.length ?? 0;
    const age = Date.now() - new Date(t.createdAt).getTime();
    if (n >= (t.size ?? TOURNAMENT_SIZE) || (n >= 1 && age >= fillTimeoutMs)) {
      ids.push(t.id);
    }
  }
  return ids;
};

// TOURNAMENT games still PLAYING past their time limit (no-show / disconnect),
// so the sweeper can finalize them and unstick the bracket.
export const getExpiredTournamentGameIds = async (
  graceMs = 3000
): Promise<string[]> => {
  const { data: games } = await supabase
    .from("games")
    .select("id, startedAt, gameDurationInSeconds")
    .eq("gameType", "TOURNAMENT")
    .eq("playState", "PLAYING");
  return (games ?? [])
    .filter(
      (g) =>
        g.startedAt &&
        new Date(g.startedAt).getTime() +
          g.gameDurationInSeconds * 1000 +
          graceMs <
          Date.now()
    )
    .map((g) => g.id);
};
