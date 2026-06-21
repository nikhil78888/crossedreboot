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
const SIZE = parseInt(getArg("size", "5"), 10);
// Cap word length so larger grids stay fillable. 5x5 minis use up to 5; bigger
// boards cap at 5-letter words (more black squares, reliably fillable).
// Allow longer words on bigger boards — longer entries interlock better, which
// is what makes fully-checked (no single-stranded boxes) grids fillable.
const MAX_SLOT = SIZE <= 5 ? SIZE : Math.min(SIZE, 7);
// No abandoned squares: every white cell must be in a word BOTH ways. 0 = fully
// interlocked, always. (This makes 8x8 effectively ungenerable with common
// words, so we don't ship 8x8.)
const MAX_UNCHECKED = 0;
const MAX_DICT_LEN = Math.max(5, MAX_SLOT);
// Max frequency rank allowed per word length (lower = more common = easier).
// Short crossing words are the usual source of obscure "huh?" fill, so they're
// held to very common words; longer words get a little more leeway so grids
// stay fillable.
// Bigger boards need a deeper word pool to fill, so they get more leeway on
// commonness (their long answers can be slightly less common). 5x5 stays the
// strictest/easiest since it's the most-played size.
const FREQ_SIZE_FACTOR = SIZE <= 5 ? 1 : SIZE <= 7 ? 1.8 : 2.6;
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
  let unchecked = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] !== 1) continue;
      whiteCount++;
      const across = runLen(g, r, c, 0, 1) + runLen(g, r, c, 0, -1) - 1;
      const down = runLen(g, r, c, 1, 0) + runLen(g, r, c, -1, 0) - 1;
      if (across < 2 && down < 2) return false; // never fully isolated/unclued
      if (across > MAX_SLOT || down > MAX_SLOT) return false;
      // a cell in a word one direction only is "unchecked" (single-stranded)
      if ((across >= 2) !== (down >= 2)) unchecked++;
    }
  }
  if (unchecked > MAX_UNCHECKED) return false;
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

const generatePattern = () => {
  if (SIZE <= 5) return PATTERNS_5[rand(PATTERNS_5.length)];
  // Fewer black squares -> more cells in both directions -> easier to keep the
  // grid fully checked.
  const density = SIZE <= 7 ? 0.12 : 0.16;
  const target = Math.round(SIZE * SIZE * density);
  for (let attempt = 0; attempt < 6000; attempt++) {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
    let placed = 0,
      guard = 0;
    while (placed < target && guard < 400) {
      guard++;
      const r = rand(SIZE),
        c = rand(SIZE);
      const r2 = SIZE - 1 - r,
        c2 = SIZE - 1 - c;
      if (g[r][c] === 1 && g[r2][c2] === 1) {
        g[r][c] = 0;
        g[r2][c2] = 0;
        placed += r === r2 && c === c2 ? 1 : 2;
      }
    }
    if (isValidPattern(g)) return g;
  }
  return null;
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
const MAX_CLUE_SCORE = 30;

// Build the dictionary from COMMON words only (frequency-ranked), pulling each
// word's clue from the DB. This is the fix for "puzzles too hard": answers are
// now recognizable everyday words instead of obscure cryptic-crossword fill.
async function loadDict(freqRank, dictionaryWords) {
  const dict = {}; // length -> [{word, clue}] ordered most-common-first
  for (let len = 3; len <= MAX_DICT_LEN; len++) {
    const common = [...freqRank.entries()]
      .filter(
        ([w, r]) =>
          w.length === len &&
          r <= maxRankForLen(len) &&
          dictionaryWords.has(w) // real word, not a proper noun
      )
      .sort((a, b) => a[1] - b[1])
      .map(([w]) => w);
    const clueOf = {};
    const clueScoreOf = {};
    for (let i = 0; i < common.length; i += 150) {
      const batch = common.slice(i, i + 150);
      const inList = batch.map((w) => `"${w}"`).join(",");
      const url =
        `${SUPABASE_URL}/rest/v1/words?select=word,clue&clue=not.is.null` +
        `&word=in.(${encodeURIComponent(inList)})`;
      const rows = await (await fetch(url, { headers })).json();
      if (!Array.isArray(rows)) continue;
      for (const r of rows) {
        const w = (r.word || "").toUpperCase();
        if (w.length !== len || !/^[A-Z]+$/.test(w)) continue;
        const clue = stripClue(r.clue);
        if (clue.length < 4) continue;
        if (/^[^A-Za-z0-9"'¿]/.test(clue)) continue; // stray punctuation start
        if (clue.toUpperCase().includes(w)) continue; // gives away the answer
        // keep the simplest (most definitional) clue for each word
        const sc = clueScore(clue, freqRank);
        if (clueScoreOf[w] === undefined || sc < clueScoreOf[w]) {
          clueOf[w] = clue;
          clueScoreOf[w] = sc;
        }
      }
    }
    dict[len] = common
      .filter((w) => clueOf[w] && clueScoreOf[w] <= MAX_CLUE_SCORE)
      .map((w) => ({ word: w, clue: clueOf[w] }));
    console.log(`  dict[${len}] = ${dict[len].length} common words`);
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
  const MAX_BACKTRACKS = SIZE >= 8 ? 200000 : SIZE >= 7 ? 100000 : 20000;

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
  console.log("Loading frequency list…");
  const freqRank = await loadFreq();
  console.log("Loading dictionary words (excluding proper nouns)…");
  const dictionaryWords = await loadDictionaryWords();
  console.log("Building common-word dictionary…");
  const dict = await loadDict(freqRank, dictionaryWords);
  const index = buildIndex(dict);
  let made = 0, attempts = 0;
  const attemptCap = COUNT * (SIZE >= 8 ? 300 : SIZE >= 6 ? 150 : 30);
  while (made < COUNT && attempts < attemptCap) {
    attempts++;
    const pattern = generatePattern();
    if (!pattern) continue;
    const filled = fillGrid(pattern, dict, index);
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
