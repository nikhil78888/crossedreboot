import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import {
  useMedals,
  Medal,
  markMedalsSeen,
  isSeasonMedal,
  isDailyMedal,
  seasonMedalVariant,
} from "../hooks/use-medals";
import { useMyProfile } from "../hooks/use-my-profile";
import { Button } from "../components/Button";
import { variantLabel } from "../lib/variant-rating";
import colors from "../lib/colors";

const fmtDaily = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};
const fmtMonthly = (key: string) => {
  const d = new Date(`${key}-01T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const MedalRow = ({ medal }: { medal: Medal }) => {
  const isDaily = isDailyMedal(medal);
  const emoji = isDaily ? "🏅" : "🏆";
  const variant = seasonMedalVariant(medal);
  const title = isDaily
    ? `Daily Duel · ${fmtDaily(medal.periodKey)}`
    : `${fmtMonthly(medal.periodKey)}${
        variant ? ` ${variantLabel(variant)}` : ""
      } Season`;
  const detail =
    medal.rank != null && medal.total != null
      ? `Top ${medal.percentile ?? 10}% · #${medal.rank} of ${medal.total}`
      : `Top ${medal.percentile ?? 10}%`;
  return (
    <View
      className="mx-4 my-1.5 flex-row items-center rounded-2xl bg-white px-4 py-3"
      style={{
        borderWidth: 1,
        borderColor: colors["crossed-gray"]["100"],
      }}
    >
      <Text style={{ fontSize: 34 }}>{emoji}</Text>
      <View className="ml-3 flex-1">
        <Text className="font-[jost700] text-[16px] text-crossed-gray-900">
          {title}
        </Text>
        <Text className="mt-0.5 font-[jost500] text-[13px] text-crossed-gray-500">
          {detail}
        </Text>
      </View>
    </View>
  );
};

export default function Medals() {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { medals, isLoadingMedals } = useMedals(myProfile?.id);
  const done = () => (router.canGoBack() ? router.back() : router.replace("/"));

  // Opening the trophy case acknowledges every medal earned so far — clears the
  // "new medal" badge on the dashboard.
  useEffect(() => {
    if (medals) markMedalsSeen(medals.length);
  }, [medals]);

  const dailyCount = medals?.filter(isDailyMedal).length ?? 0;
  const seasonCount = medals?.filter(isSeasonMedal).length ?? 0;

  if (isLoadingMedals && !medals) {
    return (
      <View className="flex-1 bg-crossed-gray-50">
        <ActivityIndicator className="mt-16" />
      </View>
    );
  }

  const header = (
    <View className="px-4 pb-2 pt-4">
      <View className="flex-row" style={{ gap: 12 }}>
        <View
          className="flex-1 items-center rounded-2xl bg-white px-3 py-4"
          style={{ borderWidth: 1, borderColor: colors["crossed-gray"]["100"] }}
        >
          <Text style={{ fontSize: 28 }}>🏅</Text>
          <Text className="mt-1 font-[jost800] text-[22px] text-crossed-gray-900">
            {dailyCount}
          </Text>
          <Text className="font-[jost500] text-[12px] text-crossed-gray-500">
            Daily Duel
          </Text>
        </View>
        <View
          className="flex-1 items-center rounded-2xl bg-white px-3 py-4"
          style={{ borderWidth: 1, borderColor: colors["crossed-gray"]["100"] }}
        >
          <Text style={{ fontSize: 28 }}>🏆</Text>
          <Text className="mt-1 font-[jost800] text-[22px] text-crossed-gray-900">
            {seasonCount}
          </Text>
          <Text className="font-[jost500] text-[12px] text-crossed-gray-500">
            Season
          </Text>
        </View>
      </View>
      <Text className="mt-4 font-[jost400] text-[13px] text-crossed-gray-400">
        Finish in the top 10% of a Daily Duel or a monthly Season to earn a medal.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-crossed-gray-50">
      <FlatList
        data={medals || []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MedalRow medal={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View className="items-center px-8 pt-8">
            <Text style={{ fontSize: 44 }}>🏅</Text>
            <Text className="mt-3 text-center font-[jost600] text-[15px] text-crossed-gray-600">
              No medals yet. Place in the top 10% of a Daily Duel or the monthly
              Season to earn your first!
            </Text>
          </View>
        }
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
