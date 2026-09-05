import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useDaily } from "../hooks/use-daily";
import { fmtSeconds } from "../lib/daily-duel";

// Two matched dashboard tiles: your play streak (left) and today's Daily Duel
// (right). Same footprint — emoji pinned top, content pinned bottom — so they
// read as a set. NOTE: className is dropped on react-native-gesture-handler
// TouchableOpacity, so the duel tile is inline-styled.
const TILE_MIN_HEIGHT = 88;
// Fixed slot for the flame so the number's left edge — and the label indented to
// match it — land at a known, exact x offset.
const FLAME_SLOT = 34;

export const DailySection = () => {
  const { playStreak, result, starting, startDuel } = useDaily();
  const { current } = playStreak;
  const done = result != null;

  return (
    <View className="mb-4 flex-row" style={{ gap: 12, alignItems: "stretch" }}>
      {/* Day Play Streak — the streak count is the hero. */}
      <View
        className="flex-1 justify-between"
        style={{
          borderRadius: 16,
          backgroundColor: "#fff7ed",
          padding: 14,
          minHeight: TILE_MIN_HEIGHT,
        }}
      >
        <View className="flex-row items-center">
          <View style={{ width: FLAME_SLOT }}>
            <Text style={{ fontSize: 26 }}>🔥</Text>
          </View>
          <Text
            className="font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 34, lineHeight: 36 }}
          >
            {current}
          </Text>
        </View>
        <Text
          className="font-[jost600] text-[12px] uppercase tracking-wide text-crossed-gray-900/50"
          style={{ marginLeft: FLAME_SLOT }}
        >
          Day Play Streak
        </Text>
      </View>

      {/* Daily Duel — the whole tile is the CTA. */}
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
          style={{
            flex: 1,
            padding: 14,
            minHeight: TILE_MIN_HEIGHT,
            justifyContent: "space-between",
          }}
        >
          <View className="flex-row items-start justify-between">
            <Text style={{ fontSize: 22 }}>⚔️</Text>
            {!done && !starting && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#ef4444",
                  marginTop: 4,
                }}
              />
            )}
          </View>
          <Text className="font-[jost700] text-[17px] leading-[21px] text-crossed-gray-900">
            {done
              ? result?.seconds != null
                ? `Done · ${fmtSeconds(result.seconds)}`
                : "Done Today"
              : starting
              ? "Starting…"
              : "Play Daily Duel"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
