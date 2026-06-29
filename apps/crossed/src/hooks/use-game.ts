import useSWRMutation from "swr/mutation";
import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";
import { Game } from "types-and-validators";
import axios from "axios";
import { useStats } from "./use-stats";
import { useEffect } from "react";
import { addSeconds } from "date-fns";
import { setConnectionStatus, mapChannelStatus } from "../lib/connection-status";
import { resolveAndLogClues } from "../lib/clue-resolver";
import { Crossword, Json, GameDifficulty } from "types-and-validators";
import { events, trackEvent } from "../lib/track-event";
import { loadChallenge } from "../lib/challenge-utils";

export type GameVariant = "CROSSWORD" | "SUDOKU";
export type { GameDifficulty };

// Argument for the "new game" create triggers.
type NewGameArg = { variant: GameVariant; difficulty: GameDifficulty };

// Sudoku is a longer solve than a mini crossword: 15 minutes.
export const SUDOKU_DURATION_SECONDS = 900;

// Last bot used for an intro race, so "Play again" faces a different opponent.
let lastIntroBotId: string | undefined;

// A solution grid is letters (crossword) or 1-9 ints (sudoku); null = blank.
type SolutionGrid = (string | number | null)[][];

// A cell is a "given" (pre-filled, not the player's work) when the puzzle has a
// non-blank value there (sudoku givens; crossword has none).
const isGivenCell = (v: string | number | null | undefined) =>
  v !== undefined && v !== null && v !== 0 && v !== "0" && v !== "#";

