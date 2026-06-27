import { finalizeGame, getExpiredHeadToHeadGameIds } from "./game/game.service";

// Background loop that finalizes RANKED/FRIENDLY games left PLAYING past their
// time limit when no client was open to end them on-screen. It reuses the same
// idempotent, race-safe finalizeGame the client finish/forfeit endpoints use, so
// a swept game resolves identically to one ended in the app (scores, winner, and
// ratings for ranked). SOLO is excluded by getExpiredHeadToHeadGameIds — it has
// no shared clock and is self-paced, so it is never auto-finalized.
//
// No lease needed: finalizeGame atomically claims completion (PLAYING -> COMPLETED),
// so multiple replicas running this loop can never double-apply scores/ratings.
export const watchStaleGames = () => {
  setInterval(async () => {
    try {
      const expired = await getExpiredHeadToHeadGameIds();
      for (const gameId of expired) {
        await finalizeGame(gameId);
      }
    } catch (error) {
      console.log({ watchStaleGamesError: error });
    }
  }, 5000);
};
