import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

// Show re-engagement pushes even while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Remembers the last push we already routed from, so a normal cold launch (which
// still reports the last tapped notification) doesn't re-open an old target.
const HANDLED_KEY = "push:lastHandledId";

const routeOf = (
  resp: Notifications.NotificationResponse | null
): string | undefined =>
  (resp?.notification.request.content.data as { route?: string } | undefined)
    ?.route;

// Registers this device for push notifications and stores the Expo push token on
// the player's profile so the backend re-engagement job can reach them. Also
// routes into the app when a notification is tapped — a "beat this time" push
// deep-links straight into a ghost race on the exact puzzle. Best-effort
// throughout: permission denial or a simulator (no token) simply no-ops. Called
// from Home so the permission prompt lands after onboarding (value first).
export const usePushRegistration = (profileId?: string) => {
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    const go = async (
      resp: Notifications.NotificationResponse | null,
      coldStart: boolean
    ) => {
      const route = routeOf(resp);
      const id = resp?.notification.request.identifier;
      if (!route || !id) return;
      // On cold start we only act on a notification we haven't routed before.
      if (coldStart && (await AsyncStorage.getItem(HANDLED_KEY)) === id) return;
      await AsyncStorage.setItem(HANDLED_KEY, id);
      router.replace(route as never);
    };

    // Warm taps (app already running).
    const sub = Notifications.addNotificationResponseReceivedListener((resp) =>
      go(resp, false)
    );
    // A tap that cold-launched the app.
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => go(resp, true))
      .catch(() => undefined);
    return () => sub.remove();
  }, [router]);

  // Only capture the token when permission is already granted. Asking for
  // permission is driven by the in-app NotificationOptInBanner (a contextual
  // soft prompt), not fired silently here — better conversion and it lets us
  // route already-denied users to Settings instead of a no-op OS call.
  useEffect(() => {
    if (!profileId || registered.current) return;
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;
      registered.current = true;
      await registerPushToken(profileId);
    })();
  }, [profileId]);
};

// Grabs the Expo push token for this device and stores it on the profile so the
// backend re-engagement job can reach the player. Assumes permission is granted.
// Returns true on success. Best-effort: never throws.
export const registerPushToken = async (profileId: string): Promise<boolean> => {
  try {
    if (!Device.isDevice) return false; // simulators can't get a token
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      )
    ).data;
    if (!token) return false;
    // expoPushToken isn't in the generated types yet — structural write. The
    // existing "update your own profile" RLS allows this.
    await supabase
      .from("profiles")
      .update({ expoPushToken: token } as never)
      .eq("id", profileId);
    return true;
  } catch {
    return false;
  }
};
