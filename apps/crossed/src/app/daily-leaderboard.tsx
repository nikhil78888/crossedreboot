import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../components/Button";
import { useDailyRank } from "../hooks/use-daily-rank";
import { fmtSeconds } from "../lib/daily-duel";

// Today's Daily Duel leaderboard: your rank + percentile among everyone who
// played the same puzzle. Shown right after the duel and from the Duel tab.
export default function DailyLeaderboard() {
  const router = useRouter();
  const { dailyRank, isLoadingDailyRank } = useDailyRank();
  const done = () => router.replace("/(home-tabs)/home");

  return (
    <View className="flex-1 bg-white px-6 pt-10">
      <Text className="text-center font-[jost600] text-[12px] uppercase tracking-widest text-crossed-gray-400">
        Today's Daily Duel
      </Text>
      <Text className="mt-1 text-center font-[jost700] text-[26px] text-crossed-gray-900">
        Where you rank
      </Text>

      {isLoadingDailyRank && !dailyRank ? (
        <ActivityIndicator className="mt-16" />
      ) : !dailyRank?.played ? (
        <View className="mt-16 items-center">
          <Text style={{ fontSize: 46 }}>⚔️</Text>
          <Text className="mt-4 text-center font-[jost600] text-[16px] text-crossed-gray-600">
            Finish today's duel to get ranked against everyone else.
          </Text>
          <View className="mt-10 w-full">
            <Button
              intent="primary"
              size="xl"
              rounded="full"
              label="Back to Home"
              onPress={done}
            />
          </View>
        </View>
      ) : (
        <View className="mt-10 items-center">
          <Text style={{ fontSize: 46 }}>🏅</Text>
          <Text
            className="mt-3 font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 54, lineHeight: 58 }}
          >
            #{dailyRank.rank}
          </Text>
          <Text className="mt-1 font-[jost500] text-[15px] text-crossed-gray-500">
            of {(dailyRank.total ?? 0).toLocaleString()} players today
          </Text>

          {/* Percentile bar — how much of the field you're ahead of. */}
          <View className="mt-9 w-full">
            <View className="h-3 w-full overflow-hidden rounded-full bg-crossed-gray-100">
              <View
                className="h-3 rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(4, dailyRank.beatPct ?? 0))}%`,
                  backgroundColor: "#16a34a",
                }}
              />
            </View>
            <Text className="mt-4 text-center font-[jost700] text-[20px] text-crossed-gray-900">
              Top {dailyRank.percentile}%
            </Text>
            <Text className="mt-1 text-center font-[jost500] text-[14px] text-crossed-gray-500">
              Faster than {dailyRank.beatPct ?? 0}% of players
            </Text>
          </View>

          <Text className="mt-9 font-[jost500] text-[12px] uppercase tracking-widest text-crossed-gray-400">
            your time
          </Text>
          <Text
            className="mt-1 font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 34 }}
          >
            {dailyRank.yourSeconds != null
              ? fmtSeconds(dailyRank.yourSeconds)
              : "--"}
          </Text>

          <View className="mt-10 w-full">
            <Button
              intent="primary"
              size="xl"
              rounded="full"
              label="Done"
              onPress={done}
            />
          </View>
        </View>
      )}
    </View>
  );
}
