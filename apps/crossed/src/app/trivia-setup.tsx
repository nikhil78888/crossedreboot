import { useState } from "react";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { useGame } from "../hooks/use-game";
import { TRIVIA_CATEGORIES, type Difficulty } from "../lib/trivia";
import colors from "../lib/colors";

const LEVELS: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

// Trivia solo setup: pick a category (or Any) + one of three levels, then play.
export default function TriviaSetup() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  // mode=friendly → invite a friend (live); mode=ranked → rated match; else solo.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isFriendly = mode === "friendly";
  const isRanked = mode === "ranked";
  const {
    createSoloGame,
    creatingSoloGame,
    createFriendlyGame,
    creatingFriendlyGame,
    createRankedBotMatch,
    creatingRankedBotMatch,
  } = useGame({ gameId: undefined });
  const [category, setCategory] = useState<string>("Any");
  const [level, setLevel] = useState<Difficulty>("easy");

  const opts = {
    variant: "TRIVIA" as const,
    difficulty: (level === "hard" ? "HARD" : "REGULAR") as "HARD" | "REGULAR",
    triviaCategory: category,
    triviaLevel: level,
  };

  const start = async () => {
    try {
      const id = await createSoloGame(opts);
      if (id) router.replace(`/game?gameId=${id}`);
    } catch {
      // stay on screen
    }
  };

  const friendly = async () => {
    try {
      const id = await createFriendlyGame(opts);
      if (id) router.replace(`/invite-friend?gameId=${id}`);
    } catch {
      // stay on screen
    }
  };

  const ranked = async () => {
    try {
      const id = await createRankedBotMatch(opts);
      if (id) router.replace(`/game?gameId=${id}`);
    } catch {
      // stay on screen
    }
  };

  const chip = (active: boolean) => ({
    borderRadius: 9999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: active
      ? colors["crossed-blue"]["450"]
      : colors["crossed-gray"]["50"],
  });

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 16 }}>
      <Text
        className="font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 28 }}
      >
        {isRanked ? "Ranked Trivia" : isFriendly ? "Friendly Trivia" : "Trivia"}
      </Text>

      <Text className="mt-6 font-[jost700] text-[15px] text-crossed-gray-900">
        Category
      </Text>
      <View
        className="mt-3"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {["Any", ...TRIVIA_CATEGORIES].map((c) => {
          const active = category === c;
          return (
            <TouchableOpacity key={c} onPress={() => setCategory(c)} style={chip(active)}>
              <Text
                style={{
                  fontFamily: "jost600",
                  fontSize: 14,
                  color: active ? "#fff" : "#374151",
                }}
              >
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="mt-7 font-[jost700] text-[15px] text-crossed-gray-900">
        Difficulty
      </Text>
      <View className="mt-3" style={{ flexDirection: "row", gap: 10 }}>
        {LEVELS.map((l) => {
          const active = level === l.key;
          return (
            <View key={l.key} style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => setLevel(l.key)}
                style={{
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  backgroundColor: active
                    ? colors["crossed-blue"]["450"]
                    : colors["crossed-gray"]["50"],
                }}
              >
                <Text
                  style={{
                    fontFamily: "jost700",
                    fontSize: 15,
                    color: active ? "#fff" : "#374151",
                  }}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View className="mt-10">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label={
            isRanked ? "⚡ Play Ranked" : isFriendly ? "Invite a Friend" : "Play"
          }
          isLoading={
            isRanked
              ? creatingRankedBotMatch
              : isFriendly
              ? creatingFriendlyGame
              : creatingSoloGame
          }
          onPress={isRanked ? ranked : isFriendly ? friendly : start}
        />
      </View>
    </View>
  );
}
