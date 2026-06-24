import { Platform } from "react-native";
import { supabase } from "./supabase";

export const events = {
  // navigation / intent
  APP_OPENED: "APP_OPENED",
  START_SOLO_GAME_CLICK: "START_SOLO_GAME_CLICK",
  START_FRIENDLY_GAME_CLICK: "START_FRIENDLY_GAME_CLICK",
  START_RANKED_GAME_CLICK: "START_RANKED_GAME_CLICK",
  DIFFICULTY_SELECTED: "DIFFICULTY_SELECTED",
  SHARE_CROSSED_CLICK: "SHARE_CROSSED_CLICK",
  FEEDBACK_CLICK: "FEEDBACK_CLICK",
  // gameplay funnel
  RANKED_MATCH_OPPONENT_FOUND: "RANKED_MATCH_OPPONENT_FOUND",
  TOURNAMENT_ENQUEUED: "TOURNAMENT_ENQUEUED",
  TOURNAMENT_MATCHED: "TOURNAMENT_MATCHED",
  GAME_COMPLETED: "GAME_COMPLETED",
  SUBMIT_SOLO_MATCH_CLICK: "SUBMIT_SOLO_MATCH_CLICK",
  FORFEIT_MATCH_CLICK: "FORFEIT_MATCH_CLICK",
  LEAVE_LOBBY_CLICK: "LEAVE_LOBBY_CLICK",
  // monetization funnel
  GATE_BLOCKED: "GATE_BLOCKED",
  PAYWALL_VIEWED: "PAYWALL_VIEWED",
  SUBSCRIBE_TAPPED: "SUBSCRIBE_TAPPED",
  PURCHASE_SUCCEEDED: "PURCHASE_SUCCEEDED",
  PURCHASE_FAILED: "PURCHASE_FAILED",
  PURCHASE_CANCELLED: "PURCHASE_CANCELLED",
  RESTORE_RESULT: "RESTORE_RESULT",
  MY_ACCOUNT_UPGRADE_TO_PRO_CLICK: "MY_ACCOUNT_UPGRADE_TO_PRO_CLICK",
  UPGRADE_CLICK: "UPGRADE_CLICK",
  RESTORE_PURCHASES_CLICK: "RESTORE_PURCHASES_CLICK",
  REMOVE_ADS_CLICK: "REMOVE_ADS_CLICK",
};

// The signed-in profile id, set at login so trackEvent (a plain function, not a
// hook) can attribute events. Mirrors how configureRevenueCat gets the user id.
let analyticsProfileId: string | undefined;
export const setAnalyticsUser = (id?: string) => {
  analyticsProfileId = id;
};

// Record a product-analytics event. Fire-and-forget: never blocks the UI and
// never throws — analytics must not affect gameplay.
export const trackEvent = (
  name: string,
  properties?: Record<string, unknown>
) => {
  try {
    supabase
      .from("analyticsEvents")
      .insert({
        name,
        profilesId: analyticsProfileId ?? null,
        properties: (properties ?? null) as never,
        platform: Platform.OS,
      })
      .then(({ error }) => {
        if (error) console.info("[analytics]", error.message);
      });
  } catch {
    // swallow — analytics is best-effort
  }
};
