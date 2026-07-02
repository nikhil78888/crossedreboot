import { useCallback, useState } from "react";
import { Linking, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import { registerPushToken } from "../hooks/use-push-registration";

// A permanent "Notifications" row for the account screen — the always-available
// way to turn push on (or off), independent of the dismissible dashboard banner.
// Tapping asks for permission if the OS still allows it, otherwise deep-links to
// system Settings (iOS only shows its prompt once). Re-reads status on focus so
// it stays in sync after a trip to Settings.
export const NotificationSettingRow = ({
  profileId,
}: {
  profileId?: string;
}) => {
  const [status, setStatus] = useState<string | null>(null);
  const [canAsk, setCanAsk] = useState(true);

  const refresh = useCallback(() => {
    let alive = true;
    Notifications.getPermissionsAsync()
      .then((p) => {
        if (!alive) return;
        setStatus(p.status);
        setCanAsk(p.canAskAgain);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  useFocusEffect(refresh);

  const granted = status === "granted";

  const onPress = async () => {
    try {
      if (granted) {
        // Already on — send them to Settings to manage/turn off.
        await Linking.openSettings();
        return;
      }
      if (canAsk) {
        const res = await Notifications.requestPermissionsAsync();
        setStatus(res.status);
        setCanAsk(res.canAskAgain);
        if (res.status === "granted") {
          if (profileId) await registerPushToken(profileId);
          return;
        }
      }
      // Previously denied → the OS won't prompt again, so open Settings.
      await Linking.openSettings();
    } catch {
      // best-effort
    }
  };

  return (
    <TouchableOpacity
      className="mt-4 rounded-2xl bg-cr-gray-300 h-[76px] w-full py-[18px] pl-[25px] pr-7 flex-row items-center justify-between"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="h-[44px] w-[44px] items-center justify-center">
          <Feather name="bell" size={26} color="#374151" />
        </View>
        <Text className="ml-[18px] font-[jost600] text-base">Notifications</Text>
      </View>
      <View className="flex-row items-center">
        <Text className="mr-2 font-[jost500] text-cr-gray-600">
          {granted ? "On" : "Off"}
        </Text>
        <Feather name="chevron-right" size={20} />
      </View>
    </TouchableOpacity>
  );
};
