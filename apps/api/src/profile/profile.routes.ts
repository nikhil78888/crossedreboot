// /api/profile

import express, { Router } from "express";
import { supabase } from "../lib/supabase";

export const profileRouter: Router = express.Router();

profileRouter.get("/online", async (req, res, next) => {
  try {
    const statusChannel = supabase.channel("online-status");
    statusChannel
      .on("presence", { event: "sync" }, () => {
        const state = statusChannel.presenceState();
        console.log({ state });
        res.send(state);
        statusChannel.unsubscribe();
      })
      .subscribe();
  } catch (error) {
    next(error);
  }
});
