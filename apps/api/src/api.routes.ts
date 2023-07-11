import express, { Router } from "express";
import { authRouter } from "./auth/auth.routes";
import { profileRouter } from "./profile/profile.routes";
import { crosswordRouter } from "./crossword/crossword.routes";
import { gameRouter } from "./game/game.routes";

export const apiRouter: Router = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/profiles", profileRouter);
apiRouter.use("/crosswords", crosswordRouter);
apiRouter.use("/games", gameRouter);
