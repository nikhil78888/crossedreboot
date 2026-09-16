import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ReactNode, useState } from "react";
import { Avatar } from "react-native-ui-lib";
import { useLeaderboard, useMyRank } from "../../hooks/use-leaderboard";
import {
  useSeasonLeaderboard,
  SeasonEntry,
} from "../../hooks/use-season-leaderboard";
import { LeaderboardEntry } from "../../hooks/use-leaderboard";
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

// One leaderboard row — shared by the season board, the rating (friends) board,
// and the pinned "you" row, so they're pixel-identical. `rightValue` is the
// number shown on the right (rating or season wins); `subtitle` is the small line
// under the name (a RankBadge on the rating board, a caption on the season board).
const LeaderboardRow = ({
  place,
  username,
  avatar,
  isMe,
  rightValue,
  subtitle,
}: {
  place: number | null;
  username?: string | null;
  avatar?: string | null;
  isMe: boolean;
  rightValue: string;
  subtitle?: ReactNode;
}) => (
  <View
    className="mx-3 my-1 flex-row items-center rounded-2xl px-3 py-2.5"
    style={{ backgroundColor: isMe ? colors["crossed-blue"]["50"] : "#fff" }}
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
      {subtitle}
    </View>
    <Text className="ml-2 font-[jost700] text-[19px] text-crossed-gray-900">
      {rightValue}
    </Text>
  </View>
);

export default function Leaderboard() {
  const { variant } = useVariant();
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const { myProfile } = useMyProfile();
  const isSeason = scope === "GLOBAL";

  // GLOBAL = monthly season (ranked wins this month, resets on the 1st).
  const { season, isLoadingSeason, refreshSeason } = useSeasonLeaderboard(
    isSeason ? myProfile?.id : null
  );
  // FRIENDS = all-time per-variant rating ladder.
  const { leaderboard, isLoadingLeaderboard, refreshLeaderboard } =
    useLeaderboard(variant, "FRIENDS");
  const { myRank } = useMyRank(variant, !isSeason ? myProfile?.id : null);

  const seasonWinsCaption = (
    <Text className="font-[jost400] text-[12px] text-crossed-gray-400">
      Season wins
    </Text>
  );

  const renderSeasonRow = ({ item }: { item: SeasonEntry }) => (
    <LeaderboardRow
      place={item.rank}
      username={item.username}
      avatar={item.avatar}
      isMe={myProfile?.id === item.profileId}
      rightValue={String(item.seasonScore)}
      subtitle={seasonWinsCaption}
    />
  );

  const renderRatingRow = ({
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
      isMe={myProfile?.id === item.id}
      rightValue={String(Math.round(item.eloRating))}
      subtitle={<RankBadge rating={item.eloRating} />}
    />
  );

  // Pinned "you" row values.
  const ratingList = leaderboard || [];
  const myIdx = myProfile ? ratingList.findIndex((e) => e.id === myProfile.id) : -1;
  const myRatingPlace = myIdx >= 0 ? myIdx + 1 : myRank?.rank ?? null;
  const myRating =
    (myIdx >= 0 ? ratingList[myIdx].eloRating : undefined) ??
    myRank?.eloRating ??
    ratingForVariant(myProfile, variant) ??
    (myProfile?.eloRating as number | undefined) ??
    0;

  const loading = isSeason ? isLoadingSeason : isLoadingLeaderboard;
  const refresh = isSeason ? refreshSeason : refreshLeaderboard;

  const scopeToggle = (
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
          { key: "GLOBAL", label: "🏆  Season" },
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
                style={{ color: active ? "#fff" : colors["crossed-gray"]["400"] }}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  const header = (
    <View>
      <View className="bg-white px-4 pb-2 pt-2">
        {/* Variant ladders only apply to the all-time rating (Friends) board. */}
        {!isSeason && <VariantTabs />}
        {scopeToggle}

        {isSeason ? (
          <View
            className="mt-3 rounded-2xl px-4 py-3"
            style={{ backgroundColor: colors["crossed-blue"]["450"] }}
          >
            <Text className="font-[jost700] text-[17px] text-white">
              🏆 {season?.monthName ?? "This Month"}’s Season
            </Text>
            <Text className="mt-0.5 font-[jost500] text-[12px] text-white/85">
              {season
                ? `Resets in ${season.resetsInDays} day${
                    season.resetsInDays === 1 ? "" : "s"
                  } · Top 10% earn a medal`
                : "Ranked wins this month · resets monthly"}
            </Text>
          </View>
        ) : (
          <Text className="mt-3 font-[jost400] text-[13px] text-crossed-gray-400">
            {`Your friends · ${variantLabel(variant)}`}
          </Text>
        )}
      </View>

      {/* Pinned "you" row. */}
      {myProfile && isSeason && (
        <View className="pt-1">
          <LeaderboardRow
            place={season?.myRank ?? null}
            username={myProfile.username}
            avatar={myProfile.avatar}
            isMe
            rightValue={String(season?.myScore ?? 0)}
            subtitle={seasonWinsCaption}
          />
        </View>
      )}
      {myProfile && !isSeason && (
        <View className="pt-1">
          <LeaderboardRow
            place={myRatingPlace}
            username={myProfile.username}
            avatar={myProfile.avatar}
            isMe
            rightValue={String(Math.round(myRating))}
            subtitle={<RankBadge rating={myRating} />}
          />
        </View>
      )}
    </View>
  );

  const emptyText = isSeason
    ? "No ranked wins yet this season — play a ranked match to get on the board!"
    : "Add friends to see them ranked here!";

  return (
    <View className="flex-1 bg-crossed-gray-50">
      {isSeason ? (
        <FlatList
          data={season?.entries || []}
          keyExtractor={(item) => item.profileId}
          renderItem={renderSeasonRow}
          refreshing={loading}
          onRefresh={refresh}
          ListHeaderComponent={header}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator className="mt-10" />
            ) : (
              <Text className="mt-10 text-center font-[jost400] text-crossed-gray-400">
                {emptyText}
              </Text>
            )
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      ) : (
        <FlatList
          data={leaderboard || []}
          keyExtractor={(item) => item.id}
          renderItem={renderRatingRow}
          refreshing={loading}
          onRefresh={refresh}
          ListHeaderComponent={header}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator className="mt-10" />
            ) : (
              <Text className="mt-10 text-center font-[jost400] text-crossed-gray-400">
                {emptyText}
              </Text>
            )
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
