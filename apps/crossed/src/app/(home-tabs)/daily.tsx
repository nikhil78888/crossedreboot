import { useRef } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useDaily } from "../../hooks/use-daily";
import { fmtSeconds } from "../../lib/daily-duel";
import { shareDuel } from "../../lib/share-duel";
import { Button } from "../../components/Button";
import { DailyDuelShareCard } from "../../components/DailyDuelShareCard";

// The Daily Duel tab: race a funny-named opponent whose time is preset for the
// day. Once finished, it just shows the player's time (no re-race).
export default function DailyScreen() {
  const router = useRouter();
  const { meta, result, playStreak, starting, startDuel } = useDaily();
  const done = result != null;
  const shareCardRef = useRef<View>(null);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const shareResult = () =>
    shareDuel({
      cardRef: shareCardRef,
      buildMessage: (link) => {
        const me = fmtSeconds(result?.seconds ?? 0);
        const them = fmtSeconds(meta.seconds);
        if (result?.seconds == null)
          return `⚔️ Crossed · Daily Duel\n😤 ${meta.opponent} beat the clock today and I didn't.\nThink you can take them down? 🧩\n${link}`;
        return result?.won
          ? `⚔️ Crossed · Daily Duel\n🏆 I beat ${meta.opponent} — ${me} to ${them}!\nThink you can beat my time? 🧩\n${link}`
          : `⚔️ Crossed · Daily Duel\n⏱️ Solved today's in ${me} — ${meta.opponent} edged me by a hair.\nCan you go faster? 🧩\n${link}`;
      },
    });
  const variantLabel =
    meta.variant === "WORD_SEARCH"
      ? "word search"
      : meta.variant === "WORDSY"
      ? "Wordsy"
      : meta.variant === "CATEGORIES"
      ? "Categories"
      : "crossword";

  return (
    <View className="flex-1 bg-white px-6 pt-8">
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
          {/* Show the board to everyone who played today — a DNF (no solve time)
              still appears on it, marked DNF. */}
          <View className="mt-8 w-full">
            <Button
              intent="primary"
              size="xl"
              rounded="full"
              label="See Today's Ranking"
              onPress={() => router.push("/daily-leaderboard")}
            />
          </View>
          <View className="mt-3 w-full">
            <Button
              intent="primary"
              size="lg"
              rounded="full"
              mode="outline"
              label="📲  Share my result"
              onPress={shareResult}
            />
          </View>
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

      {/* Offscreen share card for the "Share my result" button above. */}
      {done && (
        <View
          style={{ position: "absolute", left: -10000, top: 0 }}
          pointerEvents="none"
        >
          <DailyDuelShareCard
            ref={shareCardRef}
            won={!!result?.won}
            youSolved={result?.seconds != null}
            yourSeconds={result?.seconds ?? 0}
            theirSeconds={meta.seconds}
            rival={meta.opponent}
            dateLabel={dateLabel}
            streak={playStreak.current}
          />
        </View>
      )}
    </View>
  );
}
