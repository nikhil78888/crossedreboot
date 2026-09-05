import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useDaily } from "../hooks/use-daily";
import { fmtSeconds } from "../lib/daily-duel";

// Two side-by-side boxes: your Day Streak (left) and the Daily Duel CTA (right).
// Separate concepts, one compact row. NOTE: className is dropped on
// react-native-gesture-handler TouchableOpacity, so the duel box is inline-styled.
export const DailySection = () => {
  const { playStreak, result, starting, startDuel } = useDaily();
  const { current } = playStreak;
  const done = result != null;

  return (
    <View className="mb-4 flex-row" style={{ gap: 12, alignItems: "stretch" }}>
      {/* Day Streak */}
      <View
        className="flex-1 flex-row items-center"
        style={{ borderRadius: 16, backgroundColor: "#fff7ed", padding: 14 }}
      >
        <Text style={{ fontSize: 30 }}>🔥</Text>
        <View className="ml-2">
          <Text
            className="font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 32, lineHeight: 34 }}
          >
            {current}
          </Text>
          <Text className="font-[jost600] text-[11px] uppercase tracking-wide text-crossed-gray-900/50">
            Day Streak
          </Text>
        </View>
      </View>

      {/* Daily Duel */}
      <View
        className="flex-1"
        style={{
          borderRadius: 16,
          backgroundColor: done ? "#dcfce7" : "#ffedd5",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={startDuel}
          disabled={starting || done}
          style={{ flex: 1, padding: 14, justifyContent: "space-between" }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-[jost600] text-[11px] uppercase tracking-wide text-crossed-gray-900/50">
              Daily Duel
            </Text>
            {!done && !starting && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#ef4444",
                }}
              />
            )}
          </View>
          <Text
            className="mt-3 font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 20 }}
          >
            {done
              ? result?.seconds != null
                ? `✓ ${fmtSeconds(result.seconds)}`
                : "✓ Done"
              : starting
              ? "…"
              : "Play ⚔️"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
