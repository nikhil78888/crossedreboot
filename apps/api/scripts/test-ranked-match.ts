import { createRankedMatch } from "../src/game/game.service";

export const testRankedMatch = async () => {
  console.log("starting test");
  const game = await createRankedMatch("playerIdOne", "playerIdTwo");
  console.log(game);
};

testRankedMatch();
