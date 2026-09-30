import { Text, View } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { useGame } from "../hooks/use-game";
import { useGameGate } from "../hooks/use-subscription";
import { useMyProfile } from "../hooks/use-my-profile";
import { consumePendingIntro } from "../lib/intro-flag";
import { getStoryCurrentLevel, startStoryLevel } from "../lib/story";
import { events, trackEvent } from "../lib/track-event";

// Shown after the guided intro match (username already chosen up front). Leads
// with the result + rating movement, then a single button to drop into the
// dashboard. preview=1 walks it from an existing account without changes.
export default function IntroComplete() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { won, margin, preview, before } = useLocalSearchParams<{
    won?: string;
    margin?: string;
    preview?: string;
    before?: string;
  }>();
  const { createGuidedMatch, creatingGuidedMatch } = useGame({
    gameId: undefined,
  });
  const { checkCanPlay } = useGameGate();
  const { myProfile, refreshMyProfile } = useMyProfile();
  useEffect(() => {
    refreshMyProfile();
  }, [refreshMyProfile]);

  const beforeRating = parseInt(before ?? "", 10);
  const afterRating = myProfile?.eloRating;
  const showRating =
    Number.isFinite(beforeRating) &&
    typeof afterRating === "number" &&
    afterRating > 0;
  const delta = showRating
    ? Math.round((afterRating as number) - beforeRating)
    : 0;

  const didWin = won !== "0";
  const marginN = parseInt(margin ?? "0", 10) || 0;
  const headline = didWin ? "🎉 You won!" : "Good race!";
  const subline = didWin
    ? marginN > 0
      ? marginN <= 6
        ? `Photo finish — you edged it by ${marginN} square${
            marginN === 1 ? "" : "s"
          }! 🔥`
        : `You beat the bot by ${marginN} squares!`
      : "You took it right at the buzzer!"
    : "So close — real opponents are waiting.";

  const enterApp = () => {
    consumePendingIntro();
    router.replace("/home");
  };

  // Drop the new player straight into Story Mode (their current level, = 1 for a
  // brand-new account). After they clear it, the result screen offers "Next
  // Level" or "Home" — so they continue the ladder or go to the menu.
  const [startingStory, setStartingStory] = useState(false);
  const startStory = async () => {
    if (startingStory) return;
    setStartingStory(true);
    try {
      consumePendingIntro();
      const level = await getStoryCurrentLevel();
      const started = await startStoryLevel(level);
      if (started) {
        router.replace(`/challenge?id=${started.id}&story=1&level=${level}`);
      } else {
        router.replace("/home");
      }
    } catch {
      router.replace("/home");
    }
  };

  const playAgain = async () => {
    try {
      // Replays count against the daily free limit. PUSH (not replace) so the
      // paywall's Back returns here rather than stranding the player.
      const gate = await checkCanPlay();
      if (!gate.allowed) {
        trackEvent(events.GATE_BLOCKED, { mode: "INTRO", variant: "CROSSWORD" });
        router.push("/upgrade-to-pro");
        return;
      }
      const id = await createGuidedMatch({
        source: preview === "1" ? "preview" : "onboarding",
      });
      if (id)
        router.replace(
          `/game?gameId=${id}&guided=1${preview === "1" ? "&preview=1" : ""}`
        );
    } catch {
      // stay on the screen if it fails
    }
  };

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 48 }}>
      <Text
        className="text-center font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 40 }}
      >
        {headline}
      </Text>
      <Text
        className="mt-3 text-center font-[jost600] text-crossed-gray-700"
        style={{ fontSize: 19, lineHeight: 26 }}
      >
        {subline}
      </Text>

      {showRating && (
        <View className="mt-6 items-center">
          <Text className="font-[jost600] text-[12px] tracking-widest text-crossed-gray-400">
            RATING
          </Text>
          <Text
            className="mt-1 font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 24 }}
          >
            {beforeRating} → {Math.round(afterRating as number)}
            {delta > 0 ? (
              <Text style={{ color: "#16a34a", fontSize: 24 }}>
                {"  "}+{delta}
              </Text>
            ) : null}
          </Text>
        </View>
      )}

      <View className="mt-12">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="Start Story Mode →"
          isLoading={startingStory}
          onPress={startStory}
        />
      </View>
      <View className="mt-3 items-center">
        <Button
          intent="primary"
          mode="text"
          label="Go to main menu"
          onPress={enterApp}
        />
      </View>
    </View>
  );
}
