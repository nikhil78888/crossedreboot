import express, { Router } from "express";
import { getUsersInLobby } from "../profile/profile.service";
import { supabase } from "../lib/supabase";
import { addSeconds } from "date-fns";
import { Game } from "types-and-validators";

export const gameRouter: Router = express.Router();

gameRouter.post("/ranked", async (req, res) => {
  const { userId } = req.body;
  const onlinePlayers = await getUsersInLobby();
  const { data: onlinePlayerProfiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", [...onlinePlayers, userId]);
  const rankedOnlinePlayerProfiles = onlinePlayerProfiles?.sort(
    (a, b) => a.eloRating - b.eloRating
  );
  const userIndex =
    rankedOnlinePlayerProfiles?.findIndex((p) => p.id === userId) || 0;
  const opponentId =
    rankedOnlinePlayerProfiles?.[userIndex + 1]?.id ||
    rankedOnlinePlayerProfiles?.[userIndex - 1]?.id;
  console.log(`match ${userId} with ${opponentId}`);
  if (opponentId) {
    const { data: played } = await supabase
      .from("profiles")
      .select("games!gamePlayers(crosswordsId)")
      .in("id", [userId, opponentId])
      .limit(1)
      .single();
    const playedCrosswordIds = played?.games
      .slice(0, 200)
      .map((g) => g.crosswordsId);

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
      const score = game.gameState?.[player.id]?.solution
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
  for (let i = 0; i < scores.length; i += 1) {
    await supabase
      .from("gamePlayers")
      .update({ score: scores[i].score })
      .eq("gamesId", gameId)
      .eq("profilesId", scores[i].playerId);
  }
  if (game.gameType === "RANKED" && winnerId !== null) {
    const updatedRatings = updateEloRatings(
      { id: game.players[0].id, eloRating: game.players[0].eloRating },
      { id: game.players[1].id, eloRating: game.players[1].eloRating },
      winnerId
    );
    console.log({ updatedRatings });
    for (let i = 0; i < updatedRatings.length; i += 1) {
      const { error } = await supabase
        .from("profiles")
        .update({
          eloRating: Math.round(updatedRatings[i].rating),
        })
        .eq("id", updatedRatings[i].playerId);
      if (error) {
        console.log({ error });
      }
    }
  }
  await supabase
    .from("games")
    .update({ playState: "COMPLETED", winnerId })
    .eq("id", gameId);
  res.send(200);
});

gameRouter.post("/forfeit-game", async (req, res) => {
  const { gameId } = req.body;
  const firebaseUid = req.decodedFirebaseToken.uid;
  const { data: games, error } = await supabase
    .from("games")
    .select("*, players:profiles!gamePlayers(*), crossword:crosswords(*)")
    .eq("id", gameId)
    .returns<Game[]>();

  if (error) {
    console.log({ error });
  }

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
  const winner = scores.sort((a, b) => b.score - a.score)[0];
  const winnerId = winner.playerId;
  for (let i = 0; i < scores.length; i += 1) {
    await supabase
      .from("gamePlayers")
      .update({ score: scores[i].score })
      .eq("gamesId", gameId)
      .eq("profilesId", scores[i].playerId);
  }
  if (game.gameType === "RANKED" && winnerId !== null) {
    const updatedRatings = updateEloRatings(
      { id: game.players[0].id, eloRating: game.players[0].eloRating },
      { id: game.players[1].id, eloRating: game.players[1].eloRating },
      winnerId
    );
    console.log({ updatedRatings });
    for (let i = 0; i < updatedRatings.length; i += 1) {
      const { error } = await supabase
        .from("profiles")
        .update({
          eloRating: Math.round(updatedRatings[i].rating),
        })
        .eq("id", updatedRatings[i].playerId);
      if (error) {
        console.log({ error });
      }
    }
  }
  await supabase
    .from("games")
    .update({ playState: "COMPLETED", winnerId })
    .eq("id", gameId);
  res.send(200);
});

const updateEloRatings = (
  playerOne: { eloRating: number; id: string },
  playerTwo: { eloRating: number; id: string },
  winnerId: string
) => {
  const K = 32;
  const Pa = winningProbability(playerTwo.eloRating, playerOne.eloRating);
  const Pb = winningProbability(playerOne.eloRating, playerTwo.eloRating);
  if (winnerId === playerOne.id) {
    return [
      {
        playerId: playerOne.id,
        rating: playerOne.eloRating + K * (1 - Pa),
      },
      {
        playerId: playerTwo.id,
        rating: playerTwo.eloRating + K * (0 - Pb),
      },
    ];
  } else {
    return [
      {
        playerId: playerOne.id,
        rating: playerOne.eloRating + K * (0 - Pa),
      },
      {
        playerId: playerTwo.id,
        rating: playerTwo.eloRating + K * (1 - Pb),
      },
    ];
  }
};

function winningProbability(rating1: number, rating2: number) {
  const diff = rating1 - rating2;
  return 1 / (1 + Math.pow(10, diff / 400));
}

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
