import express, { Router } from "express";
import { authRouter } from "./auth/auth.routes";
import { profileRouter } from "./profile/profile.routes";

export const apiRouter: Router = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/profiles", profileRouter);
