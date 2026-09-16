import { addSeconds } from "date-fns";
import { supabase } from "../lib/supabase";
import { Game, generateWordSearch, generateTrivia } from "types-and-validators";
import { onTournamentGameFinished } from "../tournament/tournament.service";
import { resolveCluesForDifficulty } from "./clue-resolver";
import { ratingFieldsFor } from "../rating-fields";

// Time limit scales with puzzle size (7x7/8x8 -> 5 min, 9x9 -> 7 min).
export const durationForSize = (size: number | null | undefined, base: number) =>
  size && size >= 9 ? 420 : size && size >= 7 ? 300 : base;

// Sudoku is a longer solve than a mini crossword: 15 minutes.
export const SUDOKU_DURATION_SECONDS = 900;

export type GameVariant = "CROSSWORD" | "SUDOKU" | "WORD_SEARCH" | "TRIVIA";
export type GameDifficulty = "REGULAR" | "HARD";

export const createRankedMatch = async (
  playerOneId: string,
  playerTwoId: string,
  gameVariant: GameVariant = "CROSSWORD",
  difficulty: GameDifficulty = "REGULAR"
) => {
  const isHard = difficulty === "HARD";
  // Word search / trivia have no content table — generate the puzzle inline
  // (shared generator, same as the client) and store it on the game so both
  // matched players race the exact same one.
  if (gameVariant === "WORD_SEARCH" || gameVariant === "TRIVIA") {
    const seed = Math.floor(Math.random() * 0xffffffff) || 1;
    let gameState: { __wordsearch?: unknown; __trivia?: unknown };
    if (gameVariant === "WORD_SEARCH") {
      gameState = { __wordsearch: generateWordSearch(difficulty, seed) };
    } else {
      // Ranked trivia: REGULAR = medium tier (never easy), HARD = hard. Exclude
      // questions the creating player has already seen so ranked doesn't repeat.
      let excludeIds: string[] = [];
      try {
        const { data: seen } = await (
          supabase as unknown as {
            from: (t: string) => {
              select: (c: string) => {
                eq: (
                  col: string,
                  v: string
                ) => { limit: (n: number) => Promise<{ data: { questionId: string }[] | null }> };
              };
            };
          }
        )
          .from("seen_trivia")
          .select("questionId")
          .eq("profilesId", playerOneId)
          .limit(500);
        excludeIds = (seen ?? []).map((r) => r.questionId);
      } catch {
        // best-effort
      }
      gameState = {
        __trivia: generateTrivia(isHard ? "hard" : "medium", seed, undefined, excludeIds),
      };
    }
    const duration = gameVariant === "TRIVIA" ? 240 : isHard ? 420 : 300;
    const { data: game, error: createGameError } = await supabase
      .from("games")
      .insert({
        gameVariant,
        gameType: "RANKED",
        difficulty,
        playState: "PLAYING",
        gameDurationInSeconds: duration,
        startedAt: addSeconds(new Date(), 10).toISOString(),
        gameState: gameState as never,
      })
      .select("*")
      .single();
    if (createGameError) throw createGameError;
    const { error: playersError } = await supabase.from("gamePlayers").insert([
      { gamesId: game.id, profilesId: playerOneId },
      { gamesId: game.id, profilesId: playerTwoId },
    ]);
    if (playersError) {
      // Roll back the just-created game so a failed player insert can't leave an
      // orphan stuck PLAYING with fewer than two players; the matcher re-queues.
      await supabase.from("games").delete().eq("id", game.id);
      throw playersError;
    }
    return game;
  }
  if (gameVariant === "SUDOKU") {
    // Hard = hard puzzles; Regular = easy/medium.
    const { data, error } = await supabase.rpc("get_available_ranked_sudoku", {
      player_one_id: playerOneId,
      player_two_id: playerTwoId,
      is_hard: isHard,
    });
    if (error || !data?.[0]) {
      throw new Error(
        `Error fetching sudoku b/w ${playerOneId} and ${playerTwoId}`
      );
    }
    const { data: game, error: createGameError } = await supabase
      .from("games")
      .insert({
        sudokusId: data[0].id,
        gameVariant: "SUDOKU",
        gameType: "RANKED",
        difficulty,
        playState: "PLAYING",
        gameDurationInSeconds: SUDOKU_DURATION_SECONDS,
        startedAt: addSeconds(new Date(), 10).toISOString(),
      })
      .select("*")
      .single();
    if (createGameError) throw createGameError;
    const { error: playersError } = await supabase.from("gamePlayers").insert([
      { gamesId: game.id, profilesId: playerOneId },
      { gamesId: game.id, profilesId: playerTwoId },
    ]);
    if (playersError) {
      // Roll back the just-created game so a failed player insert can't leave an
      // orphan stuck PLAYING with fewer than two players; the matcher re-queues.
      await supabase.from("games").delete().eq("id", game.id);
      throw playersError;
    }
    return game;
  }

  const { data, error } = await supabase.rpc("get_available_ranked_crossword", {
    player_one_id: playerOneId,
    player_two_id: playerTwoId,
  });

  // Guard the empty result too (the SUDOKU branch above already does): `data[0]`
  // being undefined threw a TypeError on cw.puzzle, which the matcher caught and
  // re-queued both players for — so an exhausted pool made the pair churn
  // delete/recreate every tick forever instead of ever matching.
  if (error || !data?.[0]) {
    throw new Error(
      `Error fetching crossword b/w ${playerOneId} and ${playerTwoId}`
    );
  }

  // Hard crosswords use harder clues (same grid). Resolve them server-side so
  // both players see the same difficulty-appropriate clues.
  const cw = data[0];
  const resolvedClues = await resolveCluesForDifficulty(
    {
      puzzle: cw.puzzle as unknown as string[][],
      solution: cw.solution as unknown as (string | null)[][],
      clues: cw.clues as never,
    },
    isHard
  );

  const { data: game, error: createGameError } = await supabase
    .from("games")
    .insert({
      crosswordsId: cw.id,
      gameType: "RANKED",
      difficulty,
      playState: "PLAYING",
      gameDurationInSeconds: durationForSize(cw?.size, 180),
      startedAt: addSeconds(new Date(), 10).toISOString(),
      ...(resolvedClues ? { resolvedClues: resolvedClues as never } : {}),
    })
    .select("*")
    .single();

  if (createGameError) {
    throw createGameError;
  }

  const { error: playersError } = await supabase.from("gamePlayers").insert([
    { gamesId: game.id, profilesId: playerOneId },
    { gamesId: game.id, profilesId: playerTwoId },
  ]);
  if (playersError) {
    // Roll back the just-created game so a failed player insert can't leave an
    // orphan stuck PLAYING with fewer than two players; the matcher re-queues.
    await supabase.from("games").delete().eq("id", game.id);
    throw playersError;
  }

  return game;
};

