import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { WelcomeContent } from "../components/WelcomeContent";
import { Logo } from "../components/Logo";
import { useGame } from "../hooks/use-game";

// In-app preview of the EXACT new-user sequence (for testing from an existing
// account, which otherwise skips the logged-out welcome flow): a brief logo
// "loading" screen — approximating the launch splash a real new user sees —
// then the welcome screen, then a non-destructive preview race on Play.
export default function IntroPreview() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "welcome">("loading");
  const { createGuidedMatch, creatingGuidedMatch } = useGame({
    gameId: undefined,
  });

  useEffect(() => {
    const t = setTimeout(() => setPhase("welcome"), 1600);
    return () => clearTimeout(t);
  }, []);

  const onPlay = async () => {
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

  return (
    <WelcomeContent
      onPlay={onPlay}
      isPlaying={creatingGuidedMatch}
      onSignIn={() => {}}
    />
  );
}
