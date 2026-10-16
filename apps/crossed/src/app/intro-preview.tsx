import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { WelcomeContent } from "../components/WelcomeContent";
import { ChooseUsernameView } from "../components/ChooseUsernameView";
import { IntroGamePrompt } from "../components/IntroGamePrompt";
import { Logo } from "../components/Logo";
import { CROSSWORD_TUTORIAL_SEEN_KEY } from "./game";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";

type Phase = "loading" | "welcome" | "username" | "prompt";

// In-app preview of the EXACT new-user sequence, walkable from an existing
// account (which otherwise never sees the logged-out flow). logo splash →
// welcome → choose-username → warm-up prompt → guided tutorial match vs a bot —
// the same first game a real new player gets, so this preview stays faithful to
// the real onboarding.
export default function IntroPreview() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const { myProfile } = useMyProfile();
  const { createGuidedMatch } = useGame({ gameId: undefined });
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setTimeout(() => setPhase("welcome"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // Launch the guided warm-up match vs a bot — the same first game a real new
  // player gets. We clear the "tutorial seen" flag first so the how-to-play
  // walkthrough re-shows (a real new player has never seen it); closing it
  // in-game sets the flag back.
  const runRace = async () => {
    if (launching) return;
    setLaunching(true);
    try {
      await AsyncStorage.removeItem(CROSSWORD_TUTORIAL_SEEN_KEY).catch(
        () => undefined
      );
      const id = await createGuidedMatch({ source: "onboarding" });
      if (id) {
        router.replace(`/game?gameId=${id}&guided=1`);
      } else {
        setLaunching(false);
      }
    } catch {
      setLaunching(false); // stay on the screen
    }
  };

  if (phase === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-crossed-gray-50">
        <Logo />
        <ActivityIndicator className="mt-8" />
      </View>
    );
  }

  if (phase === "welcome") {
    return (
      <WelcomeContent
        onPlay={() => setPhase("username")}
        onSignIn={() => undefined}
      />
    );
  }

  if (phase === "username") {
    return (
      <ChooseUsernameView
        preview
        onBack={() => setPhase("welcome")}
        onPreviewNext={() => setPhase("prompt")}
      />
    );
  }

  return (
    <IntroGamePrompt
      username={myProfile?.username}
      onPlay={runRace}
      isLoading={launching}
    />
  );
}
