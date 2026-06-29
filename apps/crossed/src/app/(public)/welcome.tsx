import { useRouter } from "expo-router";
import { WelcomeContent } from "../../components/WelcomeContent";
import { events, trackEvent } from "../../lib/track-event";

export default function Welcome() {
  const router = useRouter();

  // Username-first onboarding: pick a username (creates the account) before the
  // first game. /choose-username sets the pending-intro flag on success, then the
  // root auth guard sends the new player to /home, which prompts the intro match.
  const onGetStarted = () => {
    trackEvent(events.PLAY_TAPPED);
    router.push("/choose-username");
  };

  return (
    <WelcomeContent
      onPlay={onGetStarted}
      onSignIn={() => router.push("/sign-in")}
    />
  );
}