// --- Scoring -------------------------------------------------------------
// Works for both crosswords (single letters, black squares = null) and sudokus
// (1-9 ints, no blanks in the solution): counts how many fillable cells the
// player got right, as a 0-100 percentage.
type SolutionGrid = (string | number | null)[][];
type PuzzleGrid = (string | number | null)[][];
// A cell is a "given" (pre-filled, not the player's work) when the puzzle has a
// non-blank value there. Crossword blanks = "#"/"0"/null; sudoku blanks = 0.
const isGivenCell = (v: string | number | null | undefined) =>
  v !== undefined && v !== null && v !== 0 && v !== "0" && v !== "#";
export const calculateScore = ({
  correctSolution,
  solution,
  puzzle,
}: {
  correctSolution: SolutionGrid;
  solution: SolutionGrid | undefined;
  // When provided (sudoku), cells already filled in the puzzle (givens) are
  // excluded so the score reflects only the player's own work — otherwise the
  // ~30 free givens inflate every sudoku score (audit C2).
  puzzle?: PuzzleGrid;
}) => {
  // Guard both grids — a missing crossword/sudoku relation would otherwise
  // throw here and wedge the game in PLAYING (audit fix).
  if (!solution || !correctSolution) {
    return 0;
  }
  let totalChars = 0;
  let correctChars = 0;
  for (let i = 0; i < correctSolution.length; i += 1) {
    const rowSolution = correctSolution[i];
    for (let j = 0; j < rowSolution.length; j += 1) {
      const cellCorrectSolution = rowSolution[j];
      if (cellCorrectSolution && !isGivenCell(puzzle?.[i]?.[j])) {
        totalChars += 1;
        if (solution[i][j] === cellCorrectSolution) {
          correctChars += 1;
        }
      }
    }
  }
  if (totalChars === 0) return 0;
  return Math.round((correctChars / totalChars) * 100);
};

