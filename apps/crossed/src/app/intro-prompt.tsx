import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { IntroGamePrompt } from "../components/IntroGamePrompt";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { consumePendingIntro } from "../lib/intro-flag";

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
  const { createGuidedMatch } = useGame({ gameId: undefined });
  const [launching, setLaunching] = useState(false);

  const launchIntro = async () => {
    if (launching) return;
    setLaunching(true);
    try {
      const id = await createGuidedMatch({ source: "onboarding" });
      if (!id) throw new Error("no game");
      consumePendingIntro();
      router.replace(`/game?gameId=${id}&guided=1`);
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
