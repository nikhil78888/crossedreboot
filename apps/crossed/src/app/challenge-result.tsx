import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { fmtSolve } from "./(home-tabs)/stats";

// Result of a ghost-race challenge — decided by TIME (did you beat their solve?).
export default function ChallengeResult() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { you, them, name, won } = useLocalSearchParams<{
    you?: string;
    them?: string;
    name?: string;
    won?: string;
  }>();
  const yourSeconds = parseInt(you ?? "0", 10) || 0;
  const theirSeconds = parseInt(them ?? "0", 10) || 0;
  const didWin = won === "1";
  const diff = Math.abs(theirSeconds - yourSeconds);
  const fmtDiff = diff < 60 ? `${diff}s` : fmtSolve(diff);
  const rival = name || "your rival";

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 48 }}>
      <Text
        className="text-center font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 38 }}
      >
        {didWin ? "🏆 You won!" : "So close!"}
      </Text>
      <Text
        className="mt-3 text-center font-[jost600] text-crossed-gray-600"
        style={{ fontSize: 18, lineHeight: 26 }}
      >
        {didWin
          ? `You beat ${rival} by ${fmtDiff}!`
          : `${rival} was faster by ${fmtDiff} — get the rematch.`}
      </Text>

      <View className="mt-9 flex-row justify-center" style={{ gap: 36 }}>
        <View className="items-center">
          <Text className="font-[jost600] text-[13px] tracking-wider text-crossed-gray-400">
            YOU
          </Text>
          <Text
            className="mt-1 font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 32 }}
          >
            {fmtSolve(yourSeconds)}
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
            {fmtSolve(theirSeconds)}
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
