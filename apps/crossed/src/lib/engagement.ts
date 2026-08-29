import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { events, trackEvent } from "./track-event";

// Lightweight local engagement tracking that decides when to ask for an App Store
// review. We only prompt players who are clearly enjoying the app — they've
// finished several games, they've been around more than a day, and we caught them
// on a good note (the caller only asks after a win or a self-paced solo finish,
// never right after losing). Apple caps prompts at ~3/year and silently drops
// extras, but we self-limit anyway so we never feel spammy.

const GAMES_KEY = "eng:gamesCompleted";
const FIRST_SEEN_KEY = "eng:firstSeenAt";
const LAST_REVIEW_KEY = "eng:lastReviewAt";
const REVIEW_COUNT_KEY = "eng:reviewCount";
// One-shot flags so each AppsFlyer ad-optimization event fires exactly once.
const CAME_BACK_KEY = "eng:cameBackFired";
const PLAYED3_KEY = "eng:played3Fired";

// Local calendar day (not UTC) so "came back a later day" matches the player's
// own sense of a new day.
const localDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const MIN_GAMES = 4; // "plays regularly"
const MIN_AGE_MS = 2 * 24 * 60 * 60 * 1000; // not brand new (>= 2 days in)
const MIN_GAP_MS = 120 * 24 * 60 * 60 * 1000; // >= 120 days between asks
const MAX_PROMPTS = 3; // lifetime cap (mirrors Apple's yearly limit)

const num = async (key: string) => Number(await AsyncStorage.getItem(key)) || 0;

// Call on every completed game. Bumps the play counter (our "regular play"
// signal) and stamps first-seen the first time.
export const recordGameCompleted = async () => {
  try {
    const games = await num(GAMES_KEY);
    const newCount = games + 1;
    await AsyncStorage.setItem(GAMES_KEY, String(newCount));

    const firstSeenRaw = await AsyncStorage.getItem(FIRST_SEEN_KEY);
    if (!firstSeenRaw) {
      await AsyncStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
    }

    // played_3_games: weak engagement floor — fire once at the 3rd game.
    if (newCount >= 3 && !(await AsyncStorage.getItem(PLAYED3_KEY))) {
      await AsyncStorage.setItem(PLAYED3_KEY, "1");
      trackEvent(events.PLAYED_3_GAMES);
    }

    // came_back: the real retention signal — fire once the first time they play
    // on a later calendar day than they first played. (firstSeenRaw is null on
    // the very first game, so this can't fire on day one.)
    const firstSeen = Number(firstSeenRaw);
    if (
      firstSeen &&
      localDay(Date.now()) !== localDay(firstSeen) &&
      !(await AsyncStorage.getItem(CAME_BACK_KEY))
    ) {
      await AsyncStorage.setItem(CAME_BACK_KEY, "1");
      trackEvent(events.CAME_BACK);
    }
  } catch {
    // non-fatal
  }
};

// Ask for a review IF the player is showing they like the app. The caller should
// only invoke this at a positive moment (a win, or finishing a solo puzzle).
export const maybeRequestReview = async () => {
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    if ((await num(GAMES_KEY)) < MIN_GAMES) return;

    const firstSeen = await num(FIRST_SEEN_KEY);
    if (firstSeen && Date.now() - firstSeen < MIN_AGE_MS) return;

    if ((await num(REVIEW_COUNT_KEY)) >= MAX_PROMPTS) return;
    const lastAt = await num(LAST_REVIEW_KEY);
    if (lastAt && Date.now() - lastAt < MIN_GAP_MS) return;

    await StoreReview.requestReview();
    await AsyncStorage.multiSet([
      [LAST_REVIEW_KEY, String(Date.now())],
      [REVIEW_COUNT_KEY, String((await num(REVIEW_COUNT_KEY)) + 1)],
    ]);
  } catch {
    // best-effort — a review prompt must never disrupt play
  }
};
