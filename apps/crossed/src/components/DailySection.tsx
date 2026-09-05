import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useDaily } from "../hooks/use-daily";
import { fmtSeconds } from "../lib/daily-duel";

// Dashboard: one row that shows the play streak AND doubles as a prominent Daily
// Duel call-to-action (no extra vertical space). NOTE: className is dropped on
// react-native-gesture-handler TouchableOpacity, so the button layout is inline.
export const DailySection = () => {
  const { playStreak, result, starting, startDuel } = useDaily();
  const { current } = playStreak;
  const done = result != null;

  return (
    <View
      className="mb-4 flex-row items-center"
      style={{ borderRadius: 16, backgroundColor: "#fff7ed", padding: 12 }}
    >
      <Text style={{ fontSize: 28 }}>🔥</Text>
      <Text className="ml-2 font-[jost700] text-[24px] text-crossed-gray-900">
        {current}
      </Text>
      <View className="ml-2.5 flex-1">
        <Text className="font-[jost700] text-[12px] uppercase tracking-wide text-crossed-gray-900/60">
          Daily Play Streak
        </Text>
        <Text className="mt-0.5 font-[jost500] text-[11px] text-crossed-gray-900/45">
          {done
            ? "Duel done — back tomorrow"
            : current === 0
            ? "Play the duel to start it"
            : "Play today's duel to keep it"}
        </Text>
      </View>

      {done ? (
        <View
          className="items-center"
          style={{
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 8,
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
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: "#f97316",
          }}
        >
          <Text className="font-[jost700] text-[13px] text-white">
            {starting ? "…" : "⚔️ Play Duel"}
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
