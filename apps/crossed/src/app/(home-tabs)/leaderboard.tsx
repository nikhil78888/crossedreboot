import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ReactNode, useState } from "react";
import { Avatar } from "react-native-ui-lib";
import {
  useLeaderboard,
  useMyRank,
  LeaderboardEntry,
} from "../../hooks/use-leaderboard";
import {
  useSeasonLeaderboard,
  SeasonEntry,
} from "../../hooks/use-season-leaderboard";
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

type Scope = "SEASON" | "FRIENDS";

// One leaderboard row — shared by the season board, the friends rating board, and
// the pinned "you" row, so they're pixel-identical. `rightValue` is the number on
// the right (season rating or lifetime rating); `subtitle` is the small line under
// the name (a RankBadge on the friends board, a caption on the season board).
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
  const [scope, setScope] = useState<Scope>("SEASON");
  const { myProfile } = useMyProfile();
  const isSeason = scope === "SEASON";

  // SEASON = monthly rating that resets to 1000 on the 1st (per variant; the
  // launch month shows the variant's lifetime rating).
  const { season, isLoadingSeason, refreshSeason } = useSeasonLeaderboard(
    isSeason ? myProfile?.id : null,
    variant
  );
  // FRIENDS = all-time (lifetime) per-variant rating ladder.
  const { leaderboard, isLoadingLeaderboard, refreshLeaderboard } =
    useLeaderboard(variant, "FRIENDS");
  const { myRank } = useMyRank(variant, !isSeason ? myProfile?.id : null);

  const seasonCaption = (
    <Text className="font-[jost400] text-[12px] text-crossed-gray-400">
      Season rating
    </Text>
  );

  const renderSeasonRow = ({ item }: { item: SeasonEntry }) => (
    <LeaderboardRow
      place={item.rank}
      username={item.username}
      avatar={item.avatar}
      isMe={myProfile?.id === item.profileId}
      rightValue={String(item.seasonRating)}
      subtitle={seasonCaption}
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

  // Friends pinned "you" row values.
  const ratingList = leaderboard || [];
  const myIdx = myProfile
    ? ratingList.findIndex((e) => e.id === myProfile.id)
    : -1;
  const myRatingPlace = myIdx >= 0 ? myIdx + 1 : myRank?.rank ?? null;
  const myRating =
    (myIdx >= 0 ? ratingList[myIdx].eloRating : undefined) ??
    myRank?.eloRating ??
    ratingForVariant(myProfile, variant) ??
    (myProfile?.eloRating as number | undefined) ??
    0;

  // Season percentile → progress toward the top-10% medal.
  const myPct =
    season?.myRank && season?.total
      ? Math.max(1, Math.ceil((100 * season.myRank) / season.total))
      : null;

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
          { key: "SEASON", label: "🏆  Season" },
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
        {/* Game-type tabs stay visible on every view. */}
        <VariantTabs />
        {scopeToggle}

        {isSeason ? (
          <View
            className="mt-3 rounded-2xl px-4 py-3"
            style={{ backgroundColor: colors["crossed-blue"]["450"] }}
          >
            <Text className="font-[jost700] text-[15px] text-white">
              🏆 {season?.monthName ?? "This Month"} Season · Top 10% earn a medal
            </Text>
            <Text className="mt-0.5 font-[jost500] text-[12px] text-white/85">
              {season?.resetActive === false
                ? `Overall ratings · fresh season starts in ${
                    season?.resetsInDays ?? 0
                  } day${season?.resetsInDays === 1 ? "" : "s"}`
                : `Everyone starts at 1000 · ${
                    season
                      ? `resets in ${season.resetsInDays} day${
                          season.resetsInDays === 1 ? "" : "s"
                        }`
                      : "resets monthly"
                  }`}
            </Text>
            {myPct != null && (
              <Text className="mt-1 font-[jost700] text-[12px] text-white">
                {myPct <= 10
                  ? `You're top ${myPct}% — on track for a medal 🏅`
                  : `You're top ${myPct}% — reach top 10% for a medal`}
              </Text>
            )}
          </View>
        ) : (
          <Text className="mt-3 font-[jost400] text-[13px] text-crossed-gray-400">
            {`Your friends · ${variantLabel(variant)} (overall rating)`}
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
            rightValue={String(season?.myRating ?? 1000)}
            subtitle={seasonCaption}
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
    ? "No ranked games yet this season — play a ranked match to get on the board!"
    : "Add friends to see them ranked here!";

  const emptyBlock = loading ? (
    <ActivityIndicator className="mt-10" />
  ) : (
    <Text className="mt-10 text-center font-[jost400] text-crossed-gray-400">
      {emptyText}
    </Text>
  );

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
          ListEmptyComponent={emptyBlock}
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
          ListEmptyComponent={emptyBlock}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
