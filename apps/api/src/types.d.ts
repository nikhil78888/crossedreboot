import { Request } from "express";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";

declare module "express-serve-static-core" {
  export interface Request {
    decodedFirebaseToken: DecodedIdToken;
  }
}
