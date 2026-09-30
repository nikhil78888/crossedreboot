import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { WelcomeContent } from "../components/WelcomeContent";
import { ChooseUsernameView } from "../components/ChooseUsernameView";
import { IntroGamePrompt } from "../components/IntroGamePrompt";
import { Logo } from "../components/Logo";
import { startStoryLevel } from "../lib/story";
import { CROSSWORD_TUTORIAL_SEEN_KEY } from "./game";
import { useMyProfile } from "../hooks/use-my-profile";

type Phase = "loading" | "welcome" | "username" | "prompt";

// In-app preview of the EXACT new-user sequence, walkable from an existing
// account (which otherwise never sees the logged-out flow). logo splash →
// welcome → choose-username → "Start Level 1" prompt → Story Mode Level 1 —
// the same first game a real new player gets (their first game IS Story L1),
// so this preview stays faithful to the real onboarding.
export default function IntroPreview() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const { myProfile } = useMyProfile();
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setTimeout(() => setPhase("welcome"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // Launch Story Mode Level 1 — always level 1 here (not the tester's saved
  // level), because the point of the preview is to show what a brand-new
  // player sees. A win only ever advances the saved level via max(), so this
  // can't roll an existing account's progress backward. We also clear the
  // "tutorial seen" flag first so the how-to-play walkthrough re-shows (a real
  // new player has never seen it); closing it in-game sets the flag back.
  const runRace = async () => {
    if (launching) return;
    setLaunching(true);
    try {
      await AsyncStorage.removeItem(CROSSWORD_TUTORIAL_SEEN_KEY).catch(
        () => undefined
      );
      const started = await startStoryLevel(1);
      if (started) {
        router.replace(`/challenge?id=${started.id}&story=1&level=1`);
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
