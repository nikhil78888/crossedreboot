import { Crossword } from "types-and-validators";
import { supabase } from "./supabase";

// Never-repeat (word, clue): when a crossword game is created we look at the
// words in the grid and swap each baked clue for one the player hasn't seen yet
// (from the wordClues bank), then record what they were shown. Everything here
// is best-effort and falls back to the baked clues on any failure — it must
// never block or break starting a game.

type Clue = { number: string; clue: string };
type Clues = { Across: Clue[]; Down: Clue[] };
type Slot = { number: string; direction: "Across" | "Down"; word: string };

const isBlack = (cell: string | null | undefined) => cell == null || cell === "#";

// Walk the grid to recover each clue's answer word and its clue number.
export const extractWordSlots = (
  puzzle: string[][],
  solution: (string | null)[][]
): Slot[] => {
  const slots: Slot[] = [];
  const rows = puzzle.length;
  const cols = puzzle[0]?.length ?? 0;
  const numberAt = (r: number, c: number) => {
    const v = puzzle[r]?.[c];
    return v && v !== "#" && v !== "0" ? v : null;
  };
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (puzzle[r][c] === "#") continue;
      // Across word start
      const startsAcross =
        (c === 0 || puzzle[r][c - 1] === "#") &&
        c + 1 < cols &&
        puzzle[r][c + 1] !== "#";
      if (startsAcross) {
        let word = "";
        let cc = c;
        while (cc < cols && puzzle[r][cc] !== "#") {
          word += solution[r][cc] ?? "";
          cc += 1;
        }
        const number = numberAt(r, c);
        if (number && word.length >= 2)
          slots.push({ number, direction: "Across", word });
      }
      // Down word start
      const startsDown =
        (r === 0 || puzzle[r - 1][c] === "#") &&
        r + 1 < rows &&
        puzzle[r + 1][c] !== "#";
      if (startsDown) {
        let word = "";
        let rr = r;
        while (rr < rows && puzzle[rr][c] !== "#") {
          word += solution[rr][c] ?? "";
          rr += 1;
        }
        const number = numberAt(r, c);
        if (number && word.length >= 2)
          slots.push({ number, direction: "Down", word });
      }
    }
  }
  return slots;
};

const key = (word: string, clue: string) => `${word}|||${clue}`;
const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// Resolve a crossword's clues to ones the player hasn't seen, log what they were
// shown, and return the new clues object (or null to use the baked clues).
export const resolveAndLogClues = async (
  crossword: Pick<Crossword, "puzzle" | "solution" | "clues">,
  profileId: string,
  isHard = false
): Promise<Clues | null> => {
  try {
    const slots = extractWordSlots(
      crossword.puzzle as unknown as string[][],
      crossword.solution as unknown as (string | null)[][]
    );
    if (!slots.length) return null;
    const words = Array.from(new Set(slots.map((s) => s.word)));
    const wantDiff = isHard ? "HARD" : "REGULAR";

    const [{ data: seenRows }, { data: bankRows }] = await Promise.all([
      supabase
        .from("seenClues")
        .select("word, clue")
        .eq("profilesId", profileId)
        .in("word", words),
      supabase
        .from("wordClues")
        .select("word, clue, difficulty")
        .in("word", words),
    ]);

    const seen = new Set((seenRows ?? []).map((r) => key(r.word, r.clue)));
    // Per word: clues split by difficulty.
    const bank = new Map<string, { clue: string; difficulty: string }[]>();
    for (const r of bankRows ?? []) {
      const list = bank.get(r.word) ?? [];
      list.push({ clue: r.clue, difficulty: r.difficulty });
      bank.set(r.word, list);
    }

    const baked: Clues = crossword.clues as unknown as Clues;
    const bakedClueFor = (number: string, direction: "Across" | "Down") =>
      baked[direction].find((c) => String(c.number) === String(number))?.clue ??
      "";

    const chosenPairs: { profilesId: string; word: string; clue: string }[] = [];
    const out: Clues = { Across: [], Down: [] };

    for (const direction of ["Across", "Down"] as const) {
      for (const slot of slots.filter((s) => s.direction === direction)) {
        const bakedClue = bakedClueFor(slot.number, direction);
        const pool = bank.get(slot.word) ?? [];
        // Prefer clues matching the requested difficulty; fall back to any clue
        // for the word, then to the puzzle's baked clue.
        let candidates = pool
          .filter((p) => p.difficulty === wantDiff)
          .map((p) => p.clue);
        if (!candidates.length) candidates = pool.map((p) => p.clue);
        if (!candidates.length && bakedClue) candidates = [bakedClue];
        candidates = Array.from(new Set(candidates.filter(Boolean)));
        const unseen = candidates.filter((c) => !seen.has(key(slot.word, c)));
        const chosen = unseen.length
          ? rand(unseen)
          : candidates.length
          ? rand(candidates)
          : bakedClue;
        out[direction].push({ number: slot.number, clue: chosen });
        if (chosen) {
          chosenPairs.push({ profilesId: profileId, word: slot.word, clue: chosen });
          seen.add(key(slot.word, chosen)); // don't pick the same clue twice in one grid
        }
      }
    }

    // Log what the player was shown (idempotent via the PK).
    if (chosenPairs.length) {
      await supabase
        .from("seenClues")
        .upsert(chosenPairs, {
          onConflict: "profilesId,word,clue",
          ignoreDuplicates: true,
        });
    }
    return out;
  } catch {
    return null; // any failure -> fall back to baked clues
  }
};

// Log the (word, clue) pairs of an already-resolved game to a player's seen set,
// so a player who DIDN'T create the game (e.g. a friendly opponent) still
// records what they saw. Idempotent.
export const logSeenClues = async (
  crossword: Pick<Crossword, "puzzle" | "solution">,
  clues: Clues,
  profileId: string
) => {
  try {
    const slots = extractWordSlots(
      crossword.puzzle as unknown as string[][],
      crossword.solution as unknown as (string | null)[][]
    );
    const rows: { profilesId: string; word: string; clue: string }[] = [];
    for (const direction of ["Across", "Down"] as const) {
      for (const slot of slots.filter((s) => s.direction === direction)) {
        const clue = clues[direction]?.find(
          (c) => String(c.number) === String(slot.number)
        )?.clue;
        if (clue) rows.push({ profilesId: profileId, word: slot.word, clue });
      }
    }
    if (rows.length) {
      await supabase
        .from("seenClues")
        .upsert(rows, {
          onConflict: "profilesId,word,clue",
          ignoreDuplicates: true,
        });
    }
  } catch {
    // best effort
  }
};
