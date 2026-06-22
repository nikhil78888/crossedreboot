import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { useLeaderboard, LeaderboardEntry } from "../../hooks/use-leaderboard";
import { useMyProfile } from "../../hooks/use-my-profile";
import { RankBadge } from "../../components/RankBadge";
import { useVariant } from "../../hooks/use-variant";
import { VariantTabs } from "../../components/VariantTabs";

const medal = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

export default function Leaderboard() {
  // Shares the app-wide variant selection, so the board matches whatever the
  // player picked on Home — and can be switched here too.
  const { variant } = useVariant();
  const { leaderboard, isLoadingLeaderboard, refreshLeaderboard } =
    useLeaderboard(variant);
  const { myProfile } = useMyProfile();

  if (isLoadingLeaderboard && !leaderboard) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  const renderRow = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const place = index + 1;
    const isMe = myProfile?.id === item.id;
    return (
      <View
        className={`flex-row items-center px-4 py-3 mx-3 my-1 rounded-2xl ${
          isMe ? "bg-crossed-blue-50" : "bg-white"
        }`}
      >
        <View className="w-9 items-center">
          {medal(place) ? (
            <Text style={{ fontSize: 20 }}>{medal(place)}</Text>
          ) : (
            <Text className="font-[jost700] text-base text-crossed-gray-400">{place}</Text>
          )}
        </View>
        <View className="flex-1 ml-2">
          <Text
            className="font-[jost600] text-base text-crossed-gray-900"
            numberOfLines={1}
          >
            {item.username}
            {isMe ? " (you)" : ""}
          </Text>
          <RankBadge rating={item.eloRating} />
        </View>
        <Text className="font-[jost700] text-base text-crossed-gray-900 ml-2">
          {Math.round(item.eloRating)}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-crossed-gray-50">
      <FlatList
        data={leaderboard || []}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        refreshing={isLoadingLeaderboard}
        onRefresh={refreshLeaderboard}
        ListHeaderComponent={
          <View>
            {/* Per-variant ladder switch (shared app-wide) */}
            <View className="bg-white px-4 pt-2">
              <VariantTabs />
            </View>
            <View className="px-4 pt-4 pb-2">
              <Text className="font-[jost700] text-2xl text-crossed-gray-900">
                Global Leaderboard
              </Text>
              <Text className="font-[jost400] text-sm text-crossed-gray-400 mt-1">
                Top {variant === "SUDOKU" ? "Sudoku" : "Crossword"} players
                worldwide
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text className="text-center mt-10 font-[jost400] text-crossed-gray-400">
            No players yet — play a ranked match to get on the board!
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