// --- Glicko-2 rating system (the system chess.com uses) --------------------
// Each player has a rating, a rating deviation (RD = how uncertain the rating
// is) and a volatility. New/uncertain players (high RD) move fast; established
// players move slowly. Uses `ratingDeviation` + `volatility` columns on
// profiles when present (defaults 350 / 0.06 otherwise).
const GLICKO_SCALE = 173.7178;
const GLICKO_TAU = 0.5;

const glickoG = (phi: number) =>
  1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));

const glickoE = (mu: number, muj: number, phij: number) =>
  1 / (1 + Math.exp(-glickoG(phij) * (mu - muj)));

const glicko2Update = (
  player: { rating: number; rd: number; vol: number },
  opponent: { rating: number; rd: number; vol: number },
  score: number // 1 = win, 0 = loss
) => {
  const mu = (player.rating - 1500) / GLICKO_SCALE;
  const phi = player.rd / GLICKO_SCALE;
  const muj = (opponent.rating - 1500) / GLICKO_SCALE;
  const phij = opponent.rd / GLICKO_SCALE;

  const gj = glickoG(phij);
  const e = glickoE(mu, muj, phij);
  const v = 1 / (gj * gj * e * (1 - e));
  const delta = v * gj * (score - e);

  // iterate to the new volatility (Illinois algorithm)
  const a = Math.log(player.vol * player.vol);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const d2 = delta * delta;
    const p2 = phi * phi;
    return (
      (ex * (d2 - p2 - v - ex)) / (2 * Math.pow(p2 + v + ex, 2)) -
      (x - a) / (GLICKO_TAU * GLICKO_TAU)
    );
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * GLICKO_TAU) < 0) k += 1;
    B = a - k * GLICKO_TAU;
  }
  let fA = f(A);
  let fB = f(B);
  let iter = 0;
  while (Math.abs(B - A) > 0.000001 && iter < 100) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    iter += 1;
  }
  const newVol = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + newVol * newVol);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gj * (score - e);

  return {
    rating: GLICKO_SCALE * newMu + 1500,
    rd: GLICKO_SCALE * newPhi,
    vol: newVol,
  };
};

type RankedPlayer = {
  id: string;
  eloRating: number;
  ratingDeviation?: number;
  volatility?: number;
};

const updateGlicko2Ratings = (
  playerOne: RankedPlayer,
  playerTwo: RankedPlayer,
  winnerId: string
) => {
  const p1 = {
    rating: playerOne.eloRating,
    rd: playerOne.ratingDeviation ?? 350,
    vol: playerOne.volatility ?? 0.06,
  };
  const p2 = {
    rating: playerTwo.eloRating,
    rd: playerTwo.ratingDeviation ?? 350,
    vol: playerTwo.volatility ?? 0.06,
  };
  const s1 = winnerId === playerOne.id ? 1 : 0;
  const r1 = glicko2Update(p1, p2, s1);
  const r2 = glicko2Update(p2, p1, 1 - s1);
  return [
    { playerId: playerOne.id, ...r1 },
    { playerId: playerTwo.id, ...r2 },
  ];
};

// Per-variant rating columns live in the shared rating-fields module so
// matchmaking, leaderboards, and rating application can't drift.

