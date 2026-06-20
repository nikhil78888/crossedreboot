import { createServer } from "./server";
import { watchLobby } from "./watch-lobby";
import { watchTournaments } from "./watch-tournaments";

watchLobby();
watchTournaments();
const port = process.env.PORT || 5001;
const server = createServer();

server.listen(port, () => {
  console.log(`api running on ${port}`);
});