export const calculateScore = ({
  correctSolution,
  solution,
  puzzle,
}: {
  correctSolution: SolutionGrid;
  solution: SolutionGrid | undefined;
  // When provided (sudoku), pre-filled givens are excluded so progress reflects
  // only the player's own work — otherwise the ~30 givens start the bar ~40%.
  puzzle?: SolutionGrid;
}) => {
  if (!solution) {
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
  const score = Math.round((correctChars / totalChars) * 100);
  return score;
};

// The correct-answer grid for whichever variant this game is.
export const solutionOf = (game: Game): SolutionGrid =>
  (game.gameVariant === "SUDOKU"
    ? game.sudoku?.solution
    : game.crossword?.solution) as SolutionGrid;

// The puzzle grid (for excluding givens from sudoku scoring); undefined for
// crossword so all clued cells count.
export const puzzleOf = (game: Game): SolutionGrid | undefined =>
  game.gameVariant === "SUDOKU"
    ? (game.sudoku?.puzzle as unknown as SolutionGrid)
    : undefined;

export const fixType = (game: any): Game => {
  if (game?.gameVariant === "SUDOKU") {
    return {
      ...game,
      sudoku: game.sudoku
        ? {
            ...game.sudoku,
            solution: game.sudoku.solution as unknown as number[][],
            puzzle: game.sudoku.puzzle as unknown as number[][],
          }
        : game.sudoku,
    };
  }
  return {
    ...game,
    crossword: game.crossword
      ? {
          ...game.crossword,
          solution: game.crossword.solution as unknown as string[][],
          puzzle: game.crossword.puzzle as unknown as string[][],
          // Per-game never-repeat clue override, when present.
          clues: game.resolvedClues ?? game.crossword.clues,
        }
      : game.crossword,
  };
};

// Pick a puzzle the player hasn't seen and return the game-insert fields for it.
// Shared by every "new game" creator so crossword/sudoku stay in lockstep.
const puzzleFieldsForNewGame = async (
  variant: GameVariant,
  profileId: string,
  crosswordBaseDuration: number,
  difficulty: GameDifficulty = "REGULAR"
): Promise<{
  fields: {
    crosswordsId?: string;
    sudokusId?: string;
    gameVariant: GameVariant;
    resolvedClues?: Json;
    difficulty: GameDifficulty;
  };
  durationInSeconds: number;
} | null> => {
  const isHard = difficulty === "HARD";
  if (variant === "SUDOKU") {
    // Hard = hard puzzles; Regular = easy/medium.
    const { data, error } = await supabase.rpc("get_available_sudoku", {
      profileid: profileId,
      is_hard: isHard,
    });
    if (error) throw error;
    const id = data?.[0]?.id;
    if (!id) return null;
    return {
      fields: { sudokusId: id, gameVariant: "SUDOKU", difficulty },
      durationInSeconds: SUDOKU_DURATION_SECONDS,
    };
  }
  // Crossword: same puzzles either way; difficulty drives which CLUES are used.
  const { data, error } = await supabase.rpc("get_available_crossword", {
    profileid: profileId,
  });
  if (error) throw error;
  const cw = data?.[0];
  if (!cw?.id) return null;
  // Never-repeat + difficulty: pick each word an unseen clue of the requested
  // difficulty (falls back to baked clues on any failure).
  const resolvedClues = await resolveAndLogClues(
    {
      puzzle: cw.puzzle as unknown as Crossword["puzzle"],
      solution: cw.solution as unknown as Crossword["solution"],
      clues: cw.clues as unknown as Crossword["clues"],
    },
    profileId,
    isHard
  );
  return {
    fields: {
      crosswordsId: cw.id,
      gameVariant: "CROSSWORD",
      difficulty,
      ...(resolvedClues ? { resolvedClues: resolvedClues as unknown as Json } : {}),
    },
    durationInSeconds: durationForSize(cw.size, crosswordBaseDuration),
  };
};

/*
useGame uses an swr subscription combined with
supabse realtime updates to track and update a game state.

It subscribes to a game in the `games` table with `gameId`
for changes, and updates the game variable.
*/

// Time limit scales with puzzle size: minis keep their base; bigger boards get
// more time (7x7/8x8 -> 5 min, 9x9 -> 7 min).
export const durationForSize = (
  size: number | null | undefined,
  base: number
) => (size && size >= 9 ? 420 : size && size >= 7 ? 300 : base);

export const useGame = ({ gameId }: { gameId?: string }) => {
  const { myProfile, refreshMyProfile } = useMyProfile();
  const { refreshStats } = useStats();

  const { data: game } = useSWRSubscription(
    gameId ? ["game", gameId] : null,
    (key, { next }: SWRSubscriptionOptions<Game, Error>) => {
      console.info(`fetching game - ${gameId}`);
      const subscription = supabase
        .channel(`game-updates-${gameId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "games",
            filter: `id=eq.${gameId}`,
          },
          async () => {
            const { data: game, error: fetchGameError } = await supabase
              .from("games")
              .select(
                "*, players:profiles!gamePlayers(*), scores:gamePlayers(*), crossword:crosswords(*), sudoku:sudokus(*)"
              )
              .eq("id", gameId)
              .single();
            if (fetchGameError) {
              console.info({ fetchGameError });
            }
            // Only push a valid game. On a failed/empty refetch (e.g. bad
            // reception) keep the last good state instead of clobbering it with
            // undefined — otherwise the board unmounts and crashes mid-match.
            if (game) {
              next(null, fixType(game));
            }
          }
        )
        .subscribe(async (channelStatus) => {
          // Reflect the realtime connection state for the UI banner.
          setConnectionStatus(mapChannelStatus(channelStatus));
          const { data: game, error: fetchGameError } = await supabase
            .from("games")
            .select(
              "*, players:profiles!gamePlayers(*), scores:gamePlayers(*), crossword:crosswords(*), sudoku:sudokus(*)"
            )
            .eq("id", gameId)
            .single();
          if (fetchGameError) {
            console.info({ fetchGameError });
          }
          // Keep last good state on a failed initial/refetch (see above).
          if (game) {
            next(null, fixType(game));
          }
        });

      return () => {
        subscription.unsubscribe();
        setConnectionStatus("connected"); // reset when leaving the game
      };
    }
  );

  const playState = game?.playState;
  useEffect(() => {
    if (playState === "COMPLETED" || playState === "ABORTED") {
      refreshStats();
      refreshMyProfile();
    }
  }, [playState, refreshStats, refreshMyProfile]);

  const { trigger: createSoloGame, isMutating: creatingSoloGame } =
    useSWRMutation(
      "create-solo-game",
      async (_key, { arg }: { arg?: NewGameArg } = {}) => {
        if (!myProfile) return;
        const variant = arg?.variant ?? "CROSSWORD";
        const picked = await puzzleFieldsForNewGame(
          variant,
          myProfile.id,
          300,
          arg?.difficulty ?? "REGULAR"
        );
        if (!picked) return;
        const { data: game, error: createGameError } = await supabase
          .from("games")
          .insert({
            ...picked.fields,
            gameType: "SOLO",
            playState: "PLAYING",
            gameDurationInSeconds: picked.durationInSeconds,
          })
          .select("*")
          .single();
        if (createGameError) {
          console.info({ createGameError });
          throw createGameError;
        }
        await supabase
          .from("gamePlayers")
          .insert({ gamesId: game.id, profilesId: myProfile.id });
        return game.id;
      }
    );

  const { trigger: createFriendlyGame, isMutating: creatingFriendlyGame } =
    useSWRMutation(
      "create-friendly-game",
      async (_key, { arg }: { arg?: NewGameArg } = {}) => {
        if (!myProfile) return;
        const variant = arg?.variant ?? "CROSSWORD";
        const picked = await puzzleFieldsForNewGame(
          variant,
          myProfile.id,
          180,
          arg?.difficulty ?? "REGULAR"
        );
        if (!picked) return;
        const { data: game, error: createGameError } = await supabase
          .from("games")
          .insert({
            ...picked.fields,
            gameType: "FRIENDLY",
            playState: "WAITING_FOR_OPPONENT",
            gameDurationInSeconds: picked.durationInSeconds,
          })
          .select("*")
          .single();
        if (createGameError) {
          console.info({ createGameError });
          throw createGameError;
        }
        await supabase
          .from("gamePlayers")
          .insert({ gamesId: game.id, profilesId: myProfile.id });
        return game.id;
      }
    );

  const { trigger: startGame, isMutating: startingGame } = useSWRMutation(
    "start-friendly-game",
    async () => {
      if (gameId && myProfile) {
        await supabase
          .from("gamePlayers")
          .insert({ gamesId: gameId, profilesId: myProfile.id });
        await supabase
          .from("games")
          // Start 5s out so both players get a "starting in…" countdown.
          .update({
            playState: "PLAYING",
            startedAt: addSeconds(new Date(), 5).toISOString(),
          })
          .eq("id", gameId);
      }
    }
  );

  // Friendly "Play Again": if both players tap it, they auto-reconnect into one
  // rematch game (no re-sharing the code). The first tapper creates the rematch
  // and atomically claims the slot on the finished game; the second reads that
  // slot and joins it. Returns the gameId to navigate to.
  const { trigger: playAgainFriendly, isMutating: playingAgain } =
    useSWRMutation("play-again-friendly", async () => {
      if (!gameId || !myProfile) return;
      // Rematch in the same variant + difficulty as the game that just finished.
      const variant: GameVariant =
        game?.gameVariant === "SUDOKU" ? "SUDOKU" : "CROSSWORD";
      const difficulty: GameDifficulty =
        game?.difficulty === "HARD" ? "HARD" : "REGULAR";
      const picked = await puzzleFieldsForNewGame(
        variant,
        myProfile.id,
        180,
        difficulty
      );
      if (!picked) return;

      // 1. create my candidate rematch game (waiting for opponent)
      const { data: rematch } = await supabase
        .from("games")
        .insert({
          ...picked.fields,
          gameType: "FRIENDLY",
          playState: "WAITING_FOR_OPPONENT",
          gameDurationInSeconds: picked.durationInSeconds,
        })
        .select("*")
        .single();
      if (!rematch) return;
      await supabase
        .from("gamePlayers")
        .insert({ gamesId: rematch.id, profilesId: myProfile.id });

      // 2. atomically claim the rematch slot on the finished game
      const { data: claimed } = await supabase
        .from("games")
        .update({ rematchGamesId: rematch.id })
        .eq("id", gameId)
        .is("rematchGamesId", null)
        .select("id");

      if (claimed && claimed.length) {
        // I'm the host — wait in my rematch game for the opponent to join.
        return rematch.id;
      }

      // 3. the other player already created the rematch — discard mine, join it.
      await supabase
        .from("games")
        .update({ playState: "ABORTED" })
        .eq("id", rematch.id);
      const { data: original } = await supabase
        .from("games")
        .select("rematchGamesId")
        .eq("id", gameId)
        .single();
      const targetId = original?.rematchGamesId;
      if (!targetId) return rematch.id;
      await supabase
        .from("gamePlayers")
        .insert({ gamesId: targetId, profilesId: myProfile.id });
      await supabase
        .from("games")
        .update({
          playState: "PLAYING",
          startedAt: addSeconds(new Date(), 5).toISOString(),
        })
        .eq("id", targetId);
      return targetId;
    });

  const { trigger: finishGame, isMutating: finishingGame } = useSWRMutation(
    "finish-game",
    async () => {
      if (gameId) {
        console.info("finishing game");
        await axios.post("/api/games/finish-game", { gameId });
      }
    }
  );

  const { trigger: forfeitGame, isMutating: forfeitingGame } = useSWRMutation(
    "forfeit-game",
    async () => {
      if (gameId) {
        await axios.post("/api/games/forfeit-game", { gameId });
      }
    }
  );

  const { trigger: abortGame, isMutating: abortingGame } = useSWRMutation(
    "abort-game",
    async () => {
      if (gameId) {
        const { error } = await supabase
          .from("games")
          .update({ playState: "ABORTED" })
          .eq("id", gameId);
        if (error) {
          throw error;
        }
      }
    }
  );

  const { trigger: createRankedBotMatch, isMutating: creatingRankedBotMatch } =
    useSWRMutation(
      "create-ranked-bot-game",
      async (_key, { arg }: { arg?: NewGameArg } = {}) => {
        if (!myProfile) return;
        const variant = arg?.variant ?? "CROSSWORD";
        const picked = await puzzleFieldsForNewGame(
          variant,
          myProfile.id,
          180,
          arg?.difficulty ?? "REGULAR"
        );
        if (!picked) return;

        // Pick a bot whose rating is closest to the player's, so the fallback
        // match feels fair (not a random-strength opponent).
        const { data: bots } = await supabase
          .from("random_bot_profiles")
          .select();
        const myRating = myProfile.eloRating ?? 1100;
        const bot = (bots || [])
          .slice()
          .sort(
            (a, b) =>
              Math.abs((a.eloRating ?? 1100) - myRating) -
              Math.abs((b.eloRating ?? 1100) - myRating)
          )[0];
        if (!bot?.id) return;
        const { data: game, error: createGameError } = await supabase
          .from("games")
          .insert({
            ...picked.fields,
            gameType: "RANKED",
            playState: "PLAYING",
            startedAt: addSeconds(new Date(), 10).toISOString(),
            gameDurationInSeconds: picked.durationInSeconds,
          })
          .select("*")
          .single();
        if (createGameError) {
          console.info({ createGameError });
          throw createGameError;
        }
        await supabase.from("gamePlayers").insert([
          { gamesId: game.id, profilesId: myProfile.id },
          { gamesId: game.id, profilesId: bot.id },
        ]);
        return game.id;
      }
    );

  // Guided "first race" intro match: a real ranked game vs the WEAKEST bot, on a
  // regular crossword. The bot-fill caps the opponent around ~68% of the grid, so
  // any player who finishes the puzzle wins at the line — a beatable nail-biter
  // that lets new players feel the live head-to-head core on game one.
  const { trigger: createGuidedMatch, isMutating: creatingGuidedMatch } =
    useSWRMutation(
      "create-guided-match",
      async (_key, { arg }: { arg?: { source?: string } } = {}) => {
        if (!myProfile) return;
        // Pin the intro to an easy 5x5 for a quick, winnable first race: pull
        // from the normal (RLS-safe) picker, retrying for a 5x5, else fall back.
        let cw:
          | {
              id: string;
              size: number;
              puzzle: unknown;
              solution: unknown;
              clues: unknown;
            }
          | undefined;
        for (let i = 0; i < 6; i++) {
          const { data } = await supabase.rpc("get_available_crossword", {
            profileid: myProfile.id,
          });
          const c = data?.[0];
          if (!c?.id) continue;
          if (!cw) cw = c; // fallback to whatever we first got
          if (c.size === 5) {
            cw = c;
            break;
          }
        }
        if (!cw?.id) return;
        const resolvedClues = await resolveAndLogClues(
          {
            puzzle: cw.puzzle as unknown as Crossword["puzzle"],
            solution: cw.solution as unknown as Crossword["solution"],
            clues: cw.clues as unknown as Crossword["clues"],
          },
          myProfile.id,
          false
        );
        const { data: bots } = await supabase
          .from("random_bot_profiles")
          .select();
        // Random opponent each race (variety) avoiding an immediate repeat —
        // difficulty is set by the rubber-band, not the bot's rating.
        const pool = (bots || []).filter(
          (b) => b.id && b.id !== lastIntroBotId
        );
        const choices = pool.length ? pool : bots || [];
        const bot = choices[Math.floor(Math.random() * choices.length)];
        if (!bot?.id) return;
        lastIntroBotId = bot.id;
        const { data: game, error: createGameError } = await supabase
          .from("games")
          .insert({
            crosswordsId: cw.id,
            gameVariant: "CROSSWORD",
            difficulty: "REGULAR",
            ...(resolvedClues
              ? { resolvedClues: resolvedClues as unknown as Json }
              : {}),
            gameType: "RANKED",
            playState: "PLAYING",
            startedAt: addSeconds(new Date(), 6).toISOString(),
            gameDurationInSeconds: durationForSize(cw.size, 180),
          })
          .select("*")
          .single();
        if (createGameError) throw createGameError;
        await supabase.from("gamePlayers").insert([
          { gamesId: game.id, profilesId: myProfile.id },
          { gamesId: game.id, profilesId: bot.id },
        ]);
        trackEvent(events.INTRO_RACE_STARTED, {
          source: arg?.source ?? "onboarding",
          gameId: game.id,
        });
        return game.id;
      }
    );

  // Accept a challenge: create a (non-rated FRIENDLY) game on the challenger's
  // puzzle vs a ghost driven by their recorded timeline (stored under
  // gameState.__challenge for the grid + result screen to read).
  const { trigger: acceptChallenge, isMutating: acceptingChallenge } =
    useSWRMutation(
      "accept-challenge",
      async (_key, { arg }: { arg: { challengeId: string } }) => {
        if (!myProfile) return;
        const ch = await loadChallenge(arg.challengeId);
        if (!ch?.crosswordsId) return;
        const { data: bots } = await supabase
          .from("random_bot_profiles")
          .select();
        const bot = (bots || [])[0];
        if (!bot?.id) return;
        const { data: game, error } = await supabase
          .from("games")
          .insert({
            crosswordsId: ch.crosswordsId,
            gameVariant: "CROSSWORD",
            difficulty: (ch.difficulty as GameDifficulty) ?? "REGULAR",
            ...(ch.resolvedClues
              ? { resolvedClues: ch.resolvedClues as Json }
              : {}),
            gameType: "FRIENDLY",
            playState: "PLAYING",
            startedAt: addSeconds(new Date(), 6).toISOString(),
            gameDurationInSeconds: 300,
            gameState: {
              __challenge: {
                id: ch.id,
                challengerId: ch.challengerId,
                timeline: ch.timeline,
                seconds: ch.solveSeconds,
                name: ch.challengerName,
              },
            } as never,
          })
          .select("*")
          .single();
        if (error || !game) throw error ?? new Error("no game");
        await supabase.from("gamePlayers").insert([
          { gamesId: game.id, profilesId: myProfile.id },
          { gamesId: game.id, profilesId: bot.id },
        ]);
        return game.id;
      }
    );

  let opponentProgress = 0;
  let opponentUsername = "";
  let opponent;
  if (
    myProfile &&
    (game?.gameType === "FRIENDLY" ||
      game?.gameType === "RANKED" ||
      game?.gameType === "TOURNAMENT")
  ) {
    opponent = game.players.find((profile) => profile.id !== myProfile.id);
    if (opponent) {
      opponentUsername = opponent.username;
      if (game.gameState?.[opponent.id]) {
        opponentProgress = calculateScore({
          correctSolution: solutionOf(game),
          solution: game.gameState[opponent.id].solution,
          puzzle: puzzleOf(game),
        });
      }
    }
  }

  return {
    game,
    createSoloGame,
    creatingSoloGame,
    createFriendlyGame,
    creatingFriendlyGame,
    finishGame,
    finishingGame,
    abortGame,
    abortingGame,
    opponent,
    opponentProgress,
    opponentUsername,
    startGame,
    startingGame,
    forfeitGame,
    forfeitingGame,
    createRankedBotMatch,
    creatingRankedBotMatch,
    createGuidedMatch,
    creatingGuidedMatch,
    acceptChallenge,
    acceptingChallenge,
    playAgainFriendly,
    playingAgain,
  };
};
