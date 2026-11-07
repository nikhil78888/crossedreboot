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

// Clue HARDNESS proxy (lower = easier / more approachable). This is a syntactic
// read of what makes a clue hard for an average person — NOT a quality signal.
// We penalize the cryptic/trivia hallmarks: wordplay ("?"), fill-in-the-blank
// ("___", usually pop-culture), multi-clause (";"/":"), long/wordy, and quotes.
// One-word clues are penalized HARD so we never regress to terse synonyms (which
// the generator already bans) — we want the clearest definition, not the shortest.
const clueHardness = (clue: string): number => {
  const c = (clue || "").trim();
  if (!c) return Infinity;
  let s = c.length;
  const words = c.split(/\s+/).length;
  if (words === 1) s += 60; // terse synonym — avoid
  if (words > 6) s += (words - 6) * 10; // wordy
  if (/\?\s*$/.test(c)) s += 28; // pun / wordplay
  if (/[;:]/.test(c)) s += 22; // multi-clause
  if (/,/.test(c)) s += 6;
  if (/_/.test(c)) s += 30; // fill-in-the-blank
  if (/["']/.test(c)) s += 8;
  return s;
};
// Easiest clue first; stable for equal scores.
const easiestFirst = (clues: string[]): string[] =>
  clues.slice().sort((a, b) => clueHardness(a) - clueHardness(b));

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
        // EASY tier: clues at the requested difficulty (REGULAR for everyone now
        // that Regular/Hard is merged) PLUS the puzzle's own editorial baked clue.
        // HARD tier: everything else — used only as a last resort. Within each
        // tier we pick the EASIEST clue (clueHardness), preferring unseen ones so
        // never-repeat still holds. This makes clues gettable for an average
        // person without dropping any puzzle from the pool. (Players reported the
        // CLUES, not the fill words, as the hard part.)
        const easyTier = Array.from(
          new Set(
            [
              ...pool.filter((p) => p.difficulty === wantDiff).map((p) => p.clue),
              bakedClue,
            ].filter(Boolean)
          )
        );
        const hardTier = Array.from(
          new Set(
            pool
              .filter((p) => p.difficulty !== wantDiff)
              .map((p) => p.clue)
              .filter((c) => c && !easyTier.includes(c))
          )
        );
        const unseen = (arr: string[]) =>
          arr.filter((c) => !seen.has(key(slot.word, c)));
        const easyUnseen = easiestFirst(unseen(easyTier));
        const hardUnseen = easiestFirst(unseen(hardTier));
        const chosen =
          easyUnseen[0] ??
          easiestFirst(easyTier)[0] ??
          hardUnseen[0] ??
          easiestFirst(hardTier)[0] ??
          bakedClue;
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
