import { wordSearchConfig } from "./word-search";

// Daily Duel — the PURE, shared definition of "what is today's duel".
//
// This lives in the shared package so the API and every client compute the
// exact same duel from the same code. The server is the source of truth (the
// client fetches today's meta from it), which means no app version can diverge
// and fork the leaderboard. This module is intentionally pure: no AsyncStorage,
// no network, no puzzle generation — just date -> DuelMeta. The client still
// owns the puzzle build + challenge insert + caching; the server owns "which
// duel is today".

export type DuelVariant = "CROSSWORD" | "WORD_SEARCH";

export type DuelMeta = {
  day: string;
  seed: number;
  variant: DuelVariant;
  opponent: string;
  seconds: number; // the time to beat
};

// ~40 characters. The silly names are the point — they make a win worth sharing.
export const CAST = [
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
export const PUBLISHED_5X5 = 384;

// The opponent's per-word pacing for word-search duels.
const BASE_SECONDS = 10; // initial scan / getting oriented
const PACE_FAST = 6.5; // seconds/word on a hard day → tough to beat
const PACE_SLOW = 11.5; // seconds/word on an easy day → most people beat it

// Local calendar day (YYYY-MM-DD) — the streak/day boundary is the player's own
// midnight, which is fairer than UTC.
export const localDay = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// Stable 32-bit hash of the day string → the day's seed.
export const seedFrom = (day: string): number => {
  let h = 2166136261;
  for (let i = 0; i < day.length; i += 1) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// The day's variant — alternate crossword / word search so it doesn't feel
// samey. Deterministic per day; a shifted seed slice keeps it uncorrelated with
// the opponent pick and the difficulty-of-day.
export const duelVariant = (seed: number): DuelVariant =>
  (seed >>> 5) % 2 === 0 ? "WORD_SEARCH" : "CROSSWORD";

export const duelSeconds = (seed: number, variant: DuelVariant): number => {
  // Which "kind of day" it is, 0 (hardest) .. 1 (easiest). Shifted seed slice so
  // difficulty isn't correlated with the opponent or variant pick.
  const dayFactor = ((seed >>> 3) % 1000) / 1000;
  if (variant === "CROSSWORD") {
    // A published 5×5 (~10 answers): tight ~45s .. generous ~95s.
    return Math.round(45 + dayFactor * 50);
  }
  const { count } = wordSearchConfig("HARD");
  const perWord = PACE_FAST + dayFactor * (PACE_SLOW - PACE_FAST);
  return Math.round(BASE_SECONDS + perWord * count); // ~62s (hard) .. ~102s (easy)
};

// The one function everything derives from: a calendar day → the day's duel.
export const duelMeta = (day: string = localDay()): DuelMeta => {
  const seed = seedFrom(day);
  const variant = duelVariant(seed);
  return {
    day,
    seed,
    variant,
    opponent: CAST[seed % CAST.length],
    seconds: duelSeconds(seed, variant),
  };
};

export const fmtSeconds = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
