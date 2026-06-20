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
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, eloRating, country, avatar, type")
      .order("eloRating", { ascending: false })
      .limit(limit);
    if (error) {
      throw error;
    }
    // hide bot accounts from the human leaderboard
    const players = (data || []).filter((p) => p.type !== "BOT");
    res.send(players);
  } catch (error) {
    next(error);
  }
});
