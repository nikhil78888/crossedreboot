import { Text, View } from "react-native";
import { useDaily } from "../../hooks/use-daily";
import { fmtSeconds } from "../../lib/daily-duel";
import { Button } from "../../components/Button";

// The Daily Duel tab: race a funny-named opponent whose time is preset for the
// day. Once finished, it just shows the player's time (no re-race).
export default function DailyScreen() {
  const { meta, playStreak, result, starting, startDuel } = useDaily();
  const done = result != null;
  const variantLabel =
    meta.variant === "WORD_SEARCH" ? "word search" : "crossword";

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      {/* streak echo */}
      <View className="mb-6 flex-row items-center justify-center">
        <Text style={{ fontSize: 22 }}>🔥</Text>
        <Text className="ml-1.5 font-[jost700] text-[18px] text-crossed-gray-900">
          {playStreak.current}
        </Text>
        <Text className="ml-1.5 font-[jost500] text-[13px] text-crossed-gray-900/50">
          day play streak
        </Text>
      </View>

      {done ? (
        <View className="mt-6 items-center">
          <Text style={{ fontSize: 46 }}>{result?.won ? "🏆" : "⏱️"}</Text>
          <Text
            className="mt-4 text-center font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 26 }}
          >
            Daily Duel complete
          </Text>
          {result?.seconds != null && (
            <Text
              className="mt-6 text-center font-[jost700] text-crossed-gray-900"
              style={{ fontSize: 44 }}
            >
              {fmtSeconds(result.seconds)}
            </Text>
          )}
          <Text className="mt-1 text-center font-[jost500] text-[13px] uppercase tracking-widest text-crossed-gray-400">
            your time
          </Text>
          <Text className="mt-6 text-center font-[jost500] text-[15px] text-crossed-gray-600">
            {result?.won
              ? `You beat ${meta.opponent}!`
              : `${meta.opponent} got you this time.`}
          </Text>
          <Text className="mt-1 text-center font-[jost500] text-[14px] text-crossed-gray-400">
            Come back tomorrow for a new duel.
          </Text>
        </View>
      ) : (
        <View className="mt-6 items-center">
          <Text style={{ fontSize: 46 }}>⚔️</Text>
          <Text className="mt-3 text-center font-[jost600] text-[12px] uppercase tracking-widest text-crossed-gray-400">
            Today's Daily Duel
          </Text>
          <Text
            className="mt-2 text-center font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 28 }}
          >
            Race {meta.opponent}
          </Text>
          <Text className="mt-3 text-center font-[jost500] text-[15px] text-crossed-gray-600">
            Beat their {variantLabel} in
          </Text>
          <Text
            className="mt-1 text-center font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 40 }}
          >
            {fmtSeconds(meta.seconds)}
          </Text>
          <View className="mt-10 w-full">
            <Button
              intent="primary"
              size="xl"
              rounded="full"
              label={starting ? "Starting…" : "Race"}
              isLoading={starting}
              onPress={startDuel}
            />
          </View>
        </View>
      )}
    </View>
  );
}
