import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useState } from "react";
import { Avatar } from "react-native-ui-lib";
import {
  useLeaderboard,
  useMyRank,
  LeaderboardEntry,
  MyRank,
} from "../../hooks/use-leaderboard";
import { useMyProfile } from "../../hooks/use-my-profile";
import { RankBadge } from "../../components/RankBadge";
import { VariantTabs } from "../../components/VariantTabs";
import { useVariant } from "../../hooks/use-variant";
import { variantLabel, ratingForVariant } from "../../lib/variant-rating";
import { avatars } from "../../lib/images";
import colors from "../../lib/colors";

const MEDAL_BG: Record<number, string> = {
  1: "#E7B402",
  2: "#9AA4B2",
  3: "#A9712B",
};

type Scope = "GLOBAL" | "FRIENDS";

// Always-visible "this is you" card pinned above the board, so every player can
// see their own place and rating whether or not they cracked the top 100. Place
// comes from the list when I'm in it; otherwise from the /rank endpoint (GLOBAL).
const MyRankHeader = ({
  scope,
  variant,
  leaderboard,
  myProfile,
  myRank,
}: {
  scope: Scope;
  variant: string;
  leaderboard?: LeaderboardEntry[];
  myProfile?: { id: string; username?: string | null; avatar?: string | null } & Record<string, unknown>;
  myRank?: MyRank;
}) => {
  if (!myProfile) return null;
  const list = leaderboard || [];
  const idx = list.findIndex((e) => e.id === myProfile.id);
  const inList = idx >= 0;

  const place = inList
    ? idx + 1
    : scope === "GLOBAL"
    ? myRank?.rank ?? null
    : null;
  const rating = Math.round(
    (inList ? list[idx].eloRating : undefined) ??
      (scope === "GLOBAL" ? myRank?.eloRating : undefined) ??
      ratingForVariant(myProfile, variant) ??
      (myProfile.eloRating as number) ??
      0
  );
  const total = scope === "GLOBAL" ? myRank?.total : list.length;
  const notRanked = place == null;

  return (
    <View className="bg-white px-4 pb-1 pt-3">
      <View
        className="flex-row items-center rounded-2xl px-3 py-3"
        style={{ backgroundColor: colors["crossed-blue"]["450"] }}
      >
        <View className="w-11 items-center">
          <Text className="font-[jost800] text-[18px] text-white">
            {notRanked ? "—" : `#${place}`}
          </Text>
        </View>
        <Avatar
          size={40}
          name={myProfile.username || "?"}
          source={avatars[myProfile.avatar as keyof typeof avatars]}
          imageStyle={{ backgroundColor: "white" }}
        />
        <View className="ml-3 flex-1">
          <Text
            className="font-[jost700] text-[16px] text-white"
            numberOfLines={1}
          >
            You
          </Text>
          <Text
            className="font-[jost500] text-[12px] text-white/80"
            numberOfLines={1}
          >
            {notRanked
              ? "Play a ranked match to get on the board"
              : scope === "GLOBAL"
              ? `of ${(total ?? 0).toLocaleString()} worldwide`
              : `of ${total} friend${total === 1 ? "" : "s"}`}
          </Text>
        </View>
        {!notRanked && (
          <Text className="ml-2 font-[jost700] text-[19px] text-white">
            {rating}
          </Text>
        )}
      </View>
    </View>
  );
};

export default function Leaderboard() {
  const { variant } = useVariant();
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const { leaderboard, isLoadingLeaderboard, refreshLeaderboard } =
    useLeaderboard(variant, scope);
  const { myProfile } = useMyProfile();
  // Global standing for the pinned header — only needed when I'm not already in
  // the top-100 list the board fetches. Skipped on the FRIENDS board (my place
  // there is just my index in the friends list).
  const { myRank } = useMyRank(
    variant,
    scope === "GLOBAL" ? myProfile?.id : null
  );

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
            className="font-[jost700] text-[16px] text-crossed-gray-900"
            numberOfLines={1}
          >
            {item.username}
            {isMe ? " (You)" : ""}
          </Text>
          <RankBadge rating={item.eloRating} />
        </View>
        <Text className="ml-2 font-[jost700] text-[19px] text-crossed-gray-900">
          {Math.round(item.eloRating)}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-crossed-gray-50">
      <MyRankHeader
        scope={scope}
        variant={variant}
        leaderboard={leaderboard}
        myProfile={myProfile}
        myRank={myRank}
      />
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
                padding: 5,
                gap: 6,
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
                  <View key={s.key} style={{ flex: 1 }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setScope(s.key)}
                      style={{
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
                          color: active
                            ? "#fff"
                            : colors["crossed-gray"]["400"],
                        }}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <Text className="mt-3 font-[jost400] text-[13px] text-crossed-gray-400">
              {scope === "FRIENDS"
                ? `Your friends · ${variantLabel(variant)}`
                : `Top ${variantLabel(variant)} players worldwide`}
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
