import { useEffect, useRef, useState } from "react";
import { Platform, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { DailyDuelShareCard } from "../components/DailyDuelShareCard";
import { fmtSolve } from "./(home-tabs)/stats";
import { setTodaysResult } from "../lib/daily-duel";
import { getPlayStreak } from "../lib/streak";
import { advanceStoryLevel, startStoryLevel } from "../lib/story";
import { STORY_MAX_LEVEL, bossAvatar } from "types-and-validators";

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
    daily?: string;
    story?: string;
    level?: string;
  }>();
  const isDaily = params.daily === "1";
  const isStory = params.story === "1";
  const storyLevel = parseInt(params.level ?? "1", 10) || 1;
  const nextLevel = Math.min(STORY_MAX_LEVEL, storyLevel + 1);
  const [storyBusy, setStoryBusy] = useState(false);
  const didWin = params.won === "1";

  // Daily-duel image share: an offscreen branded card captured to a PNG.
  const shareCardRef = useRef<View>(null);
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (isDaily)
      getPlayStreak()
        .then((s) => setStreak(s.current))
        .catch(() => undefined);
  }, [isDaily]);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // On a story win, advance the saved level once so Home resumes at the next one
  // even if the player exits here instead of tapping "Next Level".
  const advancedRef = useRef(false);
  useEffect(() => {
    if (isStory && didWin && !advancedRef.current) {
      advancedRef.current = true;
      advanceStoryLevel(storyLevel);
    }
  }, [isStory, didWin, storyLevel]);

  // Launch a specific story level (Next Level on a win, Try Again on a loss).
  const goToStoryLevel = async (target: number) => {
    if (storyBusy) return;
    setStoryBusy(true);
    const started = await startStoryLevel(target);
    if (started) {
      router.replace(`/challenge?id=${started.id}&story=1&level=${target}`);
    } else {
      setStoryBusy(false);
      router.replace("/home");
    }
  };
  const youSolvedFlag = params.youSolved === "1";
  const yourSecondsRaw = parseInt(params.you ?? "0", 10) || 0;

  // Persist the daily-duel result so Home shows the player's time and stops
  // offering a re-race once they've finished today's duel.
  useEffect(() => {
    if (isDaily) {
      setTodaysResult({
        seconds: youSolvedFlag ? yourSecondsRaw : null,
        won: didWin,
      });
    }
  }, [isDaily, youSolvedFlag, yourSecondsRaw, didWin]);
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
      : isDaily
      ? `${rival} won this one — come back tomorrow!`
      : `${rival} won this one — get the rematch!`;
  }

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 48 }}>
      {isStory && (
        <View className="mb-4 items-center">
          <View
            className="items-center justify-center rounded-full"
            style={{
              height: 92,
              width: 92,
              backgroundColor: "white",
              borderWidth: 3,
              borderColor: didWin ? "#16a34a" : "#7c3aed",
              opacity: didWin ? 0.55 : 1,
            }}
          >
            <Text style={{ fontSize: 48, lineHeight: 58 }}>
              {bossAvatar(storyLevel)}
            </Text>
          </View>
          <Text className="mt-2 font-[jost700] text-[14px] text-crossed-gray-500">
            Level {storyLevel} · {rival}
          </Text>
        </View>
      )}
      <Text
        className="text-center font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 38 }}
      >
        {isStory
          ? didWin
            ? `🏆 Level ${storyLevel} cleared!`
            : "⏱ Out of time!"
          : isDaily
          ? didWin
            ? "🏆 You won the Daily Duel!"
            : "You lost the Daily Duel"
          : didWin
          ? "🏆 You won!"
          : "You lost"}
      </Text>
      <Text
        className="mt-3 text-center font-[jost600] text-crossed-gray-600"
        style={{ fontSize: 18, lineHeight: 26 }}
      >
        {isStory
          ? didWin
            ? storyLevel >= STORY_MAX_LEVEL
              ? `You beat ${rival} and cleared all ${STORY_MAX_LEVEL} levels!`
              : `You beat ${rival}. On to Level ${nextLevel}!`
            : `${rival} held the line. Beat the clock to advance.`
          : subline}
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

      {/* Story Mode: advance on a win, retry the same level on a loss. */}
      {isStory ? (
        <>
          <View className="mt-10">
            {didWin && storyLevel < STORY_MAX_LEVEL ? (
              <Button
                intent="primary"
                size="xl"
                rounded="full"
                label={storyBusy ? "Loading…" : `Next Level (${nextLevel}) →`}
                onPress={() => goToStoryLevel(nextLevel)}
              />
            ) : didWin ? (
              <Button
                intent="primary"
                size="xl"
                rounded="full"
                label="Back to Home"
                onPress={() => router.replace("/home")}
              />
            ) : (
              <Button
                intent="primary"
                size="xl"
                rounded="full"
                label={storyBusy ? "Loading…" : "Try Again"}
                onPress={() => goToStoryLevel(storyLevel)}
              />
            )}
          </View>
          <View className="mt-3 items-center">
            <Button
              intent="primary"
              mode="text"
              label="Home"
              onPress={() => router.replace("/home")}
            />
          </View>
        </>
      ) : isDaily ? (
        <View className="mt-10">
          {/* Everyone can see the board — a DNF just shows up as DNF. */}
          <Button
            intent="primary"
            size="xl"
            rounded="full"
            label={youSolved ? "See Where You Rank →" : "See Today's Leaderboard →"}
            onPress={() => router.replace("/daily-leaderboard")}
          />
          {/* Shareable daily-duel result — a clean, multi-line spoiler-free
              brag + app link. Full-size button so it reads as a real action. */}
          <View className="mt-4">
            <Button
              intent="primary"
              size="lg"
              rounded="full"
              mode="outline"
              label="📲  Share my result"
              onPress={async () => {
                const link =
                  "https://apps.apple.com/us/app/crossed/id6448530256";
                const me = fmtSolve(yourSeconds);
                const them = fmtSolve(theirSeconds);
                const msg = youSolved
                  ? didWin
                    ? `⚔️ Crossed · Daily Duel\n🏆 I beat ${rival} — ${me} to ${them}!\nThink you can beat my time? 🧩\n${link}`
                    : `⚔️ Crossed · Daily Duel\n⏱️ Solved today's in ${me} — ${rival} edged me by a hair.\nCan you go faster? 🧩\n${link}`
                  : `⚔️ Crossed · Daily Duel\n😤 ${rival} beat the clock today and I didn't.\nThink you can take them down? 🧩\n${link}`;
                try {
                  if (!shareCardRef.current) throw new Error("no card");
                  // Load the native capture/share modules LAZILY, only on tap.
                  // react-native-view-shot throws at import on any build without
                  // the native module (TurboModuleRegistry.getEnforcing), so a
                  // top-level import would crash this whole result screen on every
                  // runtime that predates the module. Requiring here keeps the
                  // crash contained to this try/catch → graceful text fallback.
                  const { captureRef } = require("react-native-view-shot");
                  const Sharing = require("expo-sharing");
                  const uri = await captureRef(shareCardRef, {
                    format: "png",
                    quality: 1,
                    result: "tmpfile",
                  });
                  const fileUri = uri.startsWith("file://")
                    ? uri
                    : `file://${uri}`;
                  if (Platform.OS === "ios") {
                    // iOS carries the image + a tappable link in one share sheet.
                    await Share.share({ url: fileUri, message: link });
                  } else if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, {
                      mimeType: "image/png",
                      dialogTitle: "Share your Daily Duel",
                    });
                  } else {
                    await Share.share({ message: msg });
                  }
                } catch {
                  // Capture/share unavailable → fall back to the text brag.
                  Share.share({ message: msg }).catch(() => undefined);
                }
              }}
            />
          </View>
          <View className="mt-3 items-center">
            <Button
              intent="primary"
              mode="text"
              label="Home"
              onPress={() => router.replace("/home")}
            />
          </View>
        </View>
      ) : (
        <>
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
        </>
      )}

      {/* Offscreen share card — kept in the tree (positioned out of view) so
          react-native-view-shot can capture it to a PNG on demand. */}
      {isDaily && (
        <View
          style={{ position: "absolute", left: -10000, top: 0 }}
          pointerEvents="none"
        >
          <DailyDuelShareCard
            ref={shareCardRef}
            won={didWin}
            youSolved={youSolved}
            yourSeconds={yourSeconds}
            theirSeconds={theirSeconds}
            rival={rival}
            dateLabel={dateLabel}
            streak={streak}
          />
        </View>
      )}
    </View>
  );
}
