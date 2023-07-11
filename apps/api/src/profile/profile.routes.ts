// /api/profile

import express, { Router } from "express";
import { getUsersInLobby } from "./profile.service";

export const profileRouter: Router = express.Router();

profileRouter.get("/online", async (req, res, next) => {
  try {
    const users = await getUsersInLobby();
    res.send(users);
  } catch (error) {
    next(error);
  }
});
