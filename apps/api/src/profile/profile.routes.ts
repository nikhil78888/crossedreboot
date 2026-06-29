// /api/profile

import express, { Router } from "express";
import { getUsersInLobby } from "./profile.service";
import { supabase } from "../lib/supabase";
import { ratingFieldsFor } from "../rating-fields";

export const profileRouter: Router = express.Router();

profileRouter.get("/online", async (req, res, next) => {
  try {
    const users = await getUsersInLobby();
    res.send(users);
  } catch (error) {
    next(error);
  }
});

// Global leaderboard — top players by rating. Uses the service-role client so
// it can read all profiles (RLS blocks anon reads). Public on purpose.
profileRouter.get("/leaderboard", async (req, res, next) => {
  try {
    const limit = Math.min(
      parseInt((req.query.limit as string) || "100", 10) || 100,
      200
    );
    // Separate ladders per variant: rank by the sudoku rating when asked, else
    // the crossword rating. Alias the chosen column back to `eloRating` so the
    // client response shape is identical for both.
    const fields = ratingFieldsFor(req.query.variant as string | undefined);
    const ratingCol = fields.rating;
    const rdCol = fields.rd;
    const cols = `id, username, country, avatar, eloRating:${ratingCol}`;

    // Global: top humans who've actually played a ranked match in this variant.
    // "Has played" = their rating moved off the defaults (1000 / RD 350). We can't
    // rely on RD alone — some real ranked players still show RD 350 — so include
    // anyone whose rating OR deviation differs from default. Never-played + test
    // accounts sit at exactly 1000/350 and are dropped.
    const { data, error } = await supabase
      .from("profiles")
      .select(cols)
      .neq("type", "BOT")
      .or(`${ratingCol}.neq.1000,${rdCol}.neq.350`)
      .order(ratingCol, { ascending: false })
      .limit(limit);
    if (error) {
      throw error;
    }
    res.send(data || []);
  } catch (error) {
    next(error);
  }
});
