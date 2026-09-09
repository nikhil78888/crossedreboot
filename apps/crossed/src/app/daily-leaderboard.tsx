import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { Avatar } from "react-native-ui-lib";
import { useRouter } from "expo-router";
import { Button } from "../components/Button";
import { useDailyRank, DailyRankEntry } from "../hooks/use-daily-rank";
import { fmtSeconds } from "../lib/daily-duel";
import { avatars } from "../lib/images";
import colors from "../lib/colors";

const MEDAL_BG: Record<number, string> = {
  1: "#E7B402",
  2: "#9AA4B2",
  3: "#A9712B",
};

// Today's Daily Duel leaderboard: your rank + percentile, then the full ranked
// list of everyone who finished the same puzzle (your row highlighted).
export default function DailyLeaderboard() {
  const router = useRouter();
  const { dailyRank, isLoadingDailyRank } = useDailyRank();
  const done = () => router.replace("/(home-tabs)/home");

  const renderRow = ({ item }: { item: DailyRankEntry }) => (
    <View
      className="mx-3 my-1 flex-row items-center rounded-2xl px-3 py-2.5"
      style={{ backgroundColor: item.isYou ? colors["crossed-blue"]["50"] : "#fff" }}
    >
      <View className="w-8 items-center">
        {item.rank <= 3 ? (
          <View
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: MEDAL_BG[item.rank] }}
          >
            <Text className="font-[jost700] text-[13px] text-white">
              {item.rank}
            </Text>
          </View>
        ) : (
          <Text className="font-[jost700] text-base text-crossed-gray-400">
            {item.rank}
          </Text>
        )}
      </View>
      <Avatar
        size={40}
        name={item.username || "?"}
        source={avatars[item.avatar as keyof typeof avatars]}
        imageStyle={{ backgroundColor: "white" }}
      />
      <View className="ml-3 flex-1">
        <Text
          className="font-[jost700] text-[16px] text-crossed-gray-900"
          numberOfLines={1}
        >
          {item.username}
          {item.isYou ? " (You)" : ""}
        </Text>
      </View>
      <Text className="ml-2 font-[jost700] text-[17px] text-crossed-gray-900">
        {fmtSeconds(item.seconds)}
      </Text>
    </View>
  );

  if (isLoadingDailyRank && !dailyRank) {
    return (
      <View className="flex-1 bg-white">
        <ActivityIndicator className="mt-16" />
      </View>
    );
  }

  if (!dailyRank?.played) {
    return (
      <View className="flex-1 items-center bg-white px-6 pt-12">
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
    );
  }

  const header = (
    <View className="bg-white px-4 pb-2 pt-4">
      <Text className="text-center font-[jost600] text-[12px] uppercase tracking-widest text-crossed-gray-400">
        Today's Daily Duel
      </Text>
      {/* Your standing */}
      <View
        className="mt-3 flex-row items-center rounded-2xl px-4 py-3"
        style={{ backgroundColor: colors["crossed-blue"]["450"] }}
      >
        <Text className="font-[jost800] text-white" style={{ fontSize: 26 }}>
          #{dailyRank.rank}
        </Text>
        <View className="ml-3 flex-1">
          <Text className="font-[jost700] text-[16px] text-white">
            Top {dailyRank.percentile}%
          </Text>
          <Text
            className="font-[jost500] text-[12px] text-white/80"
            numberOfLines={1}
          >
            Faster than {dailyRank.beatPct ?? 0}% of {dailyRank.total} players today
          </Text>
        </View>
        <Text className="ml-2 font-[jost700] text-[19px] text-white">
          {dailyRank.yourSeconds != null
            ? fmtSeconds(dailyRank.yourSeconds)
            : "--"}
        </Text>
      </View>
      <Text className="mt-3 font-[jost400] text-[13px] text-crossed-gray-400">
        Everyone who finished today's duel
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-crossed-gray-50">
      <FlatList
        data={dailyRank.entries || []}
        keyExtractor={(i) => i.profileId}
        renderItem={renderRow}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 110 }}
      />
      <View className="absolute inset-x-4 bottom-8">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="Done"
          onPress={done}
        />
      </View>
    </View>
  );
}
