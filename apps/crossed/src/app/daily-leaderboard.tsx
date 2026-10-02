import { useRef } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { Avatar } from "react-native-ui-lib";
import { useRouter } from "expo-router";
import { Button } from "../components/Button";
import { DailyRankShareCard } from "../components/DailyRankShareCard";
import { useDailyRank, DailyRankEntry } from "../hooks/use-daily-rank";
import { fmtSeconds } from "../lib/daily-duel";
import { shareDuel } from "../lib/share-duel";
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
  const shareCardRef = useRef<View>(null);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const shareRank = () =>
    shareDuel({
      cardRef: shareCardRef,
      buildMessage: (link) => {
        if (dailyRank?.youDnf)
          return `⚔️ Crossed · Daily Duel\n😤 Today's duel got me — can you beat the clock? 🧩\n${link}`;
        const r = dailyRank?.rank;
        const p = dailyRank?.percentile;
        const tot = dailyRank?.total;
        return `⚔️ Crossed · Daily Duel\n🏆 I ranked #${r} today${
          p != null ? ` — top ${p}%` : ""
        }${tot ? ` of ${tot}` : ""}! Can you beat me? 🧩\n${link}`;
      },
    });

  const renderRow = ({ item }: { item: DailyRankEntry }) => (
    <View
      className="mx-3 my-1 flex-row items-center rounded-2xl px-3 py-2.5"
      style={{
        backgroundColor: item.isYou ? colors["crossed-blue"]["50"] : "#fff",
        opacity: item.dnf ? 0.7 : 1,
      }}
    >
      <View className="w-8 items-center">
        {item.dnf ? (
          <Text className="text-crossed-gray-300">—</Text>
        ) : item.rank != null && item.rank <= 3 ? (
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
      {item.dnf ? (
        <Text className="ml-2 font-[jost700] text-[13px] text-crossed-gray-400">
          DNF
        </Text>
      ) : (
        <Text className="ml-2 font-[jost700] text-[17px] text-crossed-gray-900">
          {fmtSeconds(item.seconds ?? 0)}
        </Text>
      )}
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
        style={{
          backgroundColor: dailyRank.youDnf
            ? colors["crossed-gray"]["400"]
            : colors["crossed-blue"]["450"],
        }}
      >
        <Text className="font-[jost800] text-white" style={{ fontSize: 26 }}>
          {dailyRank.youDnf ? "DNF" : `#${dailyRank.rank}`}
        </Text>
        <View className="ml-3 flex-1">
          {dailyRank.youDnf ? (
            <Text className="font-[jost700] text-[15px] text-white">
              You didn't beat the clock — try again tomorrow!
            </Text>
          ) : (
            <>
              <Text className="font-[jost700] text-[16px] text-white">
                Top {dailyRank.percentile}%
              </Text>
              <Text
                className="font-[jost500] text-[12px] text-white/80"
                numberOfLines={1}
              >
                Faster than {dailyRank.beatPct ?? 0}% of {dailyRank.total} players
                today
              </Text>
            </>
          )}
        </View>
        {!dailyRank.youDnf && (
          <Text className="ml-2 font-[jost700] text-[19px] text-white">
            {dailyRank.yourSeconds != null
              ? fmtSeconds(dailyRank.yourSeconds)
              : "--"}
          </Text>
        )}
      </View>
      {dailyRank.percentile != null && dailyRank.percentile <= 10 ? (
        <View
          className="mt-3 flex-row items-center justify-center rounded-2xl px-4 py-2.5"
          style={{ backgroundColor: "#fef3c7" }}
        >
          <Text style={{ fontSize: 20 }}>🏅</Text>
          <Text className="ml-2 font-[jost700] text-[14px] text-crossed-gray-900">
            Top 10% — Daily Duel medal earned!
          </Text>
        </View>
      ) : (
        dailyRank.percentile != null && (
          <View
            className="mt-3 flex-row items-center justify-center rounded-2xl px-4 py-2.5"
            style={{ backgroundColor: colors["crossed-gray"]["100"] }}
          >
            <Text style={{ fontSize: 18 }}>🏅</Text>
            <Text className="ml-2 font-[jost600] text-[13px] text-crossed-gray-600">
              You're top {dailyRank.percentile}% — reach top 10% to earn a medal
            </Text>
          </View>
        )
      )}
      <Text className="mt-3 font-[jost400] text-[13px] text-crossed-gray-400">
        Everyone who played today's duel · DNF = didn't beat the clock
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
        contentContainerStyle={{ paddingBottom: 190 }}
      />
      <View className="absolute inset-x-4 bottom-8">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="📲  Share my rank"
          onPress={shareRank}
        />
        <View className="mt-2">
          <Button
            intent="primary"
            size="lg"
            rounded="full"
            mode="outline"
            label="Done"
            onPress={done}
          />
        </View>
      </View>

      {/* Offscreen rank card — captured to a PNG on share (image on builds with
          the native module, text brag everywhere else). */}
      <View
        style={{ position: "absolute", left: -10000, top: 0 }}
        pointerEvents="none"
      >
        <DailyRankShareCard
          ref={shareCardRef}
          rank={dailyRank.rank ?? null}
          percentile={dailyRank.percentile ?? null}
          beatPct={dailyRank.beatPct ?? null}
          total={dailyRank.total ?? 0}
          yourSeconds={dailyRank.yourSeconds ?? null}
          dnf={!!dailyRank.youDnf}
          dateLabel={dateLabel}
        />
      </View>
    </View>
  );
}
