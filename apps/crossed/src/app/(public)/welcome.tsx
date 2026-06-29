import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { WelcomeContent } from "../../components/WelcomeContent";
import { useAuth } from "../../hooks/use-auth";
import { setPendingIntro } from "../../lib/intro-flag";
import { events, trackEvent } from "../../lib/track-event";

export default function Welcome() {
  const router = useRouter();
  const { startAnonymously, isStartingAnonymously } = useAuth();

  // Play-first onboarding: create a silent anonymous account, then the root auth
  // guard sends the new player to /home, which launches the guided intro race.
  const onPlay = async () => {
    try {
      trackEvent(events.PLAY_TAPPED);
      setPendingIntro(true);
      await startAnonymously();
    } catch {
      setPendingIntro(false);
      Alert.alert("Couldn't start", "Please try again.");
    }
  };

  return (
    <WelcomeContent
      onPlay={onPlay}
      isPlaying={isStartingAnonymously}
      onSignIn={() => router.push("/sign-in")}
    />
  );
}
