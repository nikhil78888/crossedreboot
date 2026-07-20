import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

// Public App Store SDK key (safe to ship in the app).
const APPLE_API_KEY = "appl_jUOfxYzjmnGZzDxSbHkVvJeAzUi";

// 3 free games per day for non-subscribers.
export const FREE_COMPETITIVE_PER_DAY = 3;

// EVERY game type counts against the free limit — ranked, friendly (which is
// also how challenge/ghost races are stored), tournament, and solo — across all
// variants (crossword, sudoku, word search, trivia). One shared daily budget.
export const GATED_GAME_TYPES = [
  "RANKED",
  "FRIENDLY",
  "TOURNAMENT",
  "SOLO",
] as const;

let configured = false;

export const configureRevenueCat = (appUserId?: string) => {
  if (Platform.OS !== "ios") return; // only the App Store is configured
  if (!configured) {
    // DEBUG logs print the exact reason offerings come back empty (e.g.
    // "None of the products registered in the RevenueCat dashboard could be
    // fetched from App Store Connect"). View in Console.app with the device
    // attached, filtered to "Purchases".
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: APPLE_API_KEY, appUserID: appUserId });
    configured = true;
  } else if (appUserId) {
    Purchases.logIn(appUserId).catch(() => {});
  }
};

// A user is "pro" if they have any active entitlement (there's only one:
// "Crossed Pro"). Checking "any active" is robust to the exact identifier.
export const hasProEntitlement = (info: {
  entitlements: { active: Record<string, unknown> };
}) => Object.keys(info.entitlements.active).length > 0;
