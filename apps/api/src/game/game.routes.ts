import express, { Router } from "express";
import { getUsersInLobby } from "../profile/profile.service";
import { supabase } from "../lib/supabase";
import { addSeconds } from "date-fns";

export const gameRouter: Router = express.Router();

gameRouter.post("/ranked", async (req, res) => {
  const { userId } = req.body;
  const onlinePlayers = await getUsersInLobby();
  const onlineOpponents = onlinePlayers.filter(
    (playerId) => playerId !== userId
  );
  console.log(`match ${userId} with ${onlineOpponents[0]}`);
  const opponentId = onlineOpponents[0];
  if (opponentId) {
    const { data: played } = await supabase
      .from("profiles")
      .select("games(crosswordsId)")
      .in("id", [userId, opponentId])
      .limit(1)
      .single();
    const playedCrosswordIds = played?.games.map((g) => g.crosswordsId);

    const { data: crossword } = await supabase
      .from("crosswords")
      .select("*")
      .not("id", "in", `(${playedCrosswordIds?.join(",")})`)
      .limit(1)
      .single();

    if (crossword) {
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
        { gamesId: game.id, profilesId: userId },
        { gamesId: game.id, profilesId: opponentId },
      ]);
    }
  }
  res.send();
});