// Compute + persist ratings for a finished rated game (RANKED or TOURNAMENT),
// in the column set for the game's variant. Bots' ratings are never written
// (they're fixed anchors for matchmaking), but the human still moves vs the bot.
export const applyRankedRatings = async (
  game: Game,
  winnerId: string | null
) => {
  if (
    (game.gameType !== "RANKED" && game.gameType !== "TOURNAMENT") ||
    winnerId == null
  )
    return;
  const players = game.players as unknown as (RankedPlayer & {
    type?: string;
    eloRatingSudoku?: number;
    ratingDeviationSudoku?: number;
    volatilitySudoku?: number;
  })[];
  if (!players || players.length < 2) return;

  const f = ratingFieldsFor(game.gameVariant);
  const botIds = new Set(
    players.filter((p) => p.type === "BOT").map((p) => p.id)
  );
  // Per product decision: EVERY ranked match counts toward rating, including
  // games against the bot fallback (with a small human base almost all ranked
  // games are vs bots, so not counting them would leave the ladder static). The
  // human's rating still moves; the bot's fixed anchor rating is never written.
  const toPlayer = (p: (typeof players)[number]): RankedPlayer => {
    const rec = p as unknown as Record<string, number>;
    return {
      id: p.id,
      eloRating: rec[f.rating] ?? 1000,
      ratingDeviation: rec[f.rd] ?? 350,
      volatility: rec[f.vol] ?? 0.06,
    };
  };

  const updated = updateGlicko2Ratings(
    toPlayer(players[0]),
    toPlayer(players[1]),
    winnerId
  );
  for (const r of updated) {
    if (botIds.has(r.playerId)) continue; // never drift bot ratings
    const { error } = await supabase
      .from("profiles")
      .update({
        [f.rating]: Math.round(r.rating),
        [f.rd]: Math.round(r.rd * 100) / 100,
        [f.vol]: Math.round(r.vol * 1e6) / 1e6,
      } as never)
      .eq("id", r.playerId);
    if (error) {
      console.log({ ratingUpdateError: error });
      await supabase
        .from("profiles")
        .update({ [f.rating]: Math.round(r.rating) } as never)
        .eq("id", r.playerId);
    }
  }
};

// Pick the winner of a finished game from its scores. Solo needs a perfect
// score; head-to-head modes take the higher score, and tournament matches must
// always advance someone (higher rating breaks ties, incl. 0-0 no-shows).
const pickWinner = (
  game: Game,
  scores: { playerId: string; score: number }[]
): string | null => {
  if (game.gameType === "SOLO") {
    const top = scores.slice().sort((a, b) => b.score - a.score)[0];
    return top && top.score === 100 ? top.playerId : null;
  }
  const sorted = scores.slice().sort((a, b) => b.score - a.score);
  const [a, b] = sorted;
  if (!a) return null;
  if (!b) return a.score > 0 ? a.playerId : null;
  if (a.score !== b.score) {
    return a.score > 0 || game.gameType === "TOURNAMENT" ? a.playerId : null;
  }
  // Tie. A tournament MUST advance someone (see below), but a ranked/friendly
  // draw has no winner: `a` is just whichever player the DB join returned first,
  // so awarding it handed a real win/loss (and full Glicko movement) to an
  // arbitrary player. Return null instead — a genuine draw.
  if (game.gameType !== "TOURNAMENT") return null;
  // Tournament: the bracket can't stall, so break the tie by rating.
  const players = game.players as unknown as RankedPlayer[];
  const ra = players.find((p) => p.id === a.playerId)?.eloRating ?? 0;
  const rb = players.find((p) => p.id === b.playerId)?.eloRating ?? 0;
  return ra >= rb ? a.playerId : b.playerId;
};

