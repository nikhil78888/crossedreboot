// /api/auth

import express, { Router } from "express";
import { z } from "zod";
import { validate } from "../lib/validate.middleware";
import createHttpError from "http-errors";
import * as jose from "jose";
import { apiConfig } from "../api-config";
import { TextEncoder } from "util";

export const authRouter: Router = express.Router();

const loginWithFirebaseTokenRequestSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({}),
});

// returns a new supabase token for the user
// authenticated by firebase idToken
authRouter.get<
  Record<string, never>,
  { supabaseToken: string },
  Record<string, never>,
  Record<string, never>
>(
  "/supabase-token",
  validate(loginWithFirebaseTokenRequestSchema),
  async (req, res, next) => {
    try {
      try {
        const secret = new TextEncoder().encode(apiConfig.supabaseJwtSecret);
        const supabaseToken = await new jose.SignJWT({
          exp: req.decodedFirebaseToken.exp,
          sub: req.decodedFirebaseToken.sub,
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
