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
import CURATED from "./curated-words.mjs";

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
const SIZE = parseInt(getArg("size", "5"), 10);
// Cap word length so larger grids stay fillable. 5x5 minis use up to 5; bigger
// boards cap at 5-letter words (more black squares, reliably fillable).
// Allow longer words on bigger boards — longer entries interlock better, which
// is what makes fully-checked (no single-stranded boxes) grids fillable.
const MAX_SLOT = Math.min(SIZE, 7);
// FULLY CHECKED: every white cell must cross BOTH an across and a down word — no
// single-stranded ("unchecked") squares, so every square is a real crossword
// intersection the solver can cross-reference. 0 = zero unchecked cells allowed.
const MAX_UNCHECKED = 0;
const MAX_DICT_LEN = Math.max(5, MAX_SLOT);
// Max frequency rank allowed per word length (lower = more common = easier).
// Short crossing words are the usual source of obscure "huh?" fill, so they're
// held to very common words; longer words get a little more leeway so grids
// stay fillable.
// Bigger boards need a deeper word pool to fill, so they get more leeway on
// commonness (their long answers can be slightly less common). 5x5 stays the
// strictest/easiest since it's the most-played size.
const FREQ_SIZE_FACTOR = SIZE <= 5 ? 1 : SIZE <= 7 ? 1.25 : 1.5;
const maxRankForLen = (len) =>
  Math.round(
    FREQ_SIZE_FACTOR *
      (len <= 3
        ? 9000
        : len === 4
        ? 13000
        : len === 5
        ? 18000
        : len === 6
        ? 28000
        : len === 7
        ? 42000
        : 50000)
  );
const FREQ_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt";

const rand = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- proven 5x5 patterns (1 = fillable, 0 = black). ----
const PATTERNS_5 = [
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

// ---- pattern generator for larger sizes ----
// Random 180°-symmetric black squares, validated so every white cell is in both
// an across and a down word of length 2..MAX_SLOT, and all white cells connect.
const runLen = (g, r, c, dr, dc) => {
  let n = 0,
    rr = r,
    cc = c;
  while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && g[rr][cc] === 1) {
    n++;
    rr += dr;
    cc += dc;
  }
  return n;
};

