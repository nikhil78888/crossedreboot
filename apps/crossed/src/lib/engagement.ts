import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

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
    await AsyncStorage.setItem(GAMES_KEY, String(games + 1));
    if (!(await AsyncStorage.getItem(FIRST_SEEN_KEY))) {
      await AsyncStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
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
