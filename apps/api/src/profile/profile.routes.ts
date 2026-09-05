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

// A single player's global standing for a variant — works even when they're far
// outside the top 100. rank = (players rated strictly above them) + 1, over the
// same "has actually played" population as the board above. Public, keyed by the
// caller's own profileId (rank isn't sensitive).
profileRouter.get("/rank", async (req, res, next) => {
  try {
    const profileId = req.query.profileId as string;
    if (!profileId) {
      res.status(400).send("profileId required");
      return;
    }
    const fields = ratingFieldsFor(req.query.variant as string | undefined);
    const ratingCol = fields.rating;
    const rdCol = fields.rd;

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select(`username, avatar, ${ratingCol}, ${rdCol}`)
      .eq("id", profileId)
      .single();
    if (meErr || !me) {
      res.status(404).send("profile not found");
      return;
    }
    const myRow = me as unknown as Record<string, number>;
    const myRating = myRow[ratingCol];
    const myRd = myRow[rdCol];
    // Same "off the defaults = has played" test the board uses.
    const hasPlayed = myRating !== 1000 || myRd !== 350;

    // Total ranked players (the denominator: "#12 of 3,481").
    const { count: total } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("type", "BOT")
      .or(`${ratingCol}.neq.1000,${rdCol}.neq.350`);

    let rank: number | null = null;
    if (hasPlayed) {
      const { count: above } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .neq("type", "BOT")
        .or(`${ratingCol}.neq.1000,${rdCol}.neq.350`)
        .gt(ratingCol, myRating);
      rank = (above || 0) + 1;
    }

    res.send({
      rank, // null = not yet ranked (hasn't played a ranked match)
      total: total || 0,
      eloRating: myRating,
      username: (me as { username: string }).username,
      avatar: (me as { avatar: string | null }).avatar,
      hasPlayed,
    });
  } catch (error) {
    next(error);
  }
});
