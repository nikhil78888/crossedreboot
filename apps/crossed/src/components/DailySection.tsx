import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useDaily } from "../hooks/use-daily";
import { fmtSeconds } from "../lib/daily-duel";

// The "Daily" block at the top of Home: the streak flame, the Daily Duel (race a
// funny-named opponent whose time is preset for the day), and the Daily Goal.
// NOTE: className is silently dropped on react-native-gesture-handler's
// TouchableOpacity, so its layout/colors are inline styles; the RN <View>/<Text>
// children use className fine.
export const DailySection = () => {
  const { meta, streak, goal, starting, startDuel } = useDaily();
  const variantLabel =
    meta.variant === "WORD_SEARCH" ? "word search" : "crossword";

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Streak flame */}
      <View className="mb-3 flex-row items-center">
        <Text style={{ fontSize: 26 }}>🔥</Text>
        <Text className="ml-1.5 font-[jost700] text-[20px] text-crossed-gray-900">
          {streak.current}
        </Text>
        <Text className="ml-1 font-[jost500] text-[13px] text-crossed-gray-900/50">
          day streak{streak.playedToday ? " · played today" : ""}
        </Text>
      </View>

      {/* Daily Duel */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={startDuel}
        disabled={starting}
        style={{ borderRadius: 16, backgroundColor: "#fff7ed", padding: 18 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-[jost600] text-[12px] tracking-wide text-crossed-gray-900/50">
              {`TODAY'S DUEL${streak.playedToday ? " · DONE ✅" : ""}`}
            </Text>
            <Text className="mt-1 font-[jost700] text-[18px] text-crossed-gray-900">
              Race {meta.opponent}
            </Text>
            <Text className="mt-0.5 font-[jost400] text-[13px] text-crossed-gray-900/60">
              Beat their {variantLabel} time: {fmtSeconds(meta.seconds)}
            </Text>
          </View>
          <View
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: "#f97316" }}
          >
            <Text className="font-[jost700] text-[14px] text-white">
              {starting ? "…" : streak.playedToday ? "Replay" : "Race"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Daily Goal */}
      <View
        className="mt-2.5 flex-row items-center"
        style={{ borderRadius: 16, backgroundColor: "#eff6ff", padding: 14 }}
      >
        <Text style={{ fontSize: 20 }}>🎯</Text>
        <View className="ml-2.5 flex-1">
          <Text className="font-[jost600] text-[14px] text-crossed-gray-900">
            {goal.done ? "Daily Goal complete! 🎉" : goal.label}
          </Text>
          <Text className="mt-0.5 font-[jost400] text-[12px] text-crossed-gray-900/55">
            {goal.progress}/{goal.target}
          </Text>
        </View>
      </View>
    </View>
  );
};
