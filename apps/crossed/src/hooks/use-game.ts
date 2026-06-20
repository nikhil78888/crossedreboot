import useSWRMutation from "swr/mutation";
import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";
import { Game } from "types-and-validators";
import axios from "axios";
import { useStats } from "./use-stats";
import { useEffect } from "react";
import { addSeconds } from "date-fns";

export const calculateScore = ({
  correctSolution,
  solution,
}: {
  correctSolution: Game["crossword"]["solution"];
  solution: Game["crossword"]["solution"] | undefined;
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
      if (cellCorrectSolution) {
        totalChars += 1;
        if (solution[i][j] === cellCorrectSolution) {
          correctChars += 1;
        }
      }
    }
  }
  const score = Math.round((correctChars / totalChars) * 100);
  return score;
};

export const fixType = (game: any): Game => {
  return {
    ...game,
    crossword: {
      ...game.crossword,
      solution: game.crossword.solution as unknown as string[][],
      puzzle: game.crossword.puzzle as unknown as string[][],
    },
  };
};

/*
useGame uses an swr subscription combined with
supabse realtime updates to track and update a game state.

It subscribes to a game in the `games` table with `gameId`
for changes, and updates the game variable.
*/

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
                "*, players:profiles!gamePlayers(*), scores:gamePlayers(*), crossword:crosswords(*)"
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
        .subscribe(async () => {
          const { data: game, error: fetchGameError } = await supabase
            .from("games")
            .select(
              "*, players:profiles!gamePlayers(*), scores:gamePlayers(*), crossword:crosswords(*)"
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
    useSWRMutation("create-solo-game", async () => {
      if (myProfile) {
        let crosswordId: string | null = null;
        const { data, error } = await supabase.rpc("get_available_crossword", {
          profileid: myProfile.id,
        });

        if (error) {
          throw error;
        }

        if (data && data.length) {
          crosswordId = data[0].id;
        }

        if (crosswordId) {
          const { data: game, error: createGameError } = await supabase
            .from("games")
            .insert({
              crosswordsId: crosswordId,
              gameType: "SOLO",
              playState: "PLAYING",
              gameDurationInSeconds: 300,
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
      }
    });

  const { trigger: createFriendlyGame, isMutating: creatingFriendlyGame } =
    useSWRMutation("create-friendly-game", async () => {
      if (myProfile) {
        let crosswordId: string | null = null;
        const { data, error } = await supabase.rpc("get_available_crossword", {
          profileid: myProfile.id,
        });

        if (error) {
          throw error;
        }

        if (data && data.length) {
          crosswordId = data[0].id;
        }

        if (crosswordId) {
          const { data: game, error: createGameError } = await supabase
            .from("games")
            .insert({
              crosswordsId: crosswordId,
              gameType: "FRIENDLY",
              playState: "WAITING_FOR_OPPONENT",
              gameDurationInSeconds: 180,
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
      }
    });

  const { trigger: startGame, isMutating: startingGame } = useSWRMutation(
    "start-friendly-game",
    async () => {
      if (gameId && myProfile) {
        await supabase
          .from("gamePlayers")
          .insert({ gamesId: gameId, profilesId: myProfile.id });
        await supabase
          .from("games")
          .update({ playState: "PLAYING", startedAt: new Date().toISOString() })
          .eq("id", gameId);
      }
    }
  );

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
    useSWRMutation("create-ranked-bot-game", async () => {
      console.info("here");
      if (myProfile) {
        let crosswordId: string | null = null;
        const { data, error } = await supabase.rpc("get_available_crossword", {
          profileid: myProfile.id,
        });

        if (error) {
          console.info({ error });
          throw error;
        }

        if (data && data.length) {
          crosswordId = data[0].id;
        }

        if (crosswordId) {
          const { data: bot } = await supabase
            .from("random_bot_profiles")
            .select()
            .limit(1)
            .single();
          if (bot?.id) {
            const { data: game, error: createGameError } = await supabase
              .from("games")
              .insert({
                crosswordsId: crosswordId,
                gameType: "RANKED",
                playState: "PLAYING",
                startedAt: addSeconds(new Date(), 10).toISOString(),
                gameDurationInSeconds: 180,
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
        }
      }
    });

  let opponentProgress = 0;
  let opponentUsername = "";
  let opponent;
  if (
    myProfile &&
    (game?.gameType === "FRIENDLY" || game?.gameType === "RANKED")
  ) {
    opponent = game.players.find((profile) => profile.id !== myProfile.id);
    if (opponent) {
      opponentUsername = opponent.username;
      if (game.gameState?.[opponent.id]) {
        opponentProgress = calculateScore({
          correctSolution: game.crossword.solution,
          solution: game.gameState[opponent.id].solution,
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
  };
};
