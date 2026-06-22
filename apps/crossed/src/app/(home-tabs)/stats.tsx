import { Text, View } from "react-native";
import useSWR from "swr";
import { ScrollView } from "react-native-gesture-handler";
import { formatDistanceToNowStrict } from "date-fns";
import { useStats } from "../../hooks/use-stats";
import { useMyProfile } from "../../hooks/use-my-profile";
import { useVariant } from "../../hooks/use-variant";
import { VariantTabs } from "../../components/VariantTabs";
import { getRank } from "../../lib/rank";
import { supabase } from "../../lib/supabase";
import colors from "../../lib/colors";

type Activity = {
  id: string;
  opponent: string;
  result: "WON" | "LOST" | "TIE";
  createdAt: string;
};

const useRecentActivity = (
  variant: "CROSSWORD" | "SUDOKU",
  profileId?: string
) => {
  const { data } = useSWR(
    profileId ? ["recent-activity", profileId, variant] : null,
    async (): Promise<Activity[]> => {
      const { data: games } = await supabase
        .from("games")
        .select("id, winnerId, createdAt, profiles!gamePlayers!inner(id)")
        .eq("gameType", "RANKED")
        .eq("gameVariant", variant)
        .eq("playState", "COMPLETED")
        .filter("profiles.id", "eq", profileId)
        .order("createdAt", { ascending: false })
        .limit(6);
      const ids = (games ?? []).map((g) => g.id);
      if (!ids.length) return [];
      const { data: opps } = await supabase
        .from("gamePlayers")
        .select("gamesId, profilesId, profiles(username)")
        .in("gamesId", ids)
        .neq("profilesId", profileId);
      const oppMap = new Map(
        (opps ?? []).map((o) => [
          o.gamesId,
          (o.profiles as { username?: string } | null)?.username ?? "Opponent",
        ])
      );
      return (games ?? []).map((g) => ({
        id: g.id,
        opponent: oppMap.get(g.id) ?? "Opponent",
        result:
          g.winnerId === profileId
            ? "WON"
            : g.winnerId
            ? "LOST"
            : "TIE",
        createdAt: g.createdAt as string,
      }));
    }
  );
  return data ?? [];
};

export default function Stats() {
  const { variant } = useVariant();
  const { stats } = useStats(variant);
  const { myProfile } = useMyProfile();
  const rating =
    variant === "SUDOKU"
      ? (myProfile as { eloRatingSudoku?: number })?.eloRatingSudoku
      : myProfile?.eloRating;
  const rank = getRank(rating);
  const activity = useRecentActivity(variant, myProfile?.id);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      className="flex-1 bg-white px-4"
    >
      <View className="pt-2">
        <VariantTabs />
      </View>

      {/* Rating hero */}
      <View
        className="mt-4 rounded-3xl p-5"
        style={{ backgroundColor: colors["crossed-blue"]["450"] }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text
              className="font-[rubik700] text-[68px] leading-none"
              style={{ color: "#ffffff" }}
            >
              {rating != null ? Math.round(rating) : "—"}
            </Text>
            <Text
              className="mt-1 font-[jost600] text-[18px]"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {variant === "SUDOKU" ? "Sudoku Rating" : "Crossword Rating"}
            </Text>
          </View>
          <View className="items-center">
            <Text style={{ fontSize: 52 }}>{rank.emoji}</Text>
            <Text className="mt-1 font-[jost700] text-[15px] text-white">
              {rank.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Stat cards */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <View
          style={{ flex: 1 }}
          className="rounded-2xl border border-crossed-gray-100 px-5 py-5"
        >
          <Text style={{ fontSize: 24 }}>🎮</Text>
          <Text className="mt-2 font-[rubik700] text-[32px] text-crossed-gray-900">
            {stats?.gamesPlayed ?? 0}
          </Text>
          <Text className="mt-0.5 font-[jost600] text-[13px] text-crossed-gray-400">
            Games Played
          </Text>
        </View>
        <View
          style={{ flex: 1 }}
          className="rounded-2xl border border-crossed-gray-100 px-5 py-5"
        >
          <Text style={{ fontSize: 24 }}>🏆</Text>
          <Text className="mt-2 font-[rubik700] text-[32px] text-crossed-gray-900">
            {stats?.gamesWon ?? 0}
          </Text>
          <Text className="mt-0.5 font-[jost600] text-[13px] text-crossed-gray-400">
            Games Won
          </Text>
        </View>
      </View>

      {/* Recent activity */}
      <View className="mt-5 rounded-2xl border border-crossed-gray-100 px-5 py-4">
        <Text className="font-[jost700] text-[17px] text-crossed-gray-900">
          Recent Activity
        </Text>
        {activity.length === 0 ? (
          <Text className="mt-3 font-[jost400] text-sm text-crossed-gray-400">
            No ranked {variant === "SUDOKU" ? "Sudoku" : "Crossword"} games yet —
            play one to see it here.
          </Text>
        ) : (
          activity.map((a, i) => (
            <View
              key={a.id}
              className={`flex-row items-center py-3 ${
                i > 0 ? "border-t border-crossed-gray-100" : ""
              }`}
            >
              <Text className="w-5 font-[jost700] text-crossed-gray-400">
                {i + 1}
              </Text>
              <Text
                className="flex-1 font-[jost600] text-[15px] text-crossed-gray-900"
                numberOfLines={1}
              >
                vs {a.opponent}
              </Text>
              <View
                className="rounded-full px-2.5 py-0.5"
                style={{
                  backgroundColor:
                    a.result === "WON"
                      ? "#dcfce7"
                      : a.result === "LOST"
                      ? "#fee2e2"
                      : colors["crossed-gray"]["100"],
                }}
              >
                <Text
                  className="font-[jost700] text-[12px]"
                  style={{
                    color:
                      a.result === "WON"
                        ? "#16a34a"
                        : a.result === "LOST"
                        ? "#dc2626"
                        : "#6b7280",
                  }}
                >
                  {a.result === "WON"
                    ? "Won"
                    : a.result === "LOST"
                    ? "Lost"
                    : "Tie"}
                </Text>
              </View>
              <Text className="ml-3 w-16 text-right font-[jost400] text-[12px] text-crossed-gray-400">
                {formatDistanceToNowStrict(new Date(`${a.createdAt}Z`), {
                  addSuffix: false,
                })}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
