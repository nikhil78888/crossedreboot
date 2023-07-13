import admin from "firebase-admin";
import { apiConfig } from "../api-config";

export const firebaseAdminApp = admin.initializeApp({
  credential: admin.credential.cert(apiConfig.firebaseServiceAccount),
});
