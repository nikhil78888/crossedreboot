import { parse, transform } from "csv/sync";
import { stringify } from "csv";
import fs, { readFileSync } from "fs";

const processFile = async (fileName: string, delimiter = ",") => {
  const fileContents = readFileSync(fileName);
  const rawRecords = parse(fileContents, { columns: true, delimiter });
  const processedRecords = transform(rawRecords, (data) => {
    if (data.answer) {
      return JSON.stringify({
        word: data.answer,
        clue: data.clue || "",
        score: data.score || "",
      });
    }
    return JSON.stringify({});
  });
  return processedRecords;
};

const addWords = (newList: string[], prevList: string[], label: string) => {
  console.log(`adding ${label}`);
  console.log(`words before ${label}: ${prevList.length}`);
  console.log(`words in ${label}: ${newList.length}`);
  const newUniqueSet = new Set([...newList]);
  const newUniqueList = Array.from(newUniqueSet);
  console.log(`unique within ${label}: ${newUniqueList.length}`);
  const totalUniqueSet = new Set([...prevList, ...newList]);
  const totalUniqueList = Array.from(totalUniqueSet);
  console.log(
    `uniques added by ${label}: ${totalUniqueList.length - prevList.length}`
  );
  return totalUniqueList;
};

const stats = async () => {
  const georgehoWords = await processFile(
    "data/cryptics-georgeho-org-clues.csv"
  );
  let list = addWords(georgehoWords, [], "georgehowords");
  const xdwords = await processFile("data/clues-xd.csv");
  list = addWords(xdwords, list, "xdwords");
  const xwiWords = await processFile("data/XwiWordList.csv", ";");
  list = addWords(xwiWords, list, "xwiwords");
  console.log(list.length);
};

const main = async () => {
  console.log("running main");

  const georgehoWords = await processFile(
    "data/cryptics-georgeho-org-clues.csv"
  );
  let list = addWords(georgehoWords, [], "georgehowords");
  const xdwords = await processFile("data/clues-xd.csv");
  list = addWords(xdwords, list, "xdwords");
  const xwiWords = await processFile("data/XwiWordList.csv", ";");
  list = addWords(xwiWords, list, "xwiwords");

  const wordList = list
    .map((wordString) => JSON.parse(wordString))
    .filter((wordInfo) => !!wordInfo.word);

  // write to file
  const w = fs.createWriteStream("data/all-words.csv");
  stringify(wordList, { header: true }).pipe(w);
};

main();
