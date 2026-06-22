// Sudoku generator: makes valid 9x9 puzzles with a UNIQUE solution, digging
// holes to hit a difficulty's target number of givens.
//
// Usage:
//   node scripts/generate-sudokus.mjs --difficulty medium --count 40
//   node scripts/generate-sudokus.mjs --count 30 --dry-run   # mix of difficulties
import fs from "fs";
import path from "path";

const envText = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const env = Object.fromEntries(
  envText.split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.SUPABASE_URL;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const getArg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const COUNT = parseInt(getArg("count", "30"), 10);
const DRY = args.includes("--dry-run");
const DIFF_ARG = getArg("difficulty", "mix");

// Givens per difficulty (fewer givens = harder).
const GIVENS = { easy: 42, medium: 34, hard: 28 };

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const canPlace = (g, r, c, v) => {
  for (let i = 0; i < 9; i++) if (g[r][i] === v || g[i][c] === v) return false;
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === v) return false;
  return true;
};

const fillFull = (g) => {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (g[r][c] === 0) {
      for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (canPlace(g, r, c, v)) { g[r][c] = v; if (fillFull(g)) return true; g[r][c] = 0; }
      }
      return false;
    }
  }
  return true;
};

// Count solutions up to `cap` (we only care whether it's exactly 1).
const countSolutions = (g, cap = 2) => {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (g[r][c] === 0) {
      let total = 0;
      for (let v = 1; v <= 9; v++) {
        if (canPlace(g, r, c, v)) { g[r][c] = v; total += countSolutions(g, cap - total); g[r][c] = 0; if (total >= cap) break; }
      }
      return total;
    }
  }
  return 1;
};

const makePuzzle = (solution, targetGivens) => {
  const puzzle = solution.map((row) => row.slice());
  const cells = shuffle([...Array(81).keys()]);
  let givens = 81;
  for (const idx of cells) {
    if (givens <= targetGivens) break;
    const r = Math.floor(idx / 9), c = idx % 9;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;
    const copy = puzzle.map((row) => row.slice());
    if (countSolutions(copy, 2) !== 1) puzzle[r][c] = saved; // keep unique
    else givens--;
  }
  return { puzzle, givens };
};

const difficultiesFor = (n) => {
  if (DIFF_ARG !== "mix") return Array(n).fill(DIFF_ARG);
  const order = ["easy", "medium", "hard"];
  return Array.from({ length: n }, (_, i) => order[i % 3]);
};

async function insert(s) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sudokus`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ puzzle: s.puzzle, solution: s.solution, difficulty: s.difficulty, isPublished: true }),
  });
  if (!res.ok) throw new Error(`insert failed ${res.status}: ${await res.text()}`);
}

(async () => {
  const diffs = difficultiesFor(COUNT);
  let made = 0;
  for (const difficulty of diffs) {
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillFull(solution);
    const { puzzle } = makePuzzle(solution, GIVENS[difficulty] || 34);
    made++;
    if (DRY) {
      console.log(`\n--- ${difficulty} (${puzzle.flat().filter(Boolean).length} givens) ---`);
      console.log(puzzle.map((row) => row.map((x) => x || ".").join(" ")).join("\n"));
    } else {
      await insert({ puzzle, solution, difficulty });
      if (made % 10 === 0) console.log(`  inserted ${made}/${COUNT}`);
    }
  }
  console.log(`\nDone. Generated ${made} sudokus${DRY ? " (dry run)" : " and inserted them"}.`);
})();
