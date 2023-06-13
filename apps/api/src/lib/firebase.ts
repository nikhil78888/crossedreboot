import admin from "firebase-admin";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require("../../crossed-live-firebase-adminsdk-2upwl-5dd2a10c36.json");

export const firebaseAdminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
