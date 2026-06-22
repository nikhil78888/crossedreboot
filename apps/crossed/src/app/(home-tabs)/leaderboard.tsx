import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useState } from "react";
import { Avatar } from "react-native-ui-lib";
import { useLeaderboard, LeaderboardEntry } from "../../hooks/use-leaderboard";
import { useMyProfile } from "../../hooks/use-my-profile";
import { RankBadge } from "../../components/RankBadge";
import { VariantTabs } from "../../components/VariantTabs";
import { useVariant } from "../../hooks/use-variant";
import { avatars } from "../../lib/images";
import colors from "../../lib/colors";

const MEDAL_BG: Record<number, string> = {
  1: "#E7B402",
  2: "#9AA4B2",
  3: "#A9712B",
};

type Scope = "GLOBAL" | "FRIENDS";

export default function Leaderboard() {
  const { variant } = useVariant();
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const { leaderboard, isLoadingLeaderboard, refreshLeaderboard } =
    useLeaderboard(variant, scope);
  const { myProfile } = useMyProfile();

  const renderRow = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => {
    const place = index + 1;
    const isMe = myProfile?.id === item.id;
    return (
      <View
        className="mx-3 my-1 flex-row items-center rounded-2xl px-3 py-2.5"
        style={{
          backgroundColor: isMe ? colors["crossed-blue"]["50"] : "#fff",
        }}
      >
        <View className="w-8 items-center">
          {place <= 3 ? (
            <View
              className="h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: MEDAL_BG[place] }}
            >
              <Text className="font-[jost700] text-[13px] text-white">
                {place}
              </Text>
            </View>
          ) : (
            <Text className="font-[jost700] text-base text-crossed-gray-400">
              {place}
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
            className="font-[jost700] text-[15px] text-crossed-gray-900"
            numberOfLines={1}
          >
            {item.username}
            {isMe ? " (You)" : ""}
          </Text>
          <RankBadge rating={item.eloRating} />
        </View>
        <Text className="ml-2 font-[jost700] text-base text-crossed-gray-900">
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
          <View className="bg-white px-4 pb-2 pt-2">
            <VariantTabs />
            {/* Global / Friends scope */}
            <View
              style={{
                flexDirection: "row",
                marginTop: 12,
                borderRadius: 9999,
                padding: 4,
                backgroundColor: colors["crossed-gray"]["100"],
              }}
            >
              {(
                [
                  { key: "GLOBAL", label: "🌐  Global" },
                  { key: "FRIENDS", label: "👥  Friends" },
                ] as { key: Scope; label: string }[]
              ).map((s) => {
                const active = scope === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    activeOpacity={0.8}
                    onPress={() => setScope(s.key)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 9999,
                      paddingVertical: 9,
                      backgroundColor: active
                        ? colors["crossed-blue"]["450"]
                        : "transparent",
                    }}
                  >
                    <Text
                      className="font-[jost600] text-[14px]"
                      style={{
                        color: active ? "#fff" : colors["crossed-gray"]["400"],
                      }}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="mt-3 font-[jost400] text-[13px] text-crossed-gray-400">
              {scope === "FRIENDS"
                ? `Your friends · ${
                    variant === "SUDOKU" ? "Sudoku" : "Crosswords"
                  }`
                : `Top ${
                    variant === "SUDOKU" ? "Sudoku" : "Crossword"
                  } players worldwide`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoadingLeaderboard ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <Text className="mt-10 text-center font-[jost400] text-crossed-gray-400">
              {scope === "FRIENDS"
                ? "Add friends to see them ranked here!"
                : "No players yet — play a ranked match to get on the board!"}
            </Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
