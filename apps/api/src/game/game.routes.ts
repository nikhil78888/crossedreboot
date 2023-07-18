import express, { Router } from "express";
import { getUsersInLobby } from "../profile/profile.service";
import { supabase } from "../lib/supabase";
import { addSeconds } from "date-fns";
import { Game } from "types-and-validators";

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

gameRouter.post("/finish-game", async (req, res) => {
  const { gameId } = req.body;
  console.log({ gameId });
  const { data: games, error } = await supabase
    .from("games")
    .select("*, players:profiles!gamePlayers(*), crossword:crosswords(*)")
    .eq("id", gameId)
    .returns<Game[]>();

  console.log(error, games);

  if (!games?.length) {
    res.status(400).send("Game not found");
    return;
  }

  const [game] = games;
  if (game?.playState !== "PLAYING") {
    res.status(400).send({ message: "cannot end a game that is not playing" });
    return;
  }
  const scores: { playerId: string; score: number }[] = game.players.reduce(
    (prevScores, player) => {
      const score = game.gameState?.[player.id].solution
        ? calculateScore({
            correctSolution: game.crossword?.solution as unknown as string[][],
            solution: game.gameState[player.id]
              .solution as unknown as string[][],
          })
        : 0;
      return [...prevScores, { playerId: player.id, score }];
    },
    [] as { playerId: string; score: number }[]
  );
  console.log(scores);
  const winner = scores.sort((a, b) => b.score - a.score)[0];
  let winnerId = null;
  if (game.gameType === "SOLO") {
    if (winner.score === 100) {
      winnerId = winner.playerId;
    }
  } else if (winner.score > 0) {
    winnerId = winner.playerId;
  }
  console.log(winner);
  await supabase
    .from("games")
    .update({ playState: "COMPLETED", winnerId })
    .eq("id", gameId);
  for (let i = 0; i < scores.length; i += 1) {
    await supabase
      .from("gamePlayers")
      .update({ score: scores[i].score })
      .eq("gamesId", gameId)
      .eq("profilesId", scores[i].playerId);
  }
  res.send(200);
});

gameRouter.post("/forfeit-game", async (req, res) => {
  const { gameId } = req.body;
  const firebaseUid = req.decodedFirebaseToken.uid;
  console.log({ gameId });
  const { data: games, error } = await supabase
    .from("games")
    .select("*, players:profiles!gamePlayers(*), crossword:crosswords(*)")
    .eq("id", gameId)
    .returns<Game[]>();

  console.log(error, games);

  if (!games?.length) {
    res.status(400).send("Game not found");
    return;
  }

  const [game] = games;
  if (game?.playState !== "PLAYING") {
    res.status(400).send({ message: "cannot end a game that is not playing" });
    return;
  }
  const scores: { playerId: string; score: number }[] = game.players.reduce(
    (prevScores, player) => {
      const score = player.userId === firebaseUid ? 0 : 100;
      return [...prevScores, { playerId: player.id, score }];
    },
    [] as { playerId: string; score: number }[]
  );
  console.log(scores);
  const winner = scores.sort((a, b) => b.score - a.score)[0];
  const winnerId = winner.playerId;
  console.log(winner);
  await supabase
    .from("games")
    .update({ playState: "COMPLETED", winnerId })
    .eq("id", gameId);
  for (let i = 0; i < scores.length; i += 1) {
    await supabase
      .from("gamePlayers")
      .update({ score: scores[i].score })
      .eq("gamesId", gameId)
      .eq("profilesId", scores[i].playerId);
  }
  res.send(200);
});

const calculateScore = ({
  correctSolution,
  solution,
}: {
  correctSolution: Game["crossword"]["solution"];
  solution: Game["crossword"]["solution"] | undefined;
}) => {
  if (!solution) {
    return 0;
  }
  let totalChars = 0;
  let correctChars = 0;
  for (let i = 0; i < correctSolution.length; i += 1) {
    const rowSolution = correctSolution[i];
    for (let j = 0; j < rowSolution.length; j += 1) {
      const cellCorrectSolution = rowSolution[j];
      if (cellCorrectSolution) {
        totalChars += 1;
        if (solution[i][j] === cellCorrectSolution) {
          correctChars += 1;
        }
      }
    }
  }
  const score = Math.round((correctChars / totalChars) * 100);
  return score;
};
