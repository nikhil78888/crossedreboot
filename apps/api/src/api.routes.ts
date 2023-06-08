import express, { Router } from "express";
import { authRouter } from "./auth/auth.routes";

export const apiRouter: Router = express.Router();

apiRouter.use("/auth", authRouter);
