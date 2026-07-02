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
  const yourSeconds = parseInt(params.you ?? "0", 10) || 0;
  const theirSeconds = parseInt(params.them ?? "0", 10) || 0;
  const youSolved = params.youSolved === "1";

  // The stat shown under each name, and the subline, reflect how the result was
  // actually decided.
  let youStat: string;
  let themStat: string;
  let statLabel: string;
  let subline: string;

  if (isTrivia) {
    // Trivia is decided by accuracy first, with time as the tiebreak. So if the
    // scores are tied, show the times (that's what decided it); otherwise show
    // the score.
    const total = parseInt(params.total ?? "0", 10) || 0;
    const youScore = parseInt(params.youScore ?? "0", 10) || 0;
    const themScore = parseInt(params.themScore ?? "0", 10) || 0;
    const tied = youScore === themScore;
    if (tied) {
      statLabel = "time";
      youStat = youSolved ? fmtSolve(yourSeconds) : "—";
      themStat = fmtSolve(theirSeconds);
      const gap = Math.abs(yourSeconds - theirSeconds);
      const gapStr = gap < 60 ? `${gap}s` : fmtSolve(gap);
      subline = didWin
        ? `You both got ${youScore}/${total} — you were faster by ${gapStr}!`
        : `You both got ${youScore}/${total} — ${rival} was faster.`;
    } else {
      statLabel = "correct";
      youStat = `${youScore}/${total}`;
      themStat = `${themScore}/${total}`;
      subline = didWin
        ? `You got ${youScore}/${total} to ${rival}'s ${themScore}!`
        : `${rival} got ${themScore}/${total} to your ${youScore}.`;
    }
  } else {
    // Crossword / word search: a time race. On a loss you ran out of time without
    // finishing — show a dash rather than a bogus solve time (it'd equal theirs).
    statLabel = "time";
    youStat = youSolved ? fmtSolve(yourSeconds) : "—";
    themStat = fmtSolve(theirSeconds);
    subline = didWin
      ? `You beat ${rival}!`
      : `${rival} won this one — get the rematch!`;
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
        {subline}
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
