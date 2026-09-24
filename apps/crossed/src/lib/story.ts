import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  storyLevel,
  StoryLevel,
  STORY_MAX_LEVEL,
  STORY_PUBLISHED_5X5,
  generateWordSearchFrom,
  estimateWordSearchSolve,
  wordSearchSecondsFor,
  isOnDifficulty,
  storyTargetSolve,
  WordSearchPuzzle,
  generateWordsy,
  generateCategories,
} from "types-and-validators";
import { supabase } from "./supabase";

// Story Mode client glue: local level progress + turning a level into a playable
// challenge (reusing the daily-duel / challenge pipeline). The level DEFINITION
// (variant, puzzle config, time-to-beat, boss name) is the pure shared function
// storyLevel(); this file just builds the puzzle, persists progress, and inserts
// the challenge row the /challenge screen consumes.

export { STORY_MAX_LEVEL, storyLevel } from "types-and-validators";
export type { StoryLevel } from "types-and-validators";

const CURRENT_KEY = "story:currentLevel"; // the level you're on / resume at
const HIGHEST_KEY = "story:highestLevel"; // best level reached (for display/pride)

// The level to resume at when Story Mode is opened. Always ≥ 1.
export const getStoryCurrentLevel = async (): Promise<number> => {
  try {
    const v = Number(await AsyncStorage.getItem(CURRENT_KEY));
    return v && v >= 1 ? Math.min(STORY_MAX_LEVEL, v) : 1;
  } catch {
    return 1;
  }
};

export const getStoryHighestLevel = async (): Promise<number> => {
  try {
    const v = Number(await AsyncStorage.getItem(HIGHEST_KEY));
    return v && v >= 1 ? v : 1;
  } catch {
    return 1;
  }
};

// Called after clearing a level: advance to the next (capped at the max) and
// track the highest reached. Returns the new current level.
export const advanceStoryLevel = async (
  clearedLevel: number
): Promise<number> => {
  const next = Math.min(STORY_MAX_LEVEL, clearedLevel + 1);
  try {
    await AsyncStorage.setItem(CURRENT_KEY, String(next));
    const highest = await getStoryHighestLevel();
    if (next > highest) await AsyncStorage.setItem(HIGHEST_KEY, String(next));
  } catch {
    // non-fatal
  }
  return next;
};

// Structural view of the (not-in-generated-types) challenges insert — same shape
// the daily duel uses.
const challengesTable = supabase as unknown as {
  from: (t: "challenges") => {
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
  };
};

// A gentle target-pace timeline that reaches 100% exactly at `seconds` (the
// challenge pipeline expects one; it drives the on-screen pace bar and keeps the
// two-player game row valid — the win check itself reads solveSeconds).
const paceTimeline = (seconds: number) => {
  const pts: { p: number; t: number }[] = [{ p: 0, t: 0 }];
  for (let p = 10; p <= 90; p += 10) {
    pts.push({ p, t: +((p / 100) * seconds).toFixed(1) });
  }
  pts.push({ p: 100, t: seconds });
  return pts;
};

// Build a playable challenge for a story level and return its id + the level
// meta. Word searches are generated inline; crosswords pull a seeded published
// 5×5 mini (difficulty on crossword levels comes from the tightening clock).
export const startStoryLevel = async (
  level: number
): Promise<{ id: string; meta: StoryLevel } | null> => {
  const meta = storyLevel(level);

  // Word search: generate a FRESH random puzzle each play, but keep the real
  // difficulty consistent and the time fair to the actual draw:
  //  1. Generate up to N candidates with random seeds (same config → same grid
  //     size / word count / direction set).
  //  2. MEASURE each candidate's true solve difficulty (word lengths + the
  //     directions they actually landed in) and keep the first that lands within
  //     the level's difficulty band; if none do, keep the closest to target — so
  //     replays feel like the same difficulty, never a lucky-easy or unfair-hard
  //     draw.
  //  3. Set the time-to-beat from THAT puzzle's estimate × the level's
  //     generosity, so the challenge (pace vs. slack) is identical every play.
  if (meta.variant === "WORD_SEARCH" && meta.ws) {
    const target = storyTargetSolve(level);
    let best: WordSearchPuzzle | null = null;
    let bestEst = 0;
    let bestGap = Infinity;
    for (let i = 0; i < 8; i++) {
      const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
      const cand = generateWordSearchFrom(meta.ws, seed);
      const est = estimateWordSearchSolve(cand);
      const gap = Math.abs(est - target);
      if (gap < bestGap) {
        best = cand;
        bestEst = est;
        bestGap = gap;
      }
      if (isOnDifficulty(level, est)) break; // on-difficulty → good enough
    }
    if (!best) return null;
    const seconds = wordSearchSecondsFor(level, bestEst);
    const insert = {
      challengerId: null,
      challengerName: meta.boss,
      gameVariant: meta.variant,
      difficulty: "HARD",
      solveSeconds: seconds,
      timeline: paceTimeline(seconds),
      crosswordsId: null,
      resolvedClues: null,
      puzzle: best,
    };
    const { data, error } = await challengesTable
      .from("challenges")
      .insert(insert)
      .select("id")
      .single();
    if (error || !data?.id) return null;
    return { id: data.id, meta: { ...meta, seconds } };
  }

  // Wordsy / Categories: generated inline from original word lists. Difficulty
  // is config-driven (word length + guesses, or mistakes allowed), so a fresh
  // random puzzle each play keeps the same difficulty; time is the nominal
  // per-level estimate × generosity (already in meta.seconds).
  if (
    (meta.variant === "WORDSY" && meta.wordsy) ||
    (meta.variant === "CATEGORIES" && meta.categories)
  ) {
    const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
    const puzzle =
      meta.variant === "WORDSY"
        ? generateWordsy(meta.wordsy!, seed)
        : generateCategories(meta.categories!, seed);
    const insert = {
      challengerId: null,
      challengerName: meta.boss,
      gameVariant: meta.variant,
      difficulty: "HARD",
      solveSeconds: meta.seconds,
      timeline: paceTimeline(meta.seconds),
      crosswordsId: null,
      resolvedClues: null,
      puzzle,
    };
    const { data, error } = await challengesTable
      .from("challenges")
      .insert(insert)
      .select("id")
      .single();
    if (error || !data?.id) return null;
    return { id: data.id, meta };
  }

  // Crossword: the grid is always a 5×5 mini, so structural difficulty is
  // constant — only clue difficulty varies (inherent to any crossword; hints
  // mitigate). Keep the nominal per-level time (generosity lowers it over the
  // ladder). Pick a random mini each play for variety.
  const base: Record<string, unknown> = {
    challengerId: null, // system challenge — nobody is notified of a result
    challengerName: meta.boss,
    gameVariant: meta.variant,
    difficulty: "HARD",
    solveSeconds: meta.seconds,
    timeline: paceTimeline(meta.seconds),
  };

  // Random mini from the published 5×5 pool each play (same size, new puzzle).
  const offset = Math.floor(Math.random() * STORY_PUBLISHED_5X5);
  const { data: cw } = await supabase
    .from("crosswords")
    .select("id, clues")
    .eq("isPublished", true)
    .eq("size", 5)
    .order("id")
    .range(offset, offset)
    .single();
  if (!cw?.id) return null;
  const insert = {
    ...base,
    crosswordsId: cw.id,
    resolvedClues: (cw as { clues?: unknown }).clues ?? null,
    puzzle: null,
  };

  const { data, error } = await challengesTable
    .from("challenges")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data?.id) return null;
  return { id: data.id, meta };
};
