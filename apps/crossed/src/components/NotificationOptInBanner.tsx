import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPushToken } from "../hooks/use-push-registration";
import colors from "../lib/colors";

// Contextual, dismissible nudge to enable notifications — the way we get already-
// installed users (who were never asked, or who declined) to turn them on. If the
// OS will still show its prompt we ask directly; otherwise we route to Settings
// (iOS only shows the system prompt once). Snoozes for a week after a dismiss so
// it's never naggy, and disappears entirely once permission is granted.
const SNOOZE_KEY = "push:optInSnoozedUntil";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export const NotificationOptInBanner = ({
  profileId,
}: {
  profileId?: string;
}) => {
  const [show, setShow] = useState(false);
  const [canAsk, setCanAsk] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status === "granted") return; // already on — nothing to nudge
        const snoozedUntil = Number(await AsyncStorage.getItem(SNOOZE_KEY)) || 0;
        if (Date.now() < snoozedUntil) return;
        if (!alive) return;
        setCanAsk(perm.canAskAgain);
        setShow(true);
      } catch {
        // best-effort — a failed check just hides the banner
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const enable = async () => {
    try {
      if (canAsk) {
        const res = await Notifications.requestPermissionsAsync();
        if (res.status === "granted") {
          if (profileId) await registerPushToken(profileId);
          setShow(false);
          return;
        }
        // They declined the OS prompt — snooze and route to Settings next time.
        setCanAsk(false);
      }
      // Previously denied: the OS won't prompt again, so open Settings.
      await Linking.openSettings();
    } catch {
      // ignore — keep the banner up for a retry
    }
  };

  const dismiss = async () => {
    setShow(false);
    try {
      await AsyncStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // non-fatal
    }
  };

  return (
    <View
      className="mt-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: colors["crossed-blue"]["100"] }}
    >
      <View className="flex-row items-start">
        <View className="flex-1 pr-2">
          <Text className="font-[jost700] text-[15px] text-crossed-gray-900">
            🔔 Get a nudge when there&apos;s a puzzle to race
          </Text>
          <Text className="mt-1 font-[jost400] text-[13px] text-crossed-gray-900/70">
            Turn on notifications and we&apos;ll challenge you to beat a fresh
            time.
          </Text>
        </View>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="rounded-full px-2"
        >
          <Text style={{ color: colors["crossed-blue"]["450"], fontSize: 18 }}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={enable}
        className="mt-3 items-center rounded-full py-3"
        style={{ backgroundColor: colors["crossed-blue"]["450"] }}
      >
        <Text className="font-[jost700] text-[14px] text-white">
          {canAsk ? "Enable notifications" : "Open Settings"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
