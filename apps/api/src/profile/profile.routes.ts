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

    // Global: top humans worldwide who've actually played a ranked match in this
    // variant. Exclude bots, and exclude players still at the default rating
    // deviation (350) — RD only drops once you play ranked and never reflates,
    // so RD < 350 means "has played ranked". Keeps unplayed/test accounts out.
    const { data, error } = await supabase
      .from("profiles")
      .select(cols)
      .neq("type", "BOT")
      .lt(rdCol, 350)
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
