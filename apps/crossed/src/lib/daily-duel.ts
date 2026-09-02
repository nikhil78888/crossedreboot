import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { generateWordSearch } from "./word-search";

// The Daily Duel: every day, a race against a funny-named "opponent" with a
// preset time. It's fully deterministic from the calendar date — same opponent,
// same puzzle, same time-to-beat for everyone that day, fresh each day — so it
// needs no live players or real ghost data (works at any scale). The race itself
// reuses the existing challenge/ghost pipeline: we persist a system challenge
// (challengerId null → nobody gets a result) and route into /challenge.

export type DuelVariant = "CROSSWORD" | "WORD_SEARCH";

// ~40 characters. The silly names are the point — they make a win worth sharing.
const CAST = [
  "Sir Reginald Puzzlesworth", "Grandma Gladys", "Tony Two-Times",
  "Captain Anagram", "The Crossword Bandit", "Lil Vowel", "Betty Letters",
  "Dr. Acrostic", "Vinny Vowels", "Sally Syllable", "The Puzzle Pirate",
  "Nana Nine-Down", "Speedy Steve", "Clueless Carl", "Wordy Wendy",
  "Max Verbatim", "Gary Grid", "Penny Pencil", "Chad Checkmate",
  "Ophelia Overthinks", "Sir Solves-a-Lot", "Ricky Rebus", "Ms. Across",
  "Barry Backspace", "The Anagram Assassin", "Tilly Timer",
  "Professor Puzzlebottom", "Nervous Nelly", "Quick Quinn", "Slowpoke Sam",
  "The Daily Dasher", "Hasty Harriet", "Gigi Gridlock", "The Letterman",
  "Bingo Bob", "Crossword Karen", "Zippy Zoe", "Larry Lexicon",
  "Mabel Mini", "The Speed Speller",
];

// Number of published 5×5 minis to pick from (seeded). A fixed count keeps the
// pick deterministic without an extra count query.
const PUBLISHED_5X5 = 384;

// Local calendar day (YYYY-MM-DD) — the streak/day boundary is the player's own
// midnight, which is fairer than UTC.
export const localDay = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// Stable 32-bit hash of the day string → the day's seed.
const seedFrom = (day: string): number => {
  let h = 2166136261;
  for (let i = 0; i < day.length; i += 1) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export type DuelMeta = {
  day: string;
  seed: number;
  variant: DuelVariant;
  opponent: string;
  seconds: number; // the time to beat
};

export const duelMeta = (day: string = localDay()): DuelMeta => {
  const seed = seedFrom(day);
  return {
    day,
    seed,
    // Word-search only for now: it's always completable (you can find every
    // word), so the race reliably registers a solve time. Crossword duels need a
    // curated *easy* pool first — a random published 5×5 can have answers you
    // can't get exactly, so the solve never registers (shows a bogus loss).
    variant: "WORD_SEARCH",
    opponent: CAST[seed % CAST.length],
    // 30–75s: never so high it's a walkover, never so low it's impossible on a
    // quick mini. Random-feeling but deterministic per day.
    seconds: 30 + (seed % 46),
  };
};

export const fmtSeconds = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

// A slightly human-feeling ghost timeline that reaches 100% exactly at `seconds`.
const timelineFor = (seed: number, seconds: number) => {
  const pts: { p: number; t: number }[] = [{ p: 0, t: 0 }];
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000) / 1000;
  };
  for (let p = 10; p <= 90; p += 10) {
    const base = (p / 100) * seconds;
    const jitter = (rnd() - 0.5) * seconds * 0.08;
    const t = Math.max(pts[pts.length - 1].t + 0.2, +(base + jitter).toFixed(1));
    pts.push({ p, t });
  }
  pts.push({ p: 100, t: seconds });
  return pts;
};

// Structural view of the (not-in-generated-types) challenges insert.
const challengesTable = supabase as unknown as {
  from: (t: "challenges") => {
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
  };
};

// v3: word-search-only + HARD difficulty — ignore earlier cached duels for today.
const cacheKey = (day: string) => `daily:duelChallenge:v3:${day}`;

// Today's finished-duel result, so the card can show the player's time (and stop
// offering a re-race) once they've completed it.
const resultKey = (day: string) => `daily:duelResult:${day}`;
export type DuelResult = { seconds: number | null; won: boolean };

export const setTodaysResult = async (r: DuelResult): Promise<void> => {
  try {
    await AsyncStorage.setItem(resultKey(localDay()), JSON.stringify(r));
  } catch {
    // non-fatal
  }
};

export const getTodaysResult = async (): Promise<DuelResult | null> => {
  try {
    const v = await AsyncStorage.getItem(resultKey(localDay()));
    return v ? (JSON.parse(v) as DuelResult) : null;
  } catch {
    return null;
  }
};

// Returns today's duel: its meta + a challenge id to race. Creates the system
// challenge once per day and caches the id so re-opening reuses the same duel.
export const getTodaysDuel = async (): Promise<{
  id: string;
  meta: DuelMeta;
} | null> => {
  const meta = duelMeta();
  try {
    const cached = await AsyncStorage.getItem(cacheKey(meta.day));
    if (cached) return { id: cached, meta };
  } catch {
    // fall through and create it
  }

  const base: Record<string, unknown> = {
    challengerId: null, // system: nobody is notified of a result
    challengerName: meta.opponent,
    gameVariant: meta.variant,
    difficulty: "HARD",
    solveSeconds: meta.seconds,
    timeline: timelineFor(meta.seed, meta.seconds),
  };

  let insert: Record<string, unknown>;
  if (meta.variant === "WORD_SEARCH") {
    insert = {
      ...base,
      crosswordsId: null,
      resolvedClues: null,
      // Always HARD for the daily duel (bigger grid + reversed directions).
      puzzle: generateWordSearch("HARD", meta.seed),
    };
  } else {
    // Seeded pick of a published 5×5 mini — same crossword for everyone today.
    const offset = meta.seed % PUBLISHED_5X5;
    const { data: cw } = await supabase
      .from("crosswords")
      .select("id, clues")
      .eq("isPublished", true)
      .eq("size", 5)
      .order("id")
      .range(offset, offset)
      .single();
    if (!cw?.id) return null;
    insert = {
      ...base,
      crosswordsId: cw.id,
      resolvedClues: (cw as { clues?: unknown }).clues ?? null,
      puzzle: null,
    };
  }

  const { data, error } = await challengesTable
    .from("challenges")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data?.id) return null;
  try {
    await AsyncStorage.setItem(cacheKey(meta.day), data.id);
  } catch {
    // non-fatal
  }
  return { id: data.id, meta };
};
