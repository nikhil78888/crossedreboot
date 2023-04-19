import admin from "firebase-admin";
import fs from "fs/promises";
import path from "path";

const serviceAccount = require("./crossed-live-firebase-adminsdk-2upwl-5dd2a10c36.json");

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = app.firestore();

const getIpuzFiles = async () => {
  const dirname = `${__dirname}/data`;
  const files = await fs.readdir(dirname);
  const ipuzFiles = files.filter((file) => path.extname(file) === ".ipuz");
  return ipuzFiles.map((ipuzFile) => `${dirname}/${ipuzFile}`);
};

const uploadPuzzles = async () => {
  const ipuzFiles = await getIpuzFiles();
  for (let i = 0; i < ipuzFiles.length; i += 1) {
    const ipuzFile = ipuzFiles[i];
    const fileData = await fs.readFile(ipuzFile, "utf-8");
    const puzzleJSON = JSON.parse(fileData);
    const existingDoc = await db
      .collection("crosswords")
      .where("puzzle", "==", JSON.stringify(puzzleJSON.puzzle))
      .get();
    if (!existingDoc?.docs?.[0]?.data()) {
      await db.collection("crosswords").add({
        ...puzzleJSON,
        puzzle: JSON.stringify(puzzleJSON.puzzle),
        solution: JSON.stringify(puzzleJSON.solution),
        clues: {
          Across: JSON.stringify(puzzleJSON.clues.Across),
          Down: JSON.stringify(puzzleJSON.clues.Down),
        },
      });
    }
  }
};

uploadPuzzles();
