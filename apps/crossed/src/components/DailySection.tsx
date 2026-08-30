import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useDaily } from "../hooks/use-daily";
import { fmtSeconds } from "../lib/daily-duel";

// The "Daily" block at the top of Home: two streaks (Play + Goal), the Daily
// Duel (race a funny-named opponent whose time is preset for the day), and the
// Daily Goal. NOTE: className is silently dropped on react-native-gesture-handler
// TouchableOpacity, so its layout/colors are inline; the RN children use className.
export const DailySection = () => {
  const { meta, playStreak, goalStreak, goal, starting, startDuel } = useDaily();
  const variantLabel =
    meta.variant === "WORD_SEARCH" ? "word search" : "crossword";

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Streaks — play streak left, goal streak right */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text style={{ fontSize: 24 }}>🔥</Text>
          <Text className="ml-1 font-[jost700] text-[19px] text-crossed-gray-900">
            {playStreak.current}
          </Text>
          <Text className="ml-1 font-[jost500] text-[12px] text-crossed-gray-900/50">
            play streak
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text style={{ fontSize: 24 }}>🎯</Text>
          <Text className="ml-1 font-[jost700] text-[19px] text-crossed-gray-900">
            {goalStreak.current}
          </Text>
          <Text className="ml-1 font-[jost500] text-[12px] text-crossed-gray-900/50">
            goal streak
          </Text>
        </View>
      </View>

      {/* Daily Duel */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={startDuel}
        disabled={starting}
        style={{ borderRadius: 16, backgroundColor: "#fff7ed", padding: 12 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-[jost600] text-[11px] tracking-wide text-crossed-gray-900/50">
              {`DAILY DUEL${playStreak.doneToday ? " · DONE ✅" : ""}`}
            </Text>
            <Text className="mt-0.5 font-[jost700] text-[16px] text-crossed-gray-900">
              Race {meta.opponent}
            </Text>
            <Text className="mt-0.5 font-[jost400] text-[12px] text-crossed-gray-900/60">
              Beat their {variantLabel} time: {fmtSeconds(meta.seconds)}
            </Text>
          </View>
          <View
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: "#f97316" }}
          >
            <Text className="font-[jost700] text-[14px] text-white">
              {starting ? "…" : playStreak.doneToday ? "Replay" : "Race"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Daily Goal — compact single line */}
      <View
        className="mt-2 flex-row items-center"
        style={{ borderRadius: 14, backgroundColor: "#eff6ff", padding: 10 }}
      >
        <Text style={{ fontSize: 16 }}>🎯</Text>
        <Text className="ml-2 font-[jost600] text-[12px] uppercase tracking-wide text-crossed-gray-900/45">
          Daily Goal
        </Text>
        <Text className="ml-2 flex-1 font-[jost500] text-[13px] text-crossed-gray-900/70">
          {goal.done ? "Complete! 🎉" : goal.label}
        </Text>
        <Text className="font-[jost700] text-[13px] text-crossed-gray-900/60">
          {goal.progress}/{goal.target}
        </Text>
      </View>
    </View>
  );
};
