import { createServer } from "./server";
import { watchLobby } from "./watch-lobby";
import { watchTournaments } from "./watch-tournaments";
import { watchTournamentQueue } from "./watch-tournament-queue";
import { supabase } from "./lib/supabase";

watchLobby();
watchTournaments();
watchTournamentQueue();

// Retention: prune old seenClues rows daily so the table stays bounded and the
// per-user recency query (word-spacing) stays fast. The DELETE is idempotent,
// so it's harmless if multiple replicas run it.
const pruneSeenClues = () =>
  supabase
    .rpc("prune_seen_clues")
    .then(({ error }) => error && console.log({ pruneError: error }));
pruneSeenClues();
setInterval(pruneSeenClues, 24 * 60 * 60 * 1000);

const port = process.env.PORT || 5001;
const server = createServer();

server.listen(port, () => {
  console.log(`api running on ${port}`);
});
