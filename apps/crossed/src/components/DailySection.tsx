import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useDaily } from "../hooks/use-daily";
import { fmtSeconds } from "../lib/daily-duel";

// Dashboard Daily Duel card: a clear label, the play streak, and a prominent
// "Play Duel" CTA — all on one compact block (no extra rows). NOTE: className is
// dropped on react-native-gesture-handler TouchableOpacity, so the button is inline.
export const DailySection = () => {
  const { playStreak, result, starting, startDuel } = useDaily();
  const { current } = playStreak;
  const done = result != null;

  return (
    <View
      className="mb-4 flex-row items-center"
      style={{ borderRadius: 16, backgroundColor: "#fff7ed", padding: 14 }}
    >
      <View className="flex-1 pr-2">
        <Text className="font-[jost700] text-[13px] uppercase tracking-wide text-crossed-gray-900/60">
          Daily Duel
        </Text>
        <View className="mt-0.5 flex-row items-center">
          <Text style={{ fontSize: 20 }}>🔥</Text>
          <Text className="ml-1 font-[jost700] text-[22px] text-crossed-gray-900">
            {current}
          </Text>
          <Text className="ml-1.5 font-[jost500] text-[13px] text-crossed-gray-900/55">
            day streak
          </Text>
        </View>
      </View>

      {done ? (
        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 9,
            backgroundColor: "#dcfce7",
          }}
        >
          <Text className="font-[jost700] text-[13px] text-crossed-gray-900">
            {result?.seconds != null ? `✓ ${fmtSeconds(result.seconds)}` : "✓ Done"}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={startDuel}
          disabled={starting}
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 9,
            backgroundColor: "#f97316",
          }}
        >
          <Text className="font-[jost700] text-[14px] text-white">
            {starting ? "…" : "Play Duel"}
          </Text>
          {!starting && (
            <View
              style={{
                marginLeft: 7,
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: "#ef4444",
                borderWidth: 1.5,
                borderColor: "white",
              }}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};
