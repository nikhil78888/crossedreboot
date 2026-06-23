// Seed the wordClues table from the hand-authored curated bank, so clue
// resolution (never-repeat) can pick an unseen clue per word at game time.
//
//   node scripts/seed-word-clues.mjs            # upsert all (word, clue) pairs
//   node scripts/seed-word-clues.mjs --dry-run  # just count, don't write
import fs from "fs";
import path from "path";
import CURATED from "./curated-words.mjs";
import CURATED_HARD from "./curated-words-hard.mjs";

const envText = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const SUPABASE_URL = env.SUPABASE_URL;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: SR,
  Authorization: `Bearer ${SR}`,
  "Content-Type": "application/json",
};

const DRY = process.argv.includes("--dry-run");

// Flatten a bank to unique (word, clue) rows tagged with a difficulty.
const pairs = [];
const seen = new Set();
const addBank = (bank, difficulty) => {
  for (const len of Object.keys(bank)) {
    for (const [word, value] of Object.entries(bank[len])) {
      const clues = Array.isArray(value) ? value : [value];
      for (const clue of clues) {
        const k = `${word}|||${clue}`;
        if (clue && !seen.has(k)) {
          seen.add(k);
          pairs.push({ word, clue, difficulty });
        }
      }
    }
  }
};
addBank(CURATED, "REGULAR");
addBank(CURATED_HARD, "HARD");

console.log(`Prepared ${pairs.length} unique (word, clue) pairs.`);
if (DRY) {
  console.log("Dry run — nothing written.");
  process.exit(0);
}

// Upsert in batches, ignoring duplicates on (word, clue).
const BATCH = 500;
(async () => {
  let done = 0;
  for (let i = 0; i < pairs.length; i += BATCH) {
    const batch = pairs.slice(i, i + BATCH);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/wordClues?on_conflict=word,clue`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(batch),
      }
    );
    if (!res.ok) throw new Error(`insert failed ${res.status}: ${await res.text()}`);
    done += batch.length;
    console.log(`  upserted ${done}/${pairs.length}`);
  }
  console.log(`Done. Seeded ${done} word/clue pairs into wordClues.`);
})();
