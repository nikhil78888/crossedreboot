import { Text, View } from "react-native";
import { useDaily } from "../hooks/use-daily";

// Dashboard streak card — the Daily Duel itself now lives on the Daily tab; this
// just shows the play streak, cleanly.
export const DailySection = () => {
  const { playStreak } = useDaily();
  const { current, longest } = playStreak;

  return (
    <View
      className="mb-4 flex-row items-center"
      style={{ borderRadius: 16, backgroundColor: "#fff7ed", padding: 14 }}
    >
      <Text style={{ fontSize: 30 }}>🔥</Text>
      <Text className="ml-2 font-[jost700] text-[26px] text-crossed-gray-900">
        {current}
      </Text>
      <View className="ml-3 flex-1">
        <Text className="font-[jost700] text-[13px] uppercase tracking-wide text-crossed-gray-900/60">
          Daily Play Streak
        </Text>
        <Text className="mt-0.5 font-[jost500] text-[12px] text-crossed-gray-900/45">
          {current === 0
            ? "Play the Daily Duel to start your streak"
            : longest > current
            ? `Best: ${longest} days`
            : "Keep it going — play today's duel"}
        </Text>
      </View>
    </View>
  );
};
