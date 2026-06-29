import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { fmtSolve } from "./(home-tabs)/stats";
import colors from "../lib/colors";

type Row = {
  id: string;
  label: string;
  result: "WON" | "LOST" | "TIE" | null;
  createdAt: string;
  solveSeconds: number | null;
};

const PAGE = 30;

export default function AllGames() {
  const { variant } = useLocalSearchParams<{ variant?: string }>();
  const v = variant === "SUDOKU" ? "SUDOKU" : "CROSSWORD";
  const { myProfile } = useMyProfile();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const loadPage = useCallback(
    async (p: number) => {
      if (!myProfile?.id) return;
      setLoading(true);
      const from = p * PAGE;
      const { data: games } = await supabase
        .from("games")
        .select(
          "id, gameType, winnerId, createdAt, gameState, profiles!gamePlayers!inner(id)"
        )
        .eq("gameVariant", v)
        .eq("playState", "COMPLETED")
        .filter("profiles.id", "eq", myProfile.id)
        .order("createdAt", { ascending: false })
        .range(from, from + PAGE - 1);
      const list = games ?? [];
      const ids = list.map((g) => g.id);
      let oppMap = new Map<string, string>();
      if (ids.length) {
        const { data: opps } = await supabase
          .from("gamePlayers")
          .select("gamesId, profilesId, profiles(username)")
          .in("gamesId", ids)
          .neq("profilesId", myProfile.id);
        oppMap = new Map(
          (opps ?? []).map((o) => [
            o.gamesId,
            (o.profiles as { username?: string } | null)?.username ??
              "Opponent",
          ])
        );
      }
      const mapped: Row[] = list.map((g) => {
        const isSolo = g.gameType === "SOLO";
        return {
          id: g.id,
          label: isSolo
            ? "Solo puzzle"
            : `vs ${oppMap.get(g.id) ?? "Opponent"}`,
          result: isSolo
            ? null
            : g.winnerId === myProfile.id
            ? "WON"
            : g.winnerId
            ? "LOST"
            : "TIE",
          createdAt: g.createdAt as string,
          solveSeconds:
            (
              g.gameState as Record<string, { solvedInSeconds?: number }> | null
            )?.[myProfile.id]?.solvedInSeconds ?? null,
        };
      });
      setRows((prev) => (p === 0 ? mapped : [...prev, ...mapped]));
      setDone(list.length < PAGE);
      setPage(p);
      setLoading(false);
    },
    [myProfile?.id, v]
  );

  useEffect(() => {
    if (myProfile?.id) loadPage(0);
  }, [myProfile?.id, loadPage]);

  return (
    <ScrollView
      className="flex-1 bg-white px-4"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
    >
      {rows.length === 0 && !loading ? (
        <Text className="mt-8 text-center font-[jost400] text-sm text-crossed-gray-400">
          No {v === "SUDOKU" ? "Sudoku" : "Crossword"} puzzles yet.
        </Text>
      ) : (
        rows.map((r, i) => (
          <View
            key={r.id}
            className={`flex-row items-center py-3 ${
              i > 0 ? "border-t border-crossed-gray-100" : ""
            }`}
          >
            <View className="flex-1">
              <Text
                className="font-[jost600] text-[15px] text-crossed-gray-900"
                numberOfLines={1}
              >
                {r.label}
              </Text>
              <Text className="mt-0.5 font-[jost400] text-[12px] text-crossed-gray-400">
                {format(new Date(`${r.createdAt}Z`), "MMM d, yyyy · h:mm a")}
              </Text>
            </View>
            {r.result && (
              <View
                className="mr-3 rounded-full px-2.5 py-0.5"
                style={{
                  backgroundColor:
                    r.result === "WON"
                      ? "#dcfce7"
                      : r.result === "LOST"
                      ? "#fee2e2"
                      : colors["crossed-gray"]["100"],
                }}
              >
                <Text
                  className="font-[jost700] text-[12px]"
                  style={{
                    color:
                      r.result === "WON"
                        ? "#16a34a"
                        : r.result === "LOST"
                        ? "#dc2626"
                        : "#6b7280",
                  }}
                >
                  {r.result === "WON"
                    ? "Won"
                    : r.result === "LOST"
                    ? "Lost"
                    : "Tie"}
                </Text>
              </View>
            )}
            <Text className="w-14 text-right font-[jost700] text-[14px] text-crossed-gray-900">
              {fmtSolve(r.solveSeconds)}
            </Text>
          </View>
        ))
      )}
      {loading && <ActivityIndicator className="mt-4" />}
      {!done && rows.length > 0 && !loading && (
        <TouchableOpacity
          onPress={() => loadPage(page + 1)}
          className="mt-4 items-center py-3"
        >
          <Text className="font-[jost700] text-[14px] text-crossed-blue-450">
            Load more
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
