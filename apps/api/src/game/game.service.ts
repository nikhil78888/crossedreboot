import { addSeconds } from "date-fns";
import { supabase } from "../lib/supabase";

// Time limit scales with puzzle size (7x7/8x8 -> 5 min, 9x9 -> 7 min).
const durationForSize = (size: number | null | undefined, base: number) =>
  size && size >= 9 ? 420 : size && size >= 7 ? 300 : base;

export const createRankedMatch = async (
  playerOneId: string,
  playerTwoId: string
) => {
  const { data, error } = await supabase.rpc("get_available_ranked_crossword", {
    player_one_id: playerOneId,
    player_two_id: playerTwoId,
  });

  if (error) {
    throw new Error(
      `Error fetching crossword b/w ${playerOneId} and ${playerTwoId}`
    );
  }

  const { data: game, error: createGameError } = await supabase
    .from("games")
    .insert({
      crosswordsId: data[0].id,
      gameType: "RANKED",
      playState: "PLAYING",
      gameDurationInSeconds: durationForSize(data[0]?.size, 180),
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

  return game;
};
