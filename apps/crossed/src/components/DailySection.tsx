import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useDaily } from "../hooks/use-daily";
import { fmtSeconds } from "../lib/daily-duel";

// Two mirrored dashboard tiles: play streak (left) and Daily Duel (right). Both
// share the exact same layout — a top row whose height is set by a big number
// (real on the left, an invisible spacer on the right) with the emoji baseline-
// aligned into it, and a label pinned to the bottom — so the emojis and labels
// line up across the two tiles. NOTE: className is dropped on
// react-native-gesture-handler TouchableOpacity, so the duel tile is inline-styled.
const TILE_MIN_HEIGHT = 88;
const EMOJI_SIZE = 28;
const NUMBER_SIZE = 34;
const FLAME_SLOT = 34; // fixed emoji column so the number's left edge is known

export const DailySection = () => {
  const { playStreak, result, starting, startDuel } = useDaily();
  const { current } = playStreak;
  const done = result != null;

  const duelLabel = done
    ? result?.seconds != null
      ? `Done · ${fmtSeconds(result.seconds)}`
      : "Done Today"
    : starting
    ? "Starting…"
    : "Play Daily Duel";

  return (
    <View className="mb-4 flex-row" style={{ gap: 12, alignItems: "stretch" }}>
      {/* Day Play Streak */}
      <View
        className="flex-1 justify-between"
        style={{
          borderRadius: 16,
          backgroundColor: "#fff7ed",
          padding: 14,
          minHeight: TILE_MIN_HEIGHT,
        }}
      >
        <View className="flex-row" style={{ alignItems: "baseline" }}>
          <Text style={{ fontSize: EMOJI_SIZE, width: FLAME_SLOT }}>🔥</Text>
          <Text
            className="font-[jost700] text-crossed-gray-900"
            style={{ fontSize: NUMBER_SIZE }}
          >
            {current}
          </Text>
        </View>
        <Text className="font-[jost600] text-[12px] uppercase tracking-wide text-crossed-gray-900/50">
          Day Play Streak
        </Text>
      </View>

      {/* Daily Duel — mirrors the streak tile's layout exactly. */}
      <View
        className="flex-1"
        style={{
          borderRadius: 16,
          backgroundColor: done ? "#dcfce7" : "#ffedd5",
          minHeight: TILE_MIN_HEIGHT,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={startDuel}
          disabled={starting || done}
          style={{ flex: 1, padding: 14, justifyContent: "space-between" }}
        >
          <View className="flex-row" style={{ alignItems: "baseline" }}>
            <Text style={{ fontSize: EMOJI_SIZE, width: FLAME_SLOT }}>⚔️</Text>
            {/* Invisible number-height spacer: keeps this row the same height as
                the streak row so the two emojis sit at the same baseline. */}
            <Text
              className="font-[jost700]"
              style={{ fontSize: NUMBER_SIZE, opacity: 0 }}
            >
              0
            </Text>
          </View>
          <Text className="font-[jost700] text-[17px] leading-[21px] text-crossed-gray-900">
            {duelLabel}
          </Text>
          {!done && !starting && (
            <View
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#ef4444",
              }}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
