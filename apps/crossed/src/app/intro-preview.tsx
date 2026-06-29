import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { WelcomeContent } from "../components/WelcomeContent";
import { ChooseUsernameView } from "../components/ChooseUsernameView";
import { IntroGamePrompt } from "../components/IntroGamePrompt";
import { Logo } from "../components/Logo";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";

type Phase = "loading" | "welcome" | "username" | "prompt";

// In-app preview of the EXACT new-user sequence, walkable from an existing
// account (which otherwise never sees the logged-out flow). Non-destructive:
// the username step doesn't create/rename anything. logo splash → welcome →
// choose-username → "play intro game" prompt → a preview race.
export default function IntroPreview() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const { myProfile } = useMyProfile();
  const { createGuidedMatch, creatingGuidedMatch } = useGame({
    gameId: undefined,
  });

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setTimeout(() => setPhase("welcome"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  const runRace = async () => {
    try {
      const id = await createGuidedMatch({ source: "preview" });
      if (id) router.replace(`/game?gameId=${id}&guided=1&preview=1`);
    } catch {
      // stay on the screen
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
      isLoading={creatingGuidedMatch}
    />
  );
}
