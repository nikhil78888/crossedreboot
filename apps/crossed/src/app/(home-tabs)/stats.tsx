import { Text, View } from "react-native";
import useSWR from "swr";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useStats } from "../../hooks/use-stats";
import { useMyProfile } from "../../hooks/use-my-profile";
import { useVariant } from "../../hooks/use-variant";
import { VariantTabs } from "../../components/VariantTabs";
import { getRank } from "../../lib/rank";
import { ratingForVariant, variantLabel } from "../../lib/variant-rating";
import { supabase } from "../../lib/supabase";
import colors from "../../lib/colors";

// mm:ss, or — when a game has no recorded solve time (pre-feature / unfinished).
export const fmtSolve = (s: number | null) =>
  s == null ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Activity = {
  id: string;
  opponent: string;
  result: "WON" | "LOST" | "TIE" | null; // null = solo (no opponent)
  createdAt: string;
  solveSeconds: number | null;
  challenge?: boolean;
};

const useRecentActivity = (
  variant: string,
  profileId?: string
) => {
  const { data } = useSWR(
    profileId ? ["recent-activity", profileId, variant] : null,
    async (): Promise<Activity[]> => {
      // Every completed game for this variant the player took part in — solo,
      // races, challenges, ranked — so all game types show up in stats.
      const { data: games } = await supabase
        .from("games")
        .select(
          "id, winnerId, createdAt, gameState, gameType, profiles!gamePlayers!inner(id)"
        )
        .eq("gameVariant", variant)
        .eq("playState", "COMPLETED")
        .filter("profiles.id", "eq", profileId)
        .order("createdAt", { ascending: false })
        .limit(6);
      const list = games ?? [];
      const ids = list.map((g) => g.id);
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
      return list.map((g) => {
        const ch = (
          g.gameState as
            | { __challenge?: { name?: string | null; seconds?: number | null } }
            | null
        )?.__challenge;
        const mySolve =
          (g.gameState as Record<string, { solvedInSeconds?: number }> | null)?.[
            profileId as string
          ]?.solvedInSeconds ?? null;
        // Solo = no opponent; challenge = time-based vs the challenger; otherwise
        // vs the opponent decided by winnerId.
        let opponent: string;
        let result: "WON" | "LOST" | "TIE" | null;
        if (ch) {
          opponent = ch.name || "Challenger";
          const theirs = ch.seconds ?? 0;
          result =
            mySolve != null && theirs > 0 && mySolve < theirs ? "WON" : "LOST";
        } else if (g.gameType === "SOLO") {
          opponent = "Solo";
          result = null;
        } else {
          opponent = oppMap.get(g.id) ?? "Opponent";
          result =
            g.winnerId === profileId ? "WON" : g.winnerId ? "LOST" : "TIE";
        }
        return {
          id: g.id,
          opponent,
          result,
          createdAt: g.createdAt as string,
          solveSeconds: mySolve,
          challenge: !!ch,
        };
      });
    }
  );
  return data ?? [];
};

export default function Stats() {
  const { variant } = useVariant();
  const { stats } = useStats(variant);
  const { myProfile } = useMyProfile();
  const rating = ratingForVariant(myProfile, variant);
  const rank = getRank(rating);
  const activity = useRecentActivity(variant, myProfile?.id);
  const router = useRouter();

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
              className="font-[rubik700]"
              style={{ color: "#ffffff", fontSize: 72, lineHeight: 76 }}
            >
              {rating != null ? Math.round(rating) : "—"}
            </Text>
            <Text
              className="mt-1 font-[jost600]"
              style={{ color: "rgba(255,255,255,0.92)", fontSize: 22 }}
            >
              {variantLabel(variant)} Rating
            </Text>
          </View>
          <View className="items-center">
            <Text style={{ fontSize: 52 }}>{rank.emoji}</Text>
            <Text className="mt-1 font-[jost700] text-[17px] text-white">
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
            No ranked {variantLabel(variant)} games or challenges yet — play one
            to see it here.
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
                {a.result === null
                  ? a.opponent
                  : `${a.challenge ? "⚡ " : ""}vs ${a.opponent}`}
              </Text>
              {a.result !== null && (
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
              )}
              <View className="ml-3 w-16 items-end">
                <Text className="font-[jost700] text-[13px] text-crossed-gray-900">
                  {fmtSolve(a.solveSeconds)}
                </Text>
                <Text className="font-[jost400] text-[11px] text-crossed-gray-400">
                  {format(new Date(`${a.createdAt}Z`), "MMM d")}
                </Text>
              </View>
            </View>
          ))
        )}
        {activity.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push(`/all-games?variant=${variant}`)}
            className="mt-3 items-center border-t border-crossed-gray-100 pt-3"
          >
            <Text className="font-[jost700] text-[13px] text-crossed-blue-450">
              View all puzzles →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