// Finalize a PLAYING game: score it, set the winner, apply ratings, mark it
// COMPLETED, and (if it's a tournament match) advance the bracket. Idempotent —
// calling it on an already-finished game is a no-op. Shared by the client
// finish/forfeit endpoints and the server-side timeout sweeper.
export const finalizeGame = async (
  gameId: string,
  opts?: { forfeitProfileId?: string }
): Promise<string | null> => {
  const { data: games } = await supabase
    .from("games")
    .select(
      "*, players:profiles!gamePlayers(*), crossword:crosswords(*), sudoku:sudokus(*)"
    )
    .eq("id", gameId)
    .returns<Game[]>();

  if (!games?.length) return null;
  const [game] = games;
  if (game.playState !== "PLAYING") return game.winnerId;

  const isSudoku = game.gameVariant === "SUDOKU";
  const correctSolution = (
    isSudoku ? game.sudoku?.solution : game.crossword?.solution
  ) as unknown as SolutionGrid;
  // For sudoku, exclude givens from scoring (audit C2).
  const puzzle = isSudoku
    ? (game.sudoku?.puzzle as unknown as PuzzleGrid)
    : undefined;

  // Word search / trivia carry their puzzle inline in gameState (no content
  // table); score them from found-words / correct-answers instead of the grid.
  const gs = game.gameState as unknown as
    | (Record<string, { solution?: unknown; found?: string[]; answers?: Record<string, number> }> & {
        __wordsearch?: { words?: string[] };
        __trivia?: { questions?: { id: string; answer: number }[] };
      })
    | undefined;
  const variantScore = (playerId: string): number => {
    if (game.gameVariant === "WORD_SEARCH") {
      const words = gs?.__wordsearch?.words ?? [];
      const found = gs?.[playerId]?.found ?? [];
      return words.length
        ? Math.round((words.filter((w) => found.includes(w)).length / words.length) * 100)
        : 0;
    }
    if (game.gameVariant === "TRIVIA") {
      const qs = gs?.__trivia?.questions ?? [];
      const ans = gs?.[playerId]?.answers ?? {};
      const correct = qs.filter((q) => ans[q.id] === q.answer).length;
      return qs.length ? Math.round((correct / qs.length) * 100) : 0;
    }
    return calculateScore({
      correctSolution,
      solution: gs?.[playerId]?.solution as unknown as SolutionGrid | undefined,
      puzzle,
    });
  };

  let scores: { playerId: string; score: number }[];
  if (opts?.forfeitProfileId) {
    scores = game.players.map((player) => ({
      playerId: player.id,
      score: player.id === opts.forfeitProfileId ? 0 : 100,
    }));
  } else {
    scores = game.players.map((player) => ({
      playerId: player.id,
      score: variantScore(player.id),
    }));
  }

  const winnerId = pickWinner(game, scores);

  // Atomically claim completion: only the caller whose UPDATE actually flips
  // PLAYING -> COMPLETED applies scores/ratings/bracket. Prevents a double-apply
  // when the client finish and the server timeout sweeper race (audit C3).
  const { data: claimed } = await supabase
    .from("games")
    .update({ playState: "COMPLETED", winnerId })
    .eq("id", gameId)
    .eq("playState", "PLAYING")
    .select("id");
  if (!claimed || claimed.length === 0) {
    const { data: current } = await supabase
      .from("games")
      .select("winnerId")
      .eq("id", gameId)
      .single();
    return current?.winnerId ?? null;
  }

  for (const s of scores) {
    await supabase
      .from("gamePlayers")
      .update({ score: s.score })
      .eq("gamesId", gameId)
      .eq("profilesId", s.playerId);
  }
  await applyRankedRatings(game, winnerId);

  // Advance the bracket if this game backs a tournament match.
  if (game.gameType === "TOURNAMENT") {
    await onTournamentGameFinished(gameId, winnerId);
  }

  return winnerId;
};

// RANKED/FRIENDLY games still PLAYING past their time limit — no client was open
// at the deadline to end them (both players left, or a bot match where the lone
// human closed the app). The sweeper finalizes these via finalizeGame, exactly
// as the on-screen timer would have. Mirrors getExpiredTournamentGameIds.
// SOLO is intentionally excluded: it has no shared clock (startedAt is null) and
// is self-paced, so it must never be auto-finalized.
export const getExpiredHeadToHeadGameIds = async (
  graceMs = 15000
): Promise<string[]> => {
  const { data: games } = await supabase
    .from("games")
    .select("id, startedAt, gameDurationInSeconds")
    .in("gameType", ["RANKED", "FRIENDLY"])
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
