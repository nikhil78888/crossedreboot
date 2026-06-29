// Seed/extend the trivia_evals training set (parallel to the clue evals).
// Logs approved exemplars + denied/weak questions with reasoning, so future
// trivia authoring is calibrated. Idempotent-ish: skips a row if an identical
// (question, verdict) already exists.
//
// Usage:  node scripts/trivia-evals.mjs
//
import fs from "fs";
import path from "path";

const envText = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
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

// verdict: "approved" (a good question) | "denied" (a mistake to learn from).
const EVALS = [
  // --- Denied: contestable/ambiguous facts caught reviewing the launch bank ---
  {
    question: "Which river is the longest in the world?",
    answer: "Nile",
    category: "Geography",
    difficulty: "hard",
    verdict: "denied",
    reasoning:
      "Disputed fact — Amazon vs Nile has no uncontested answer, so multiple choices are defensible. Avoid questions whose 'correct' answer is debated. Replaced with 'largest hot desert on Earth' -> Sahara.",
  },
  {
    question: "What was the first feature-length animated film?",
    answer: "Snow White and the Seven Dwarfs",
    category: "Entertainment",
    difficulty: "hard",
    verdict: "denied",
    reasoning:
      "Incorrect/ambiguous — El Apostol (1917) predates Snow White (1937); 'first feature-length animated film' has no clean answer. Scope it: 'Disney's first full-length animated film' -> Snow White.",
  },
  // --- Approved exemplars: clean single answer, plausible distractors ---
  {
    question: "How many bones are in the adult human body?",
    answer: "206",
    category: "Science",
    difficulty: "medium",
    verdict: "approved",
    reasoning:
      "Single uncontested fact; numeric distractors are close enough to require real recall. Good medium.",
  },
  {
    question: "Which country has won the most FIFA World Cups?",
    answer: "Brazil",
    category: "Sports",
    difficulty: "hard",
    verdict: "approved",
    reasoning:
      "Unambiguous (Brazil, 5). Distractors are all real contenders (Germany/Italy/Argentina) so it isn't a giveaway. Good hard.",
  },
  {
    question: "What gas do plants primarily absorb from the air?",
    answer: "Carbon dioxide",
    category: "Science",
    difficulty: "easy",
    verdict: "approved",
    reasoning:
      "Common knowledge, one clear answer, distractors are other real gases. Good easy.",
  },
  // --- Calibration rule (the standard to author/grade against) ---
  {
    question: "(calibration rule)",
    answer: null,
    category: "_meta",
    difficulty: null,
    verdict: "approved",
    reasoning:
      "Trivia rules: exactly ONE defensible correct choice; no disputed/contested facts; 3 plausible distractors (real, same category) so it's not a giveaway. Difficulty: easy = common knowledge, medium = some recall, hard = precise/specialist. Keep wording unambiguous (scope vague superlatives like 'first/biggest').",
  },
];

const run = async () => {
  // Skip duplicates of (question, verdict).
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trivia_evals?select=question,verdict`,
    { headers }
  );
  const existing = existingRes.ok ? await existingRes.json() : [];
  const seen = new Set(existing.map((r) => `${r.question}::${r.verdict}`));
  const toInsert = EVALS.filter(
    (e) => !seen.has(`${e.question}::${e.verdict}`)
  );
  if (!toInsert.length) {
    console.log("trivia_evals: nothing new to insert.");
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/trivia_evals`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(toInsert),
  });
  console.log(
    res.ok
      ? `Inserted ${toInsert.length} trivia evals.`
      : `Insert failed (${res.status}): ${await res.text()}`
  );
};

run().catch((e) => console.error(e));
