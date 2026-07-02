import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { ChallengeButton } from "../components/ChallengeButton";
import { useGame, type GameVariant } from "../hooks/use-game";
import type { GameDifficulty } from "types-and-validators";
import { fmtSolve } from "./(home-tabs)/stats";

const LABEL: Record<string, string> = {
  WORD_SEARCH: "Word Search",
  TRIVIA: "Trivia",
};

// Generic result for the variants that don't use the crossword answers pipeline
// (word search, trivia). Solo shows your time; a race shows the win/loss.
export default function VariantResult() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { variant, type, won, solved, you, them, difficulty, gameId } =
    useLocalSearchParams<{
      variant?: string;
      type?: string;
      won?: string;
      solved?: string;
      you?: string;
      them?: string;
      difficulty?: string;
      gameId?: string;
    }>();
  const { createSoloGame, creatingSoloGame } = useGame({ gameId: undefined });

  const isSolo = type === "SOLO";
  const youSecs = parseInt(you ?? "0", 10) || 0;
  const themSecs = parseInt(them ?? "0", 10) || 0;
  const didWin = won === "1";
  // Default to solved for older links that don't pass the flag; only "0" (leaving
  // without finishing) flips it off.
  const didSolve = solved !== "0";
  const label = LABEL[variant ?? ""] ?? "Puzzle";

  const headline = isSolo
    ? didSolve
      ? "✅ Solved!"
      : "👋 You left"
    : didWin
    ? "🏆 You won!"
    : "Good race!";
  const subline = isSolo
    ? didSolve
      ? `You finished the ${label.toLowerCase()} in ${fmtSolve(youSecs)}.`
      : `You left the ${label.toLowerCase()} before finishing.`
    : didWin
    ? `You beat them${themSecs ? ` — ${fmtSolve(youSecs)} to ${fmtSolve(themSecs)}` : ""}!`
    : "So close — go again.";

  const playAgain = async () => {
    try {
      const id = await createSoloGame({
        variant: (variant as GameVariant) ?? "WORD_SEARCH",
        difficulty: (difficulty as GameDifficulty) ?? "REGULAR",
      });
      if (id) router.replace(`/game?gameId=${id}`);
    } catch {
      // stay on screen
    }
  };

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 48 }}>
      <Text
        className="text-center font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 38 }}
      >
        {headline}
      </Text>
      <Text
        className="mt-3 text-center font-[jost600] text-crossed-gray-600"
        style={{ fontSize: 18, lineHeight: 26 }}
      >
        {subline}
      </Text>

      {!!gameId && (
        <View className="mt-9">
          <ChallengeButton gameId={gameId} />
        </View>
      )}

      <View className="mt-4">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="Play again"
          isLoading={creatingSoloGame}
          onPress={playAgain}
        />
      </View>
      <View className="mt-3 items-center">
        <Button
          intent="primary"
          mode="text"
          label="Done"
          onPress={() => router.replace("/home")}
        />
      </View>
    </View>
  );
}
