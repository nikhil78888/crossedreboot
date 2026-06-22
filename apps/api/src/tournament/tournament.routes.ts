import express, { Router } from "express";
import { supabase } from "../lib/supabase";
import { joinTournament } from "./tournament.service";

export const tournamentRouter: Router = express.Router();

// Join (or rejoin) a tournament. Returns the tournament id to navigate to.
tournamentRouter.post("/join", async (req, res) => {
  const uid = req.decodedFirebaseToken.uid;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("userId", uid)
    .single();
  if (!profile) {
    res.status(404).send("profile not found");
    return;
  }
  try {
    const gameVariant =
      req.body?.gameVariant === "SUDOKU" ? "SUDOKU" : "CROSSWORD";
    const tournamentId = await joinTournament(profile.id, gameVariant);
    res.send({ tournamentId });
  } catch (error) {
    console.log({ joinTournamentError: error });
    res.status(500).send();
  }
});
