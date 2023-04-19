import useSWR from "swr";
import firestore from "@react-native-firebase/firestore";
import { crosswordsCollection, gamesCollection } from "../firebase-collection";
import { useCurrentUser } from "./use-current-user";
import { TCrossword, Game, GameState } from "../types";

export const useCurrentGame = () => {
  const { currentUser } = useCurrentUser();
  const {
    data,
    isLoading: loadingCurrentGame,
    isValidating: refreshingCurrentGame,
    error: loadCurrentGameError,
    mutate,
  } = useSWR(currentUser ? "current-game" : null, async () => {
    const documents = await gamesCollection
      .where("players", "array-contains", currentUser?.uid)
      .get();
    const currentGameDoc = documents.docs.find(
      (d) => d.data().play_state === "PLAYING"
    );
    if (currentGameDoc) {
      const currentGameData = currentGameDoc?.data();
      const crossword: TCrossword = {
        version: currentGameData.crossword.version as TCrossword["version"],
        kind: currentGameData.crossword.kind as TCrossword["kind"],
        title: currentGameData.crossword.title as TCrossword["title"],
        copyright: currentGameData.crossword
          .copyright as TCrossword["copyright"],
        author: currentGameData.crossword.author as TCrossword["author"],
        dimensions: currentGameData.crossword
          .dimensions as TCrossword["dimensions"],
        puzzle: JSON.parse(
          currentGameData.crossword.puzzle
        ) as TCrossword["puzzle"],
        solution: JSON.parse(
          currentGameData.crossword.solution
        ) as TCrossword["solution"],
        clues: {
          Across: JSON.parse(
            currentGameData.crossword.clues.Across
          ) as TCrossword["clues"]["Across"],
          Down: JSON.parse(
            currentGameData.crossword.clues.Down
          ) as TCrossword["clues"]["Down"],
        },
      };
      const currentGame: Game = {
        players: currentGameData.players as Game["players"],
        game_type: currentGameData.game_type as Game["game_type"],
        play_state: currentGameData.play_state as Game["play_state"],
        game_state: currentGameData.game_state
          ? Object.keys(currentGameData.game_state).reduce(
              (prevValue, playerId) => {
                const playerGameState = currentGameData.game_state[playerId];
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
              },
              {}
            )
          : undefined,
        crossword,
      };
      return {
        currentGame,
        currentGameId: currentGameDoc.id,
      };
    }
  });

  const startSoloGame = async () => {
    const gamesPlayed = await gamesCollection
      .where("players", "array-contains", currentUser?.uid)
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
        players: [currentUser?.uid],
        play_state: "PLAYING",
        game_type: "SOLO",
      };
      await gamesCollection.add(game);
      mutate();
    }
  };

  const startGameWithAFriend = async () => {
    const gamesPlayed = await gamesCollection
      .where("players", "array-contains", currentUser?.uid)
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
        players: [currentUser?.uid],
        play_state: "PLAYING",
        game_type: "FRIENDLY",
      };
      await gamesCollection.add(game);
      mutate();
    }
  };

  return {
    currentGame: data?.currentGame as Game,
    currentGameId: data?.currentGameId,
    loadingCurrentGame,
    refreshingCurrentGame,
    loadCurrentGameError,
    startSoloGame,
    startGameWithAFriend,
  };
};
