import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useState } from "react";
import { Avatar } from "react-native-ui-lib";
import {
  useLeaderboard,
  useMyRank,
  LeaderboardEntry,
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

// One leaderboard row — shared by the list and the pinned "you" row at the top,
// so they're pixel-identical in format. isMe tints it light blue and appends
// "(You)". place may be null (rank not yet known) → shows a dash.
const LeaderboardRow = ({
  place,
  username,
  avatar,
  rating,
  isMe,
}: {
  place: number | null;
  username?: string | null;
  avatar?: string | null;
  rating: number;
  isMe: boolean;
}) => (
  <View
    className="mx-3 my-1 flex-row items-center rounded-2xl px-3 py-2.5"
    style={{
      backgroundColor: isMe ? colors["crossed-blue"]["50"] : "#fff",
    }}
  >
    <View className="w-8 items-center">
      {place != null && place <= 3 ? (
        <View
          className="h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: MEDAL_BG[place] }}
        >
          <Text className="font-[jost700] text-[13px] text-white">{place}</Text>
        </View>
      ) : (
        <Text className="font-[jost700] text-base text-crossed-gray-400">
          {place ?? "—"}
        </Text>
      )}
    </View>
    <Avatar
      size={40}
      name={username || "?"}
      source={avatars[avatar as keyof typeof avatars]}
      imageStyle={{ backgroundColor: "white" }}
    />
    <View className="ml-3 flex-1">
      <Text
        className="font-[jost700] text-[16px] text-crossed-gray-900"
        numberOfLines={1}
      >
        {username}
        {isMe ? " (You)" : ""}
      </Text>
      <RankBadge rating={rating} />
    </View>
    <Text className="ml-2 font-[jost700] text-[19px] text-crossed-gray-900">
      {Math.round(rating)}
    </Text>
  </View>
);

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
  }) => (
    <LeaderboardRow
      place={index + 1}
      username={item.username}
      avatar={item.avatar}
      rating={item.eloRating}
      isMe={myProfile?.id === item.id}
    />
  );

  // The pinned "you" row: my place + rating, shown at the very top of the list
  // even when I'm nowhere near the top 100. Place is my index if I'm in the
  // fetched list, otherwise the /rank endpoint's answer (GLOBAL only); rating
  // falls back to my profile so the row is never blank.
  const list = leaderboard || [];
  const myIdx = myProfile ? list.findIndex((e) => e.id === myProfile.id) : -1;
  const myPlace =
    myIdx >= 0
      ? myIdx + 1
      : scope === "GLOBAL"
      ? myRank?.rank ?? null
      : null;
  const myRating =
    (myIdx >= 0 ? list[myIdx].eloRating : undefined) ??
    (scope === "GLOBAL" ? myRank?.eloRating : undefined) ??
    ratingForVariant(myProfile, variant) ??
    (myProfile?.eloRating as number | undefined) ??
    0;

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
          {/* Pinned "you" row — same format as the list, tinted blue, always
              visible at the top even if you're outside the top 100. */}
          {myProfile && (
            <View className="pt-1">
              <LeaderboardRow
                place={myPlace}
                username={myProfile.username}
                avatar={myProfile.avatar}
                rating={myRating}
                isMe
              />
            </View>
          )}
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
