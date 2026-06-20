import { finalizeGame } from "./game/game.service";
import {
  getFillingTournamentsToStart,
  getExpiredTournamentGameIds,
  startTournament,
} from "./tournament/tournament.service";

// How long a tournament gathers players before filling the rest with bots.
const FILL_TIMEOUT_MS = 45000;

// Background loop that keeps tournaments moving without a client present:
//  - starts FILLING tournaments that are full or past the fill window
//  - finalizes TOURNAMENT games that ran past their time limit (no-show /
//    disconnect), which advances the bracket via finalizeGame's hook.
export const watchTournaments = () => {
  setInterval(async () => {
    try {
      const toStart = await getFillingTournamentsToStart(FILL_TIMEOUT_MS);
      for (const id of toStart) {
        await startTournament(id);
      }
      const expired = await getExpiredTournamentGameIds();
      for (const gameId of expired) {
        await finalizeGame(gameId);
      }
    } catch (error) {
      console.log({ watchTournamentsError: error });
    }
  }, 4000);
};
