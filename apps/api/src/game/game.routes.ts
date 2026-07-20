import express, { Router } from "express";
import { supabase } from "../lib/supabase";
import { Game } from "types-and-validators";
import { finalizeGame } from "./game.service";

export const gameRouter: Router = express.Router();

gameRouter.post("/finish-game", async (req, res) => {
  const { gameId } = req.body;
  const firebaseUid = req.decodedFirebaseToken.uid;
  const { data: games } = await supabase
    .from("games")
    .select("*, players:profiles!gamePlayers(*)")
    .eq("id", gameId)
    .returns<Game[]>();

  if (!games?.length) {
    res.status(400).send("Game not found");
    return;
  }
  const [game] = games;
  // Only a participant may finalize a game (closes the IDOR where any caller
  // could finalize any PLAYING game).
  if (!game.players?.some((p) => p.userId === firebaseUid)) {
    res.status(403).send({ message: "not a participant in this game" });
    return;
  }
  if (game.playState !== "PLAYING") {
    res.status(400).send({ message: "cannot end a game that is not playing" });
    return;
  }
  await finalizeGame(gameId);
  res.send(200);
});

gameRouter.post("/forfeit-game", async (req, res) => {
  const { gameId } = req.body;
  const firebaseUid = req.decodedFirebaseToken.uid;
  const { data: games } = await supabase
    .from("games")
    .select("*, players:profiles!gamePlayers(*)")
    .eq("id", gameId)
    .returns<Game[]>();

  if (!games?.length) {
    res.status(400).send("Game not found");
    return;
  }
  const [game] = games;
  // Only a participant may forfeit (finish-game already checks this). Without
  // it, anyone who learned a gameId could end a stranger's live match — the
  // forfeiter lookup returned undefined and it fell through to normal scoring,
  // freezing both players at their partial scores and applying full ratings.
  const forfeiter = game.players?.find((p) => p.userId === firebaseUid);
  if (!forfeiter) {
    res.status(403).send({ message: "not a participant in this game" });
    return;
  }
  if (game.playState !== "PLAYING") {
    res.status(400).send({ message: "cannot end a game that is not playing" });
    return;
  }
  await finalizeGame(gameId, { forfeitProfileId: forfeiter?.id });
  res.send(200);
});
