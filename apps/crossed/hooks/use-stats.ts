import { gamesCollection } from "../lib/firebase-collection";
import { useCurrentUser } from "./use-current-user";
import useSWR from "swr";
import { calculateScore } from "./use-game";

export const useStats = () => {
  const { user } = useCurrentUser();

  const { data: stats } = useSWR(
    user ? `stats-${user.uid}` : null,
    async () => {
      if (user) {
        const documents = await gamesCollection
          .where("players", "array-contains", user.uid)
          .get();
        let gamesPlayed = 0;
        let gamesWon = 0;
        for (let i = 0; i < documents.docs.length; i += 1) {
          const gameData = documents.docs[i].data();
          if (gameData.play_state === "COMPLETED") {
            gamesPlayed += 1;
            const correctSolution = JSON.parse(gameData.crossword.solution);
            const mySolution =
              gameData.game_state?.[user.uid]?.solution &&
              JSON.parse(gameData.game_state[user.uid].solution);
            const myScore = mySolution
              ? calculateScore({
                  correctSolution,
                  solution: mySolution,
                })
              : 0;
            if (gameData.game_type === "SOLO") {
              if (myScore === 100) {
                gamesWon += 1;
              }
            }
            if (gameData.game_type === "FRIENDLY") {
              const opponentUid = gameData.players.find(
                (p: string) => p !== user.uid
              );
              const opponentSolution =
                gameData.game_state?.[opponentUid]?.solution &&
                JSON.parse(gameData.game_state[opponentUid].solution);
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
        return { gamesPlayed, gamesWon };
      }
    }
  );

  return { stats };
};
