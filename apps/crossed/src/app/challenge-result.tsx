import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { fmtSolve } from "./(home-tabs)/stats";

// Result of a ghost-race challenge. Crossword / word search are decided by TIME;
// trivia by ACCURACY (correct answers, tie broken by time). We just say won/lost
// — no "faster by N seconds", which was misleading (a loss ends the instant you
// pass their time, so the gap was always ~1s).
export default function ChallengeResult() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    you?: string;
    them?: string;
    name?: string;
    won?: string;
    variant?: string;
    youSolved?: string;
    youScore?: string;
    themScore?: string;
    total?: string;
  }>();
  const didWin = params.won === "1";
  const rival = params.name || "your rival";
  const isTrivia = params.variant === "TRIVIA";

  // The stat under each name: a score for trivia, a solve time otherwise.
  let youStat: string;
  let themStat: string;
  let statLabel: string;
  if (isTrivia) {
    const total = parseInt(params.total ?? "0", 10) || 0;
    youStat = `${parseInt(params.youScore ?? "0", 10) || 0}/${total}`;
    themStat = `${parseInt(params.themScore ?? "0", 10) || 0}/${total}`;
    statLabel = "correct";
  } else {
    const yourSeconds = parseInt(params.you ?? "0", 10) || 0;
    const theirSeconds = parseInt(params.them ?? "0", 10) || 0;
    // On a loss you ran out of time without finishing — show a dash rather than a
    // bogus solve time (it would just equal their time).
    youStat = params.youSolved === "1" ? fmtSolve(yourSeconds) : "—";
    themStat = fmtSolve(theirSeconds);
    statLabel = "time";
  }

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 48 }}>
      <Text
        className="text-center font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 38 }}
      >
        {didWin ? "🏆 You won!" : "You lost"}
      </Text>
      <Text
        className="mt-3 text-center font-[jost600] text-crossed-gray-600"
        style={{ fontSize: 18, lineHeight: 26 }}
      >
        {didWin
          ? `You beat ${rival}!`
          : `${rival} won this one — get the rematch!`}
      </Text>

      <Text className="mt-8 text-center font-[jost600] text-[12px] uppercase tracking-wider text-crossed-gray-400">
        {statLabel}
      </Text>
      <View className="mt-2 flex-row justify-center" style={{ gap: 36 }}>
        <View className="items-center">
          <Text className="font-[jost600] text-[13px] tracking-wider text-crossed-gray-400">
            YOU
          </Text>
          <Text
            className="mt-1 font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 32 }}
          >
            {youStat}
          </Text>
        </View>
        <View className="items-center">
          <Text
            className="font-[jost600] text-[13px] tracking-wider text-crossed-gray-400"
            numberOfLines={1}
          >
            {rival.toUpperCase()}
          </Text>
          <Text
            className="mt-1 font-[jost700] text-crossed-gray-500"
            style={{ fontSize: 32 }}
          >
            {themStat}
          </Text>
        </View>
      </View>

      <View className="mt-10">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="Play another"
          onPress={() => router.replace("/home")}
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
