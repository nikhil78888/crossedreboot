import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Public App Store SDK key (safe to ship in the app).
const APPLE_API_KEY = "appl_jUOfxYzjmnGZzDxSbHkVvJeAzUi";

// Monetization model (2026-11): the first 20 non-daily-duel games are free for
// everyone. Only AFTER a player has really settled in (20+ games) are further
// non-duel games gated behind Pro. The DAILY DUEL is ALWAYS free and never
// counts against this. This deliberately spares new/casual users (our data
// showed an early 3-games/day paywall tanked D1) and only asks the deeply
// engaged to pay.
export const FREE_GAMES_BEFORE_GATE = 20;

// Game types that count toward the free-game allowance and are gated once it's
// used up. The daily duel is launched free and bypasses the gate (see
// useGameGate), so it is never blocked regardless of type.
export const GATED_GAME_TYPES = [
  "RANKED",
  "FRIENDLY",
  "TOURNAMENT",
  "SOLO",
] as const;

// A single shareable code that grants unlimited play (for friends). It's
// redeemed locally on the device — intentionally simple: handing it out is the
// point, and the worst case is a friend gets free Pro. Change this string to
// rotate the code. (Device-local: a reinstall clears it; re-enter to restore.)
export const FRIEND_CODE = "CROSSEDVIP";
const COMP_KEY = "comp:unlimited";

export const isComped = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(COMP_KEY)) === "1";
  } catch {
    return false;
  }
};

// Returns true if the code was valid and unlimited access is now granted.
export const redeemFriendCode = async (code: string): Promise<boolean> => {
  if (code.trim().toUpperCase() !== FRIEND_CODE) return false;
  try {
    await AsyncStorage.setItem(COMP_KEY, "1");
  } catch {
    // non-fatal; the grant just won't persist
  }
  return true;
};

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
