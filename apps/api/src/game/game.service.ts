import { addSeconds } from "date-fns";
import { supabase } from "../lib/supabase";

export const createRankedMatch = async (
  playerOneId: string,
  playerTwoId: string
) => {
  const { data: played } = await supabase
    .from("profiles")
    .select("games!gamePlayers(crosswordsId)")
    .in("id", [playerOneId, playerTwoId])
    .limit(1)
    .single();

  const playedCrosswordIds = played?.games
    .slice(-200)
    .map((g) => g.crosswordsId);

  const { data: crossword } = await supabase
    .from("crosswords")
    .select("*")
    .not("id", "in", `(${playedCrosswordIds?.join(",")})`)
    .limit(1)
    .single();

  if (!crossword) {
    throw new Error(
      `No crossword found between ${playerOneId} and ${playerTwoId}`
    );
  }

  const { data: game, error: createGameError } = await supabase
    .from("games")
    .insert({
      crosswordsId: crossword.id,
      gameType: "RANKED",
      playState: "PLAYING",
      gameDurationInSeconds: 180,
      startedAt: addSeconds(new Date(), 10).toISOString(),
    })
    .select("*")
    .single();
  if (createGameError) {
    throw createGameError;
  }
  await supabase.from("gamePlayers").insert([
    { gamesId: game.id, profilesId: playerOneId },
    { gamesId: game.id, profilesId: playerTwoId },
  ]);
};
