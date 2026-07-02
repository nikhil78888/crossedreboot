import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
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

// Registers this device for push notifications and stores the Expo push token on
// the player's profile so the backend re-engagement job can reach them. Also
// routes into the app when a notification is tapped. Best-effort throughout —
// permission denial or a simulator (no token) simply no-ops; nothing here can
// block the app. Called from Home so it only runs for a signed-in player who has
// finished onboarding (value first, then the permission prompt).
export const usePushRegistration = (profileId?: string) => {
  const router = useRouter();
  const registered = useRef(false);

  // Tap a push → open the app to wherever the payload points (defaults home).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { route?: string }
          | undefined;
        router.replace((data?.route as never) ?? ("/home" as never));
      }
    );
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!profileId || registered.current) return;
    registered.current = true;
    (async () => {
      try {
        if (!Device.isDevice) return; // simulators/emulators can't get a token
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Reminders",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        let status = (await Notifications.getPermissionsAsync()).status;
        if (status !== "granted") {
          status = (await Notifications.requestPermissionsAsync()).status;
        }
        if (status !== "granted") return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        const token = (
          await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
          )
        ).data;
        if (!token) return;

        // expoPushToken isn't in the generated types yet — structural write. The
        // existing "update your own profile" RLS allows this.
        await supabase
          .from("profiles")
          .update({ expoPushToken: token } as never)
          .eq("id", profileId);
      } catch {
        // best-effort — never block the app on push setup
      }
    })();
  }, [profileId]);
};
