import { supabase } from "../lib/supabase";

// Server-side clue resolution for backend-created games (ranked / tournament).
// Picks each word a clue of the requested difficulty from the wordClues bank,
// falling back to the puzzle's baked clue. Shared games, so no per-user seen
// tracking — both players see the same clues. Best-effort: returns null on any
// failure and the caller keeps the baked clues.

type Clue = { number: string; clue: string };
type Clues = { Across: Clue[]; Down: Clue[] };

const numberAt = (puzzle: string[][], r: number, c: number) => {
  const v = puzzle[r]?.[c];
  return v && v !== "#" && v !== "0" ? v : null;
};

type Slot = { number: string; direction: "Across" | "Down"; word: string };

const extractWordSlots = (
  puzzle: string[][],
  solution: (string | null)[][]
): Slot[] => {
  const slots: Slot[] = [];
  const rows = puzzle.length;
  const cols = puzzle[0]?.length ?? 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (puzzle[r][c] === "#") continue;
      if (
        (c === 0 || puzzle[r][c - 1] === "#") &&
        c + 1 < cols &&
        puzzle[r][c + 1] !== "#"
      ) {
        let word = "";
        for (let cc = c; cc < cols && puzzle[r][cc] !== "#"; cc += 1)
          word += solution[r][cc] ?? "";
        const n = numberAt(puzzle, r, c);
        if (n && word.length >= 2)
          slots.push({ number: n, direction: "Across", word });
      }
      if (
        (r === 0 || puzzle[r - 1][c] === "#") &&
        r + 1 < rows &&
        puzzle[r + 1][c] !== "#"
      ) {
        let word = "";
        for (let rr = r; rr < rows && puzzle[rr][c] !== "#"; rr += 1)
          word += solution[rr][c] ?? "";
        const n = numberAt(puzzle, r, c);
        if (n && word.length >= 2)
          slots.push({ number: n, direction: "Down", word });
      }
    }
  }
  return slots;
};

const rand = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const resolveCluesForDifficulty = async (
  crossword: { puzzle: string[][]; solution: (string | null)[][]; clues: Clues },
  isHard: boolean
): Promise<Clues | null> => {
  try {
    const slots = extractWordSlots(crossword.puzzle, crossword.solution);
    if (!slots.length) return null;
    const words = Array.from(new Set(slots.map((s) => s.word)));
    const wantDiff = isHard ? "HARD" : "REGULAR";
    const { data: bankRows } = await supabase
      .from("wordClues")
      .select("word, clue, difficulty")
      .in("word", words);
    const bank = new Map<string, { clue: string; difficulty: string }[]>();
    for (const r of bankRows ?? []) {
      const list = bank.get(r.word) ?? [];
      list.push({ clue: r.clue, difficulty: r.difficulty });
      bank.set(r.word, list);
    }
    const bakedFor = (n: string, d: "Across" | "Down") =>
      crossword.clues[d].find((c) => String(c.number) === String(n))?.clue ?? "";

    const out: Clues = { Across: [], Down: [] };
    for (const direction of ["Across", "Down"] as const) {
      for (const slot of slots.filter((s) => s.direction === direction)) {
        const baked = bakedFor(slot.number, direction);
        const pool = bank.get(slot.word) ?? [];
        let candidates = pool
          .filter((p) => p.difficulty === wantDiff)
          .map((p) => p.clue);
        if (!candidates.length) candidates = pool.map((p) => p.clue);
        if (!candidates.length && baked) candidates = [baked];
        out[direction].push({
          number: slot.number,
          clue: candidates.length ? rand(candidates) : baked,
        });
      }
    }
    return out;
  } catch {
    return null;
  }
};
