import { useEffect, useState } from "react";
import { Game, GameState, TCrossword } from "../types";
import { gamesCollection } from "../firebase-collection";

export const useGame = ({ gameId }: { gameId: string }) => {
  const [game, setGame] = useState<Game | undefined>(undefined);

  useEffect(() => {
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
          game_type: gameData.game_type as Game["game_type"],
          play_state: gameData.play_state as Game["play_state"],
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

  return game;
};
