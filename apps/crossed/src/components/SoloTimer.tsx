import { useEffect, useState } from "react";
import { Text, View } from "react-native";

// A simple count-up stopwatch for self-paced SOLO games (no shared clock).
// Solo games have no startedAt → callers pass createdAt as the fallback.
export const SoloTimer = ({ startAt }: { startAt?: string | null }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, []);
  if (!startAt) return null;
  const ms = new Date(`${startAt}Z`).getTime();
  const s = Math.max(0, Math.round((now - ms) / 1000));
  return (
    <View className="items-center py-1">
      <Text className="font-[jost700] text-[22px] text-crossed-gray-900">
        {`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}
      </Text>
    </View>
  );
};
