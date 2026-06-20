import express, { NextFunction, Request, Response, Router } from "express";
import { authRouter } from "./auth/auth.routes";
import { profileRouter } from "./profile/profile.routes";
import { gameRouter } from "./game/game.routes";
import { firebaseAdminApp } from "./lib/firebase";
import { crosswordRouter } from "./crossword/crossword.routes";
import { tournamentRouter } from "./tournament/tournament.routes";

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
        return res.status(403).send();
      });
  } else {
    res.status(401).send();
  }
};

apiRouter.use("/crosswords", crosswordRouter);
apiRouter.use("/profiles", profileRouter);

apiRouter.use(authenticateJWT);

apiRouter.use("/auth", authRouter);
apiRouter.use("/games", gameRouter);
apiRouter.use("/tournaments", tournamentRouter);
