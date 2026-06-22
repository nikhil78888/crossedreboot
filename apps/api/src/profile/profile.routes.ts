// /api/profile

import express, { Router } from "express";
import { getUsersInLobby } from "./profile.service";
import { supabase } from "../lib/supabase";
import { getProfileIdByUid } from "../friends/friends.service";

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
    const cols = `id, username, country, avatar, eloRating:${ratingCol}`;

    // Friends scope: just the caller + their accepted friends, ranked.
    if (req.query.scope === "friends") {
      const myId = await getProfileIdByUid(req.decodedFirebaseToken.uid);
      if (!myId) {
        res.send([]);
        return;
      }
      const { data: rows } = await supabase
        .from("friendships")
        .select("requesterId, addresseeId")
        .eq("status", "ACCEPTED")
        .or(`requesterId.eq.${myId},addresseeId.eq.${myId}`);
      const ids = [
        myId,
        ...(rows ?? []).map((r) =>
          r.requesterId === myId ? r.addresseeId : r.requesterId
        ),
      ];
      const { data, error } = await supabase
        .from("profiles")
        .select(cols)
        .in("id", ids)
        .order(ratingCol, { ascending: false })
        .limit(limit);
      if (error) throw error;
      res.send(data || []);
      return;
    }

    // Global: top humans worldwide. Exclude bots at the query level so the
    // ranking is humans only and a full list is returned.
    const { data, error } = await supabase
      .from("profiles")
      .select(cols)
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
