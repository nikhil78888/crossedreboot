// /api/profile

import express, { Router } from "express";
import { getUsersInLobby } from "./profile.service";
import { supabase } from "../lib/supabase";

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
    const ratingCol =
      req.query.variant === "SUDOKU" ? "eloRatingSudoku" : "eloRating";
    // Exclude bots at the query level so the world ranking is humans only and
    // returns a full list (filtering after a limit could short the results).
    const { data, error } = await supabase
      .from("profiles")
      .select(`id, username, country, avatar, eloRating:${ratingCol}`)
      .neq("type", "BOT")
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
