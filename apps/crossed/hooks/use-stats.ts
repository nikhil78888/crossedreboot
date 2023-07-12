import useSWR from "swr";
import { calculateScore, fixType } from "./use-game";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";
import { Game } from "types-and-validators";

export const useStats = () => {
  const { myProfile } = useMyProfile();

  const { data: stats } = useSWR(
    myProfile ? `stats-${myProfile.id}` : null,
    async () => {
      if (myProfile) {
        const { data, error } = await supabase
          .from("games")
          .select("*, players:profiles!inner(*), crossword:crosswords(*)")
          .filter("profiles.id", "eq", myProfile.id)
          .returns<Game[]>();
        if (error) {
          throw error;
        }
        let gamesPlayed = 0;
        let gamesWon = 0;
        for (let i = 0; i < data.length; i += 1) {
          const gameData = fixType(data[i]);
          if (gameData.playState === "COMPLETED") {
            gamesPlayed += 1;
            const correctSolution = gameData.crossword.solution;
            const mySolution = gameData.gameState?.[myProfile.id]?.solution;
            const myScore = mySolution
              ? calculateScore({
                  correctSolution,
                  solution: mySolution,
                })
              : 0;
            if (gameData.gameType === "SOLO") {
              if (myScore === 100) {
                gamesWon += 1;
              }
            }
            if (gameData.gameType === "FRIENDLY") {
              const opponent = gameData.players.find(
                (p) => p.id !== myProfile.id
              );
              if (opponent) {
                const opponentSolution =
                  gameData.gameState?.[opponent.id]?.solution;
                const opponentScore = opponentSolution
                  ? calculateScore({
                      correctSolution,
                      solution: opponentSolution,
                    })
                  : 0;
                if (myScore > opponentScore) {
                  gamesWon += 1;
                }
              }
            }
          }
        }
        return { gamesPlayed, gamesWon };
      }
    }
  );

  return { stats };
};
