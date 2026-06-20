// Local 5x5 mini-crossword generator.
//
// Why this exists: the previous grid generator (an external Replit service) is
// dead, so no new puzzles could be made. This replaces it with a local
// backtracking word-fill that uses the `words` table (which already has clues
// + a quality `score`) as its dictionary — no OpenAI needed.
//
// Usage:
//   node scripts/generate-puzzles.mjs --count 5 --dry-run   # print, don't insert
//   node scripts/generate-puzzles.mjs --count 100           # generate + insert
//
import fs from "fs";
import path from "path";

// ---- env ----
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
if (!SUPABASE_URL || !SR) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env");
const headers = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const COUNT = parseInt(getArg("count", "5"), 10);
const DRY_RUN = args.includes("--dry-run");
const SIZE = 5;

// ---- 5x5 patterns (1 = fillable, 0 = black). Rotationally symmetric. ----
// A mix keeps the batch varied; black squares create shorter slots that fill
// reliably and read like real NYT minis.
const PATTERNS = [
  [
    [0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0],
  ],
  [
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1],
  ],
  [
    [0, 0, 1, 1, 1],
    [0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0],
    [1, 1, 1, 0, 0],
  ],
];

// ---- dictionary ----
const rand = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

async function loadDict() {
  const dict = {}; // length -> [{word, clue}]
  for (const len of [3, 4, 5]) {
    const url =
      `${SUPABASE_URL}/rest/v1/words?select=word,clue,score` +
      `&wordLength=eq.${len}&clue=not.is.null&order=score.desc.nullslast&limit=12000`;
    const rows = await (await fetch(url, { headers })).json();
    const seen = new Set();
    dict[len] = [];
    for (const r of rows) {
      const w = (r.word || "").toUpperCase();
      if (w.length !== len || !/^[A-Z]+$/.test(w) || seen.has(w)) continue;
      const clue = (r.clue || "").trim();
      // quality filter: drop malformed/cryptic/self-revealing clues
      if (clue.length < 4) continue;
      if (/\(\d+\)\s*$/.test(clue)) continue; // cryptic length suffix e.g. "(3)"
      if (/^[^A-Za-z0-9"'¿]/.test(clue)) continue; // starts with stray punctuation
      if (clue.toUpperCase().includes(w)) continue; // clue gives away the answer
      seen.add(w);
      dict[len].push({ word: w, clue });
    }
    console.log(`  dict[${len}] = ${dict[len].length} words`);
  }
  return dict;
}

// ---- slots from a pattern ----
function getSlots(pattern) {
  const slots = [];
  // across
  for (let r = 0; r < SIZE; r++) {
    let c = 0;
    while (c < SIZE) {
      if (pattern[r][c]) {
        const cells = [];
        while (c < SIZE && pattern[r][c]) cells.push([r, c++]);
        if (cells.length >= 2) slots.push({ dir: "A", cells });
      } else c++;
    }
  }
  // down
  for (let c = 0; c < SIZE; c++) {
    let r = 0;
    while (r < SIZE) {
      if (pattern[r][c]) {
        const cells = [];
        while (r < SIZE && pattern[r][c]) cells.push([r++, c]);
        if (cells.length >= 2) slots.push({ dir: "D", cells });
      } else r++;
    }
  }
  return slots;
}

// ---- backtracking fill ----
function fillGrid(pattern, dict) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const slots = getSlots(pattern);
  const usedWords = new Set();
  let backtracks = 0;
  const MAX_BACKTRACKS = 20000;

  const currentPattern = (slot) =>
    slot.cells.map(([r, c]) => grid[r][c] || ".").join("");

  const candidates = (slot) => {
    const pat = currentPattern(slot);
    const pool = dict[slot.cells.length] || [];
    const out = [];
    for (const entry of pool) {
      if (usedWords.has(entry.word)) continue;
      let ok = true;
      for (let i = 0; i < pat.length; i++) {
        if (pat[i] !== "." && pat[i] !== entry.word[i]) { ok = false; break; }
      }
      if (ok) out.push(entry);
    }
    return out;
  };

  const solve = (remaining) => {
    if (remaining.length === 0) return true;
    if (backtracks > MAX_BACKTRACKS) return false;
    // MRV: choose the slot with the fewest candidates
    let best = null, bestCands = null;
    for (const slot of remaining) {
      const cands = candidates(slot);
      if (cands.length === 0) return false; // dead end
      if (!bestCands || cands.length < bestCands.length) {
        best = slot; bestCands = cands;
        if (cands.length === 1) break;
      }
    }
    const rest = remaining.filter((s) => s !== best);
    // bestCands is already sorted by score (common words first). Bias toward
    // the top so puzzles use common words, but shuffle within the top band for
    // variety across runs.
    for (const entry of shuffle(bestCands.slice(0, 150)).slice(0, 50)) {
      const saved = best.cells.map(([r, c]) => grid[r][c]);
      best.cells.forEach(([r, c], i) => (grid[r][c] = entry.word[i]));
      usedWords.add(entry.word);
      if (solve(rest)) return true;
      best.cells.forEach(([r, c], i) => (grid[r][c] = saved[i]));
      usedWords.delete(entry.word);
      backtracks++;
    }
    return false;
  };

  const ok = solve(shuffle(slots.slice()));
  return ok ? { grid, slots } : null;
}

// ---- build the puzzle/solution/clues payload in the app's format ----
function buildPuzzle(pattern, grid, dict) {
  // number the cells: a cell starts a word if it's fillable and (no fillable
  // cell to the left -> across start) or (none above -> down start)
  const numberAt = {};
  let n = 0;
  const puzzle = Array.from({ length: SIZE }, () => Array(SIZE).fill("#"));
  const solution = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!pattern[r][c]) continue;
      solution[r][c] = grid[r][c];
      const startsAcross = (c === 0 || !pattern[r][c - 1]) && c + 1 < SIZE && pattern[r][c + 1];
      const startsDown = (r === 0 || !pattern[r - 1][c]) && r + 1 < SIZE && pattern[r + 1][c];
      if (startsAcross || startsDown) {
        n += 1;
        numberAt[`${r},${c}`] = n;
        puzzle[r][c] = String(n);
      } else {
        puzzle[r][c] = "0";
      }
    }
  }

  // clue lookup by word
  const clueOf = (word) => {
    const pool = dict[word.length] || [];
    const hit = pool.find((e) => e.word === word);
    return hit ? hit.clue : null;
  };

  const clues = { Across: [], Down: [] };
  // across words
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (pattern[r][c] && (c === 0 || !pattern[r][c - 1]) && c + 1 < SIZE && pattern[r][c + 1]) {
        let word = "";
        let cc = c;
        while (cc < SIZE && pattern[r][cc]) word += grid[r][cc++];
        clues.Across.push({ number: String(numberAt[`${r},${c}`]), clue: clueOf(word) });
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r < SIZE; r++) {
      if (pattern[r][c] && (r === 0 || !pattern[r - 1][c]) && r + 1 < SIZE && pattern[r + 1][c]) {
        let word = "";
        let rr = r;
        while (rr < SIZE && pattern[rr][c]) word += grid[rr++][c];
        clues.Down.push({ number: String(numberAt[`${r},${c}`]), clue: clueOf(word) });
      }
    }
  }
  // a "great" puzzle must have a clue for every word
  const allClued = [...clues.Across, ...clues.Down].every((x) => x.clue);
  return { puzzle, solution, clues, allClued };
}

