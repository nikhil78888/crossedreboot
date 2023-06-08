// /api/auth

import express, { Router } from "express";
import { z } from "zod";
import { validate } from "../validate.middleware";
import { firebaseAdminApp } from "../firebase";
import createHttpError from "http-errors";
import * as jose from "jose";
import { apiConfig } from "../api-config";
import { TextEncoder } from "util";

export const authRouter: Router = express.Router();

const loginWithFirebaseTokenRequestSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({
    firebaseToken: z.string({ required_error: "Firebase token is required." }),
  }),
});

authRouter.post<
  Record<string, never>,
  { supabaseToken: string },
  { firebaseToken: string },
  Record<string, never>
>(
  "/login-with-firebase-token",
  validate(loginWithFirebaseTokenRequestSchema),
  async (req, res, next) => {
    const { firebaseToken } = req.body;
    try {
      try {
        const decodedIdToken = await firebaseAdminApp
          .auth()
          .verifyIdToken(firebaseToken);
        console.log({ decodedIdToken });
        const secret = new TextEncoder().encode(apiConfig.supabaseJwtSecret);
        const supabaseToken = await new jose.SignJWT({
          exp: decodedIdToken.exp,
          sub: decodedIdToken.sub,
          role: "authenticated",
          user_metadata: null,
          app_metadata: null,
        })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setAudience("authenticated")
          .sign(secret);
        res.send({ supabaseToken });
      } catch (error: any) {
        if (error.code === "auth/id-token-expired") {
          throw createHttpError(400, error, {
            message: error.message,
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      next(error);
    }
  }
);
