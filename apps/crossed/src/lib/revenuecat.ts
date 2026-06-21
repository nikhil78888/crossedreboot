import Purchases from "react-native-purchases";
import { Platform } from "react-native";

// Public App Store SDK key (safe to ship in the app).
const APPLE_API_KEY = "appl_jUOfxYzjmnGZzDxSbHkVvJeAzUi";

// 3 free competitive games per day for non-subscribers.
export const FREE_COMPETITIVE_PER_DAY = 3;

// Modes that count against the free limit (Solo is always free).
export const GATED_GAME_TYPES = ["RANKED", "FRIENDLY", "TOURNAMENT"] as const;

let configured = false;

export const configureRevenueCat = (appUserId?: string) => {
  if (Platform.OS !== "ios") return; // only the App Store is configured
  if (!configured) {
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
