import express, { NextFunction, Request, Response, Router } from "express";
import { authRouter } from "./auth/auth.routes";
import { profileRouter } from "./profile/profile.routes";
import { gameRouter } from "./game/game.routes";
import { firebaseAdminApp } from "./lib/firebase";

export const apiRouter: Router = express.Router();

// middleware for authentication firebase idToken
// in the request header.
const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const idToken = authHeader.split(" ")[1];
    firebaseAdminApp
      .auth()
      .verifyIdToken(idToken)
      .then(function (decodedToken) {
        req.decodedFirebaseToken = decodedToken;
        return next();
      })
      .catch(function (error) {
        console.log(error);
        return res.sendStatus(403);
      });
  } else {
    res.sendStatus(401);
  }
};

apiRouter.use(authenticateJWT);

apiRouter.use("/auth", authRouter);
apiRouter.use("/profiles", profileRouter);
apiRouter.use("/games", gameRouter);
