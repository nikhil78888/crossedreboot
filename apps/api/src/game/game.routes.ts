import express, { Router } from "express";
import { getUsersInLobby } from "../profile/profile.service";
import { supabase } from "../lib/supabase";
import { addSeconds } from "date-fns";
import { Game } from "types-and-validators";

export const gameRouter: Router = express.Router();

// let matchingPlayers: string[] = [];

// gameRouter.post("/ranked", async (req, res) => {
//   const { userId } = req.body;
//   const onlinePlayers = await getUsersInLobby();
//   const { data: onlinePlayerProfiles } = await supabase
//     .from("profiles")
//     .select("*")
//     .in("id", [...onlinePlayers, userId]);
//   console.log({ matchingPlayersStep1: matchingPlayers });
//   const availablePlayers = onlinePlayerProfiles?.filter(
//     (profile) => !matchingPlayers.includes(profile.id)
//   );
//   const rankedOnlinePlayerProfiles = availablePlayers?.sort(
//     (a, b) => a.eloRating - b.eloRating
//   );
//   const userIndex =
//     rankedOnlinePlayerProfiles?.findIndex((p) => p.id === userId) || 0;
//   const opponentId =
//     rankedOnlinePlayerProfiles?.[userIndex + 1]?.id ||
//     rankedOnlinePlayerProfiles?.[userIndex - 1]?.id;
//   if (opponentId) {
//     try {
//       console.log(`match ${userId} with ${opponentId}`);
//       matchingPlayers = [...matchingPlayers, userId, opponentId];
//       console.log({ matchingPlayersStep2: matchingPlayers });
//       const { data: played } = await supabase
//         .from("profiles")
//         .select("games!gamePlayers(crosswordsId)")
//         .in("id", [userId, opponentId])
//         .limit(1)
//         .single();
//       const playedCrosswordIds = played?.games
//         .slice(-200)
//         .map((g) => g.crosswordsId);

//       const { data: crossword } = await supabase
//         .from("crosswords")
//         .select("*")
//         .not("id", "in", `(${playedCrosswordIds?.join(",")})`)
//         .limit(1)
//         .single();

//       if (crossword) {
//         const { data: game, error: createGameError } = await supabase
//           .from("games")
//           .insert({
//             crosswordsId: crossword.id,
//             gameType: "RANKED",
//             playState: "PLAYING",
//             gameDurationInSeconds: 180,
//             startedAt: addSeconds(new Date(), 10).toISOString(),
//           })
//           .select("*")
//           .single();
//         if (createGameError) {
//           throw createGameError;
//         }
//         await supabase.from("gamePlayers").insert([
//           { gamesId: game.id, profilesId: userId },
//           { gamesId: game.id, profilesId: opponentId },
//         ]);
//         res.send();
//       } else {
//         throw new Error(
//           `No crossword found between ${userId} and ${opponentId}`
//         );
//       }
//     } catch (error) {
//       res.status(500).send();
//     } finally {
//       matchingPlayers = matchingPlayers.filter(
//         (id) => id !== userId && id !== opponentId
//       );
//       console.log({ matchingPlayersStep3: matchingPlayers });
//     }
//   } else {
//     res.status(404).send();
//   }
// });

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
  await applyRankedRatings(game, winnerId);
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
  await applyRankedRatings(game, winnerId);
  await supabase
    .from("games")
    .update({ playState: "COMPLETED", winnerId })
    .eq("id", gameId);
  res.send(200);
});

// --- Glicko-2 rating system (the system chess.com uses) --------------------
// Each player has a rating, a rating deviation (RD = how uncertain the rating
// is) and a volatility. New/uncertain players (high RD) move fast; established
// players move slowly. Uses `ratingDeviation` + `volatility` columns on
// profiles when present (defaults 350 / 0.06 otherwise).
const GLICKO_SCALE = 173.7178;
const GLICKO_TAU = 0.5;

const glickoG = (phi: number) =>
  1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));

const glickoE = (mu: number, muj: number, phij: number) =>
  1 / (1 + Math.exp(-glickoG(phij) * (mu - muj)));

const glicko2Update = (
  player: { rating: number; rd: number; vol: number },
  opponent: { rating: number; rd: number; vol: number },
  score: number // 1 = win, 0 = loss
) => {
  const mu = (player.rating - 1500) / GLICKO_SCALE;
  const phi = player.rd / GLICKO_SCALE;
  const muj = (opponent.rating - 1500) / GLICKO_SCALE;
  const phij = opponent.rd / GLICKO_SCALE;

  const gj = glickoG(phij);
  const e = glickoE(mu, muj, phij);
  const v = 1 / (gj * gj * e * (1 - e));
  const delta = v * gj * (score - e);

  // iterate to the new volatility (Illinois algorithm)
  const a = Math.log(player.vol * player.vol);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const d2 = delta * delta;
    const p2 = phi * phi;
    return (
      (ex * (d2 - p2 - v - ex)) / (2 * Math.pow(p2 + v + ex, 2)) -
      (x - a) / (GLICKO_TAU * GLICKO_TAU)
    );
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * GLICKO_TAU) < 0) k += 1;
    B = a - k * GLICKO_TAU;
  }
  let fA = f(A);
  let fB = f(B);
  let iter = 0;
  while (Math.abs(B - A) > 0.000001 && iter < 100) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    iter += 1;
  }
  const newVol = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + newVol * newVol);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gj * (score - e);

  return {
    rating: GLICKO_SCALE * newMu + 1500,
    rd: GLICKO_SCALE * newPhi,
    vol: newVol,
  };
};

type RankedPlayer = {
  id: string;
  eloRating: number;
  ratingDeviation?: number;
  volatility?: number;
};

const updateGlicko2Ratings = (
  playerOne: RankedPlayer,
  playerTwo: RankedPlayer,
  winnerId: string
) => {
  const p1 = {
    rating: playerOne.eloRating,
    rd: playerOne.ratingDeviation ?? 350,
    vol: playerOne.volatility ?? 0.06,
  };
  const p2 = {
    rating: playerTwo.eloRating,
    rd: playerTwo.ratingDeviation ?? 350,
    vol: playerTwo.volatility ?? 0.06,
  };
  const s1 = winnerId === playerOne.id ? 1 : 0;
  const r1 = glicko2Update(p1, p2, s1);
  const r2 = glicko2Update(p2, p1, 1 - s1);
  return [
    { playerId: playerOne.id, ...r1 },
    { playerId: playerTwo.id, ...r2 },
  ];
};

// Compute + persist ranked ratings for a finished game. Writes the Glicko-2
// fields if the columns exist, else falls back to updating the rating only —
// so it never freezes ratings even before the migration is applied.
const applyRankedRatings = async (
  game: Game,
  winnerId: string | null
) => {
  if (game.gameType !== "RANKED" || winnerId == null) return;
  const players = game.players as unknown as RankedPlayer[];
  if (!players || players.length < 2) return;
  const updated = updateGlicko2Ratings(players[0], players[1], winnerId);
  for (const r of updated) {
    const { error } = await supabase
      .from("profiles")
      .update({
        eloRating: Math.round(r.rating),
        ratingDeviation: Math.round(r.rd * 100) / 100,
        volatility: Math.round(r.vol * 1e6) / 1e6,
      } as never)
      .eq("id", r.playerId);
    if (error) {
      console.log({ ratingUpdateError: error });
      await supabase
        .from("profiles")
        .update({ eloRating: Math.round(r.rating) })
        .eq("id", r.playerId);
    }
  }
};

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