async function insertPuzzle(p) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/crosswords`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      size: SIZE,
      puzzle: p.puzzle,
      solution: p.solution,
      clues: p.clues,
      source: "wizium",
      difficulty: 2,
      isPublished: true,
      category: "general",
    }),
  });
  if (!res.ok) throw new Error(`insert failed ${res.status}: ${await res.text()}`);
}

// ---- main ----
(async () => {
  console.log("Loading dictionary…");
  const dict = await loadDict();
  let made = 0, attempts = 0;
  while (made < COUNT && attempts < COUNT * 30) {
    attempts++;
    const pattern = PATTERNS[rand(PATTERNS.length)];
    const filled = fillGrid(pattern, dict);
    if (!filled) continue;
    const p = buildPuzzle(pattern, filled.grid, dict);
    if (!p.allClued) continue; // skip puzzles missing any clue
    made++;
    if (DRY_RUN) {
      console.log(`\n--- puzzle ${made} ---`);
      console.log(filled.grid.map((row) => row.map((x) => x || "·").join(" ")).join("\n"));
      console.log("Across:", p.clues.Across.map((a) => `${a.number}. ${a.clue}`).join(" | "));
      console.log("Down:  ", p.clues.Down.map((a) => `${a.number}. ${a.clue}`).join(" | "));
    } else {
      await insertPuzzle(p);
      if (made % 10 === 0) console.log(`  inserted ${made}/${COUNT}`);
    }
  }
  console.log(`\nDone. Generated ${made} puzzles in ${attempts} attempts${DRY_RUN ? " (dry run, nothing inserted)" : " and inserted them"}.`);
})();
