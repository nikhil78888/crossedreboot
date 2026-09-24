import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  duelMeta,
  localDay,
  PUBLISHED_5X5,
  type DuelMeta,
  type DuelVariant,
} from "types-and-validators";
import { supabase } from "./supabase";
import { generateWordSearch } from "./word-search";

// The Daily Duel: every day, a race against a funny-named "opponent" with a
// preset time. It's fully deterministic from the calendar date — same opponent,
// same puzzle, same time-to-beat for everyone that day, fresh each day — so it
// needs no live players or real ghost data (works at any scale). The race itself
// reuses the existing challenge/ghost pipeline: we persist a system challenge
// (challengerId null → nobody gets a result) and route into /challenge.
//
// The duel DEFINITION (variant / opponent / time-to-beat) now lives in the
// shared package and is served by the API — see fetchDuelMeta below. Every app
// version fetches the same meta from the server, so no build can compute a
// different duel and split the leaderboard. duelMeta() (the identical shared
// computation) remains as the offline fallback and for synchronous display.

// Re-exported so existing "../lib/daily-duel" imports keep resolving. The
// canonical definitions live in types-and-validators.
export { duelMeta, localDay } from "types-and-validators";
export { fmtSeconds } from "types-and-validators";
export type { DuelMeta, DuelVariant } from "types-and-validators";

// Today's duel meta, from the SERVER — the single source of truth so every
// client (any version) races the same duel and lands on one leaderboard. Sends
// the player's local day so the day boundary stays their own midnight. Falls
// back to the identical local computation when offline / on error.
const fetchDuelMeta = async (day: string = localDay()): Promise<DuelMeta> => {
  try {
    const { data } = await axios.get<DuelMeta>("/api/games/daily-duel-meta", {
      params: { day },
    });
    if (
      data &&
      (data.variant === "CROSSWORD" || data.variant === "WORD_SEARCH") &&
      typeof data.seconds === "number" &&
      typeof data.seed === "number" &&
      typeof data.opponent === "string"
    ) {
      return data;
    }
  } catch {
    // offline / server error → identical local computation keeps the duel playable
  }
  return duelMeta(day);
};

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

// v7: the duel definition is now server-authoritative (fetchDuelMeta). Bump so a
// duel already cached today under a locally-computed meta is dropped and
// re-created against the server's meta — that's what merges every build onto one
// shared leaderboard.
const cacheKey = (day: string) => `daily:duelChallenge:v7:${day}`;

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
  const meta = await fetchDuelMeta();
  // Ease the time-to-beat: players (even strong ones) were losing the duel most
  // days, which makes the daily-return hook feel punishing. Give ~30% more time
  // to beat the ghost. This ONLY changes win/lose vs the opponent — the daily
  // leaderboard ranks by your ACTUAL solve time, so easing here doesn't advantage
  // anyone on the board. Applied client-side so it ships to this build only.
  const DUEL_EASE = 1.3;
  meta.seconds = Math.max(30, Math.round(meta.seconds * DUEL_EASE));
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
