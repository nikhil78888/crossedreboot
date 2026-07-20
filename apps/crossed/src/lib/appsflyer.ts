import { Platform } from "react-native";
import appsFlyer from "react-native-appsflyer";

// AppsFlyer attribution. The dev key is a public client key (it ships in the
// binary either way) but we read it from the build env so it lives beside the
// other EXPO_PUBLIC_* config in eas.json rather than being hardcoded.
const DEV_KEY = process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY;
const IOS_APP_ID = "6448530256"; // App Store id for live.crossed.app

let started = false;

export const initAppsFlyer = () => {
  if (started || !DEV_KEY) return;
  started = true;
  try {
    appsFlyer.initSdk(
      {
        devKey: DEV_KEY,
        appId: IOS_APP_ID,
        isDebug: __DEV__,
        // We don't show an ATT prompt, so don't stall the SDK waiting for one.
        // Attribution still works via SKAdNetwork + AppsFlyer's own matching.
        timeToWaitForATTUserAuthorization: 0,
        onInstallConversionDataListener: true,
      },
      () => {},
      () => {}
    );
  } catch {
    // Attribution must never break app start.
  }
};

// Mirror a analytics event into AppsFlyer. Only the handful of events that are
// useful for install attribution / ad optimization are forwarded (see EVENT_MAP)
// — forwarding everything just adds noise and cost.
export const logAppsFlyerEvent = (
  name: string,
  values: Record<string, unknown> = {}
) => {
  if (!started || !DEV_KEY) return;
  try {
    appsFlyer.logEvent(name, values as Record<string, string | number>, () => {},
      () => {});
  } catch {
    // never throw from analytics
  }
};

// Tie AppsFlyer's install/events to our own profile id, so an attributed install
// can be joined back to a real user (Branch delivered this and the app discarded
// it — that's the segmentation gap this closes).
export const setAppsFlyerUserId = (profileId?: string | null) => {
  if (!started || !DEV_KEY || !profileId) return;
  try {
    appsFlyer.setCustomerUserId(profileId, () => {});
  } catch {
    // never throw from analytics
  }
};

export const appsFlyerEnabled = () => !!DEV_KEY && Platform.OS === "ios";
