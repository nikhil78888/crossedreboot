import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { IntroGamePrompt } from "../components/IntroGamePrompt";
import { useMyProfile } from "../hooks/use-my-profile";
import { consumePendingIntro } from "../lib/intro-flag";
import { getStoryCurrentLevel, startStoryLevel } from "../lib/story";
import { events, trackEvent } from "../lib/track-event";

// The brand-new player's warm-up prompt, as its OWN full-screen route rather
// than a conditional render inside the Home tab. That matters for two reasons:
//   1. Home lives under a tab navigator, so rendering the prompt there still
//      showed the tab bar — a new player could just tap Stats/Leaderboard and
//      skip the intro entirely.
//   2. Presented over the tabs, there is no dashboard behind it to flash.
// It is entered with router.replace and has gestureEnabled: false, so the only
// way onward is to play (the game screen's own Leave button still works).
export default function IntroPrompt() {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const [launching, setLaunching] = useState(false);

  // The new player's first game IS Story Mode level 1 — an easy, generous
  // crossword vs the first boss. After they clear it, the story-result screen
  // offers "Next Level" or the main menu, so they continue the ladder.
  const launchIntro = async () => {
    if (launching) return;
    setLaunching(true);
    trackEvent(events.INTRO_RACE_STARTED);
    try {
      const level = await getStoryCurrentLevel(); // 1 for a brand-new account
      const started = await startStoryLevel(level);
      if (!started) throw new Error("no game");
      consumePendingIntro();
      router.replace(`/challenge?id=${started.id}&story=1&level=${level}`);
    } catch {
      // Stay on the prompt and let them retry. Previously a failure fell through
      // to the dashboard, which silently skipped the intro for that player.
      setLaunching(false);
      Alert.alert(
        "Couldn't start your game",
        "Please check your connection and try again."
      );
    }
  };

  return (
    <IntroGamePrompt
      username={myProfile?.username}
      onPlay={launchIntro}
      isLoading={launching}
    />
  );
}