const isValidPattern = (g) => {
  let whiteCount = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] !== 1) continue;
      whiteCount++;
      const across = runLen(g, r, c, 0, 1) + runLen(g, r, c, 0, -1) - 1;
      const down = runLen(g, r, c, 1, 0) + runLen(g, r, c, -1, 0) - 1;
      // Fully checked AND min word length 3: every cell is in an across word and
      // a down word, both length 3..MAX_SLOT. (The dictionary has no 2-letter
      // words, so 2-runs are unfillable — forbidding them is what makes these
      // grids reliably fill.)
      if (across < 3 || down < 3) return false;
      if (across > MAX_SLOT || down > MAX_SLOT) return false;
    }
  }
  // connectivity
  let start = null;
  for (let r = 0; r < SIZE && !start; r++)
    for (let c = 0; c < SIZE && !start; c++) if (g[r][c] === 1) start = [r, c];
  if (!start) return false;
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const [r, c] = stack.pop();
    const k = `${r},${c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && g[nr][nc] === 1)
        stack.push([nr, nc]);
    }
  }
  return seen.size === whiteCount;
};

// All maximal white runs (across + down) as arrays of [r,c].
const allRuns = (g) => {
  const runs = [];
  for (let r = 0; r < SIZE; r++) {
    let run = [];
    for (let c = 0; c <= SIZE; c++) {
      if (c < SIZE && g[r][c] === 1) run.push([r, c]);
      else {
        if (run.length) runs.push(run);
        run = [];
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let run = [];
    for (let r = 0; r <= SIZE; r++) {
      if (r < SIZE && g[r][c] === 1) run.push([r, c]);
      else {
        if (run.length) runs.push(run);
        run = [];
      }
    }
  }
  return runs;
};

// Would turning (r,c) black keep every word length legal? Blackening a cell
// splits its across run into the whites to its left/right and its down run into
// the whites above/below; each resulting piece must be empty or length >= 3 (no
// 1- or 2-letter words). This preserves both full-checking and min-word-3.
const safeBlacken = (g, r, c) => {
  if (g[r][c] !== 1) return false;
  const run = (dr, dc) => {
    let n = 0, rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && g[rr][cc] === 1) {
      n++; rr += dr; cc += dc;
    }
    return n;
  };
  const okLen = (n) => n === 0 || n >= 3;
  return (
    okLen(run(0, -1)) && okLen(run(0, 1)) && okLen(run(-1, 0)) && okLen(run(1, 0))
  );
};

// Count fully-checked / min-3 / max-length violations across the grid (0 = a
// valid fully-checked min-3 layout, ignoring connectivity which is checked last).
const violations = (g) => {
  let v = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] !== 1) continue;
      const a = runLen(g, r, c, 0, 1) + runLen(g, r, c, 0, -1) - 1;
      const d = runLen(g, r, c, 1, 0) + runLen(g, r, c, -1, 0) - 1;
      if (a < 3 || a > MAX_SLOT) v++;
      if (d < 3 || d > MAX_SLOT) v++;
    }
  }
  return v;
};

// Hill-climb a random layout toward zero violations: seed random black squares,
// then repeatedly flip a cell if it doesn't increase violations (with occasional
// worse-accepting jitter to escape local minima). Reliably finds valid
// fully-checked min-3 grids at every size, including the tight 8x8 / 9x9.
const hillClimbPattern = () => {
  const density =
    SIZE <= 5 ? 0.1 : SIZE <= 6 ? 0.13 : SIZE <= 7 ? 0.15 : SIZE <= 8 ? 0.18 : SIZE <= 9 ? 0.2 : 0.24;
  const target = Math.round(SIZE * SIZE * density);
  for (let restart = 0; restart < 40; restart++) {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
    let placed = 0, guard = 0;
    while (placed < target && guard++ < 500) {
      const r = rand(SIZE), c = rand(SIZE);
      if (g[r][c] === 1) { g[r][c] = 0; placed++; }
    }
    let v = violations(g);
    for (let iter = 0; iter < 4000 && v > 0; iter++) {
      const r = rand(SIZE), c = rand(SIZE);
      g[r][c] = g[r][c] === 1 ? 0 : 1;
      const nv = violations(g);
      if (nv <= v || rand(100) < 4) v = nv; // accept improving / equal / rare worse
      else g[r][c] = g[r][c] === 1 ? 0 : 1; // revert
    }
    if (v === 0 && isValidPattern(g)) return g;
  }
  return null;
};

// Find a set of distinct valid layouts once, then reuse them across puzzles (the
// fill + clue-resolver provide the variety). This is far faster and more reliable
// than searching for a fresh layout per puzzle.
let TEMPLATES = null;
const generatePattern = () => {
  if (!TEMPLATES) {
    TEMPLATES = [];
    const want = SIZE <= 6 ? 10 : 18;
    const seen = new Set();
    for (let t = 0; t < want * 60 && TEMPLATES.length < want; t++) {
      const g = hillClimbPattern();
      if (!g) continue;
      const key = JSON.stringify(g);
      if (seen.has(key)) continue;
      seen.add(key);
      TEMPLATES.push(g);
    }
    console.log(`  built ${TEMPLATES.length} fully-checked layout templates`);
  }
  if (!TEMPLATES.length) return null;
  return TEMPLATES[rand(TEMPLATES.length)].map((row) => row.slice());
};

// English dictionary headwords (lowercase common words, basically no modern
// proper nouns) -> used to exclude name/place answers like ALF, ELENA, SALEM
// that always end up with trivia clues.
const WEBSTER_URL =
  "https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary_compact.json";
async function loadDictionaryWords() {
  const d = await (await fetch(WEBSTER_URL)).json();
  const set = new Set();
  for (const k of Object.keys(d)) {
    const w = k.trim().toUpperCase();
    if (/^[A-Z]+$/.test(w)) set.add(w);
  }
  return set;
}

// Frequency list -> Map(UPPERCASE word -> rank). Lower rank = more common.
async function loadFreq() {
  const txt = await (await fetch(FREQ_URL)).text();
  const rank = new Map();
  txt.split("\n").forEach((line, i) => {
    const w = (line.split(" ")[0] || "").trim().toUpperCase();
    if (w && /^[A-Z]+$/.test(w) && !rank.has(w)) rank.set(w, i);
  });
  return rank;
}

// Strip a trailing cryptic enumeration like " (5)" or " (4-3)" so the clue
// reads as a plain definition.
const stripClue = (clue) =>
  (clue || "").replace(/\s*\(\d[\d,\-\s]*\)\s*$/g, "").trim();

// Lower = simpler/more approachable. Penalize cryptic hallmarks (long, wordy,
// puns, multi-clause, fill-in-the-blank) AND trivia: a clue that references an
// uncommon/proper-noun word ("Aeneid queen", "Author Jong", "Plato on TV") is
// hard even when the answer is common, so we penalize any clue word that isn't
// itself common.
const TRIVIA_WORD_RANK = 25000;
const clueScore = (clue, freqRank) => {
  let s = clue.length;
  const words = clue.split(/\s+/).length;
  if (words === 1) s += 14; // prefer a little context over a lone synonym
  if (words > 6) s += (words - 6) * 10;
  if (/\?\s*$/.test(clue)) s += 25;
  if (/[;:]/.test(clue)) s += 20;
  if (/[,]/.test(clue)) s += 6;
  if (/_/.test(clue)) s += 30; // fill-in-the-blank, often pop-culture
  const cw = clue.toLowerCase().match(/[a-z]+/g) || [];
  for (const w of cw) {
    if (w.length <= 2) continue; // skip stopwords (a, of, on, to, in, etc.)
    const r = freqRank.get(w.toUpperCase());
    if (r === undefined || r > TRIVIA_WORD_RANK) s += 45;
  }
  return s;
};
// A word is only kept if it has at least one clue this clean.
const MAX_CLUE_SCORE = 24;

// Never allow offensive/slur/adult/crude words in the fill (the frequency list
// and dictionary include some). Block-list + a couple of stem checks.
const BLOCKLIST = new Set([
  "NEGRO", "COON", "SPIC", "KIKE", "WOP", "DAGO", "GOOK", "CHINK", "WETBACK",
  "FAG", "FAGS", "DYKE", "TRANNY", "RETARD", "SPAZ", "CRIPPLE",
  "ANAL", "ANUS", "SEX", "SEXY", "SEXED", "NUDE", "NUDES", "NAKED", "PORN",
  "PENIS", "VAGINA", "BOOB", "BOOBS", "BUTT", "TITS", "TIT", "ARSE", "ASS",
  "CRAP", "CRAPS", "DAMN", "DAMNS", "HELL", "PISS", "TURD", "SCUM", "SLUT",
  "WHORE", "RAPE", "RAPED", "RAPES", "KILL", "KILLS", "DEAD", "DIES", "DYING",
  "DRUG", "DRUGS", "WEED", "DOPE", "OPIUM", "BOMB", "GUNS",
]);
const isBlocked = (w) => BLOCKLIST.has(w);

// Build the dictionary from COMMON words only (frequency-ranked), pulling each
// word's clue from the DB. This is the fix for "puzzles too hard": answers are
// now recognizable everyday words instead of obscure cryptic-crossword fill.
// Dictionary = ONLY the hand-authored curated bank (original clues). No DB
// clues, so no cryptic clues, no cross-references ("See 56"), no offensive
// words. Small but vetted; the layout engine uses sparser patterns so these
// fully-checked grids still fill.
// The dictionary is now the big harvested wordClues bank (thousands of common
// words with real clues) UNIONED with the hand-curated bank, filtered to COMMON
// words via the frequency list so fill stays approachable. This depth is what
// makes fully-checked grids fillable at every size. A word may carry several
// clues (array) — the generator picks one per puzzle and the serve-time resolver
// still swaps in unseen ones.
function loadDict(freqRank, dictWords) {
  const bank = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "scripts/wordclues-bank.json"), "utf8")
  );
  // hand-curated clues (best quality, always trusted)
  const curatedClue = {};
  for (let len = 3; len <= MAX_DICT_LEN; len++)
    for (const [w, clue] of Object.entries(CURATED[len] || {}))
      curatedClue[w.toUpperCase()] = clue;
  const curatedSet = new Set(Object.keys(curatedClue));

  const dict = {};
  for (let len = 3; len <= MAX_DICT_LEN; len++) dict[len] = [];
  const seen = new Set();
  const add = (word, rawClues) => {
    const w = word.toUpperCase();
    const len = w.length;
    if (len < 3 || len > MAX_DICT_LEN || seen.has(w)) return;
    if (!/^[A-Z]+$/.test(w) || isBlocked(w)) return;
    const isCurated = curatedSet.has(w);
    // Must be a real dictionary headword (excludes proper nouns / abbreviations
    // like ONO, EDO, ODA, ISO) — curated words are pre-vetted and exempt.
    if (!isCurated && !dictWords.has(w)) return;
    const rank = freqRank.get(w);
    if (!isCurated && (rank === undefined || rank > maxRankForLen(len))) return;
    let clues;
    if (isCurated) {
      clues = curatedClue[w]; // trust the hand-authored clue(s)
    } else {
      // keep only clean, non-trivia, non-cryptic clues
      clues = (Array.isArray(rawClues) ? rawClues : [rawClues])
        .map(stripClue)
        .filter((c) => c && clueScore(c, freqRank) <= MAX_CLUE_SCORE);
      if (!clues.length) return; // no clean clue -> drop the word
    }
    seen.add(w);
    dict[len].push({ word: w, clue: clues });
  };
  // wordClues bank (curated words picked up here get their curated clue)
  for (const [w, v] of Object.entries(bank))
    add(w, v.REGULAR && v.REGULAR.length ? v.REGULAR : v.HARD);
  // add any curated words the bank missed
  for (const w of curatedSet) add(w, curatedClue[w]);
  for (let len = 3; len <= MAX_DICT_LEN; len++)
    console.log(`  dict[${len}] = ${dict[len].length} clean words`);
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

// Index words by (length, position, letter) so candidate lookups don't scan the
// whole dictionary every step — this is what makes 7x7+ grids fillable.
function buildIndex(dict) {
  const index = {};
  for (const len of Object.keys(dict)) {
    const m = {};
    for (const entry of dict[len]) {
      for (let i = 0; i < entry.word.length; i++) {
        const key = `${i}:${entry.word[i]}`;
        (m[key] ||= []).push(entry);
      }
    }
    index[len] = m;
  }
  return index;
}

// ---- backtracking fill ----
function fillGrid(pattern, dict, index) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const slots = getSlots(pattern);
  const usedWords = new Set();
  let backtracks = 0;
  const MAX_BACKTRACKS =
    SIZE >= 10 ? 3000000 : SIZE >= 8 ? 200000 : SIZE >= 7 ? 120000 : SIZE >= 6 ? 80000 : 60000;

  const candidates = (slot) => {
    const len = slot.cells.length;
    const fixed = [];
    slot.cells.forEach(([r, c], i) => {
      if (grid[r][c]) fixed.push([i, grid[r][c]]);
    });
    let pool;
    if (fixed.length === 0) {
      pool = dict[len] || [];
    } else {
      // start from the smallest indexed list among the fixed letters
      let smallest = null;
      for (const [p, ch] of fixed) {
        const list = (index[len] && index[len][`${p}:${ch}`]) || [];
        if (smallest === null || list.length < smallest.length) smallest = list;
      }
      pool = smallest || [];
      if (fixed.length > 1) {
        pool = pool.filter((e) => fixed.every(([p, ch]) => e.word[p] === ch));
      }
    }
    const out = [];
    for (const e of pool) if (!usedWords.has(e.word)) out.push(e);
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
    const wide = SIZE >= 10;
    for (const entry of shuffle(bestCands.slice(0, wide ? 500 : 150)).slice(0, wide ? 140 : 50)) {
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

  // clue lookup by word. A word may have several clues in the bank — pick one
  // at random so the same answer varies across puzzles.
  const clueOf = (word) => {
    const pool = dict[word.length] || [];
    const hit = pool.find((e) => e.word === word);
    if (!hit) return null;
    return Array.isArray(hit.clue) ? hit.clue[rand(hit.clue.length)] : hit.clue;
  };

  const clues = { Across: [], Down: [] };
  const used = new Set(); // distinct answer words, for per-user repeat spacing
  // across words
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (pattern[r][c] && (c === 0 || !pattern[r][c - 1]) && c + 1 < SIZE && pattern[r][c + 1]) {
        let word = "";
        let cc = c;
        while (cc < SIZE && pattern[r][cc]) word += grid[r][cc++];
        used.add(word.toUpperCase());
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
        used.add(word.toUpperCase());
        clues.Down.push({ number: String(numberAt[`${r},${c}`]), clue: clueOf(word) });
      }
    }
  }
  // a "great" puzzle must have a clue for every word
  const allClued = [...clues.Across, ...clues.Down].every((x) => x.clue);
  return { puzzle, solution, clues, allClued, usedWords: [...used] };
}

async function insertPuzzle(p) {
  const body = JSON.stringify({
    size: SIZE,
    puzzle: p.puzzle,
    solution: p.solution,
    clues: p.clues,
    usedWords: p.usedWords,
    source: "fullchecked-v1",
    difficulty: 2,
    isPublished: true,
    category: "general",
  });
  // Retry transient network/5xx errors so a single blip doesn't kill a long run.
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/crosswords`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body,
      });
      if (res.ok) return;
      if (res.status < 500) throw new Error(`insert failed ${res.status}: ${await res.text()}`);
      lastErr = new Error(`insert ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  throw lastErr;
}

// ---- main ----
(async () => {
  console.log("Loading frequency + dictionary…");
  const [freqRank, dictWords] = await Promise.all([
    loadFreq(),
    loadDictionaryWords(),
  ]);
  console.log("Loading word/clue bank…");
  const dict = loadDict(freqRank, dictWords);
  const index = buildIndex(dict);
  let made = 0, attempts = 0;
  const seen = new Set(); // dedupe identical grids
  const attemptCap = COUNT * (SIZE >= 8 ? 400 : SIZE >= 6 ? 300 : 200);
  while (made < COUNT && attempts < attemptCap) {
    attempts++;
    const pattern = generatePattern();
    if (!pattern) continue;
    const filled = fillGrid(pattern, dict, index);
    if (!filled) continue;
    const p = buildPuzzle(pattern, filled.grid, dict);
    if (!p.allClued) continue; // skip puzzles missing any clue
    const key = JSON.stringify(p.solution);
    if (seen.has(key)) continue; // skip duplicates
    seen.add(key);
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
