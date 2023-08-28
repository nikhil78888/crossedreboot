import useSWRMutation from "swr/mutation";
import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";
import { Game } from "types-and-validators";
import axios from "axios";
import { useStats } from "./use-stats";
import { useEffect } from "react";

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
            next(null, game ? fixType(game) : undefined);
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
          next(null, game ? fixType(game) : undefined);
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
        const { data: played, error: fetchPlayedError } = await supabase
          .from("profiles")
          .select("games!gamePlayers(crosswordsId)")
          .eq("id", myProfile.id)
          .limit(1)
          .single();

        if (fetchPlayedError) {
          console.info({ fetchPlayedError });
        }

        const playedCrosswordIds = played?.games
          .slice(-200)
          .map((g) => g.crosswordsId);

        const { data: crossword, error: findCrosswordError } = await supabase
          .from("crosswords")
          .select("*")
          .not("id", "in", `(${playedCrosswordIds?.join(",")})`)
          .limit(1)
          .single();

        if (findCrosswordError) {
          console.info({ findCrosswordError });
        }

        if (crossword) {
          const { data: game, error: createGameError } = await supabase
            .from("games")
            .insert({
              crosswordsId: crossword.id,
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
        const { data: played, error: fetchPlayedError } = await supabase
          .from("profiles")
          .select("games!gamePlayers(crosswordsId)")
          .eq("id", myProfile.id)
          .limit(1)
          .single();

        if (fetchPlayedError) {
          console.info({ fetchPlayedError });
        }

        const playedCrosswordIds = played?.games
          .slice(-200)
          .map((g) => g.crosswordsId);

        const { data: crossword } = await supabase
          .from("crosswords")
          .select("*")
          .not("id", "in", `(${playedCrosswordIds?.join(",")})`)
          .limit(1)
          .single();

        if (crossword) {
          const { data: game, error: createGameError } = await supabase
            .from("games")
            .insert({
              crosswordsId: crossword.id,
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

  let opponentProgress = 0;
  let opponentUsername = "";
  if (
    myProfile &&
    (game?.gameType === "FRIENDLY" || game?.gameType === "RANKED")
  ) {
    const opponent = game.players.find(
      (profile) => profile.id !== myProfile.id
    );
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
    opponentProgress,
    opponentUsername,
    startGame,
    startingGame,
    forfeitGame,
    forfeitingGame,
  };
};
