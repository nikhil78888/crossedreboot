import { useEffect, useState } from "react";
import useSWRMutation from "swr/mutation";
import firestore from "@react-native-firebase/firestore";
import { Game, GameState, TCrossword } from "../types";
import { crosswordsCollection, gamesCollection } from "../firebase-collection";
import { useCurrentUser } from "./use-current-user";

export const useGame = ({ gameId }: { gameId?: string }) => {
  const { user, profile } = useCurrentUser();
  const [game, setGame] = useState<Game | undefined>(undefined);

  useEffect(() => {
    if (!gameId) {
      return;
    }
    const subscriber = gamesCollection
      .doc(gameId)
      .onSnapshot((gameSnapshot) => {
        const gameData = gameSnapshot.data();
        if (!gameData) {
          return;
        }
        const crossword: TCrossword = {
          version: gameData.crossword.version as TCrossword["version"],
          kind: gameData.crossword.kind as TCrossword["kind"],
          title: gameData.crossword.title as TCrossword["title"],
          copyright: gameData.crossword.copyright as TCrossword["copyright"],
          author: gameData.crossword.author as TCrossword["author"],
          dimensions: gameData.crossword.dimensions as TCrossword["dimensions"],
          puzzle: JSON.parse(gameData.crossword.puzzle) as TCrossword["puzzle"],
          solution: JSON.parse(
            gameData.crossword.solution
          ) as TCrossword["solution"],
          clues: {
            Across: JSON.parse(
              gameData.crossword.clues.Across
            ) as TCrossword["clues"]["Across"],
            Down: JSON.parse(
              gameData.crossword.clues.Down
            ) as TCrossword["clues"]["Down"],
          },
        };
        const game: Game = {
          players: gameData.players as Game["players"],
          player_handles: gameData.player_handles as Game["player_handles"],
          game_type: gameData.game_type as Game["game_type"],
          play_state: gameData.play_state as Game["play_state"],
          startedAt: gameData.startedAt as Game["startedAt"],
          gameDurationInSeconds:
            gameData.gameDurationInSeconds as Game["gameDurationInSeconds"],
          game_state: gameData.game_state
            ? Object.keys(gameData.game_state).reduce((prevValue, playerId) => {
                const playerGameState = gameData.game_state[playerId];
                return {
                  ...prevValue,
                  [playerId]: {
                    currentCell:
                      playerGameState.currentCell as GameState["currentCell"],
                    direction:
                      playerGameState.direction as GameState["direction"],
                    solution: JSON.parse(
                      playerGameState.solution
                    ) as GameState["solution"],
                  },
                };
              }, {})
            : undefined,
          crossword,
        };
        setGame(game);
      });

    return subscriber;
  }, [gameId]);

  const { trigger: createSoloGame, isMutating: creatingSoloGame } =
    useSWRMutation("create-solo-game", async () => {
      if (user?.uid) {
        const gamesPlayed = await gamesCollection
          .where("players", "array-contains", user.uid)
          .get();
        const playedGameIds = gamesPlayed.docs.map((d) => d.data().crosswordId);
        let documents;
        if (playedGameIds.length) {
          documents = await crosswordsCollection
            .where(firestore.FieldPath.documentId(), "not-in", playedGameIds)
            .get();
        }
        if (!documents?.docs.length) {
          documents = await crosswordsCollection.get();
        }
        if (documents.docs.length) {
          const count = documents.docs.length;
          const randomIndex = Math.floor(Math.random() * count);
          const game = {
            crossword: documents.docs[randomIndex].data(),
            crosswordId: documents.docs[randomIndex].id,
            players: [user.uid],
            play_state: "PLAYING",
            game_type: "SOLO",
          };
          const soloGameDoc = await gamesCollection.add(game);
          return soloGameDoc.id;
        }
      }
    });

  const { trigger: createFriendlyGame, isMutating: creatingFriendlyGame } =
    useSWRMutation("create-friendly-game", async () => {
      if (user?.uid) {
        const gamesPlayed = await gamesCollection
          .where("players", "array-contains", user.uid)
          .get();
        const playedGameIds = gamesPlayed.docs.map((d) => d.data().crosswordId);
        let documents;
        if (playedGameIds.length) {
          documents = await crosswordsCollection
            .where(firestore.FieldPath.documentId(), "not-in", playedGameIds)
            .get();
        }
        if (!documents?.docs.length) {
          documents = await crosswordsCollection.get();
        }
        if (documents.docs.length) {
          const count = documents.docs.length;
          const randomIndex = Math.floor(Math.random() * count);
          const game = {
            crossword: documents.docs[randomIndex].data(),
            crosswordId: documents.docs[randomIndex].id,
            players: [user.uid],
            play_state: "CREATED",
            game_type: "FRIENDLY",
            player_handles: { [user.uid]: profile?.username },
            gameDurationInSeconds: 300,
          };
          const friendlyGameDoc = await gamesCollection.add(game);
          return friendlyGameDoc.id;
        }
      }
    });

  const { trigger: finishGame, isMutating: finishingGame } = useSWRMutation(
    "finish-game",
    async () => {
      if (gameId) {
        await gamesCollection.doc(gameId).update("play_state", "COMPLETED");
        return;
      }
    }
  );

  let opponentProgress = 0;
  let opponentUsername = "";
  if (game?.game_type === "FRIENDLY") {
    const opponentUid = game.players.find((uid) => uid !== user?.uid);
    if (opponentUid) {
      opponentUsername = game.player_handles[opponentUid];
      const correctSolution = game.crossword.solution;
      const opponentSolution = game.game_state?.[opponentUid].solution;
      if (opponentSolution) {
        let totalChars = 0;
        let correctChars = 0;
        for (let i = 0; i < correctSolution.length; i += 1) {
          const rowSolution = correctSolution[i];
          for (let j = 0; j < rowSolution.length; j += 1) {
            const cellCorrectSolution = rowSolution[j];
            if (cellCorrectSolution) {
              totalChars += 1;
              if (opponentSolution[i][j] === cellCorrectSolution) {
                correctChars += 1;
              }
            }
          }
          opponentProgress = Math.round((correctChars / totalChars) * 100);
        }
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
    opponentProgress,
    opponentUsername,
  };
};
