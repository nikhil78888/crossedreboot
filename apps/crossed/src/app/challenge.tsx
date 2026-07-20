import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useGameGate } from "../hooks/use-subscription";
import { useMyProfile } from "../hooks/use-my-profile";
import { events, trackEvent } from "../lib/track-event";

// Deep-link target for a shared challenge: create the recipient's ghost-race
// game and drop them into it. (For brand-new installs, Branch delivers the id
// after onboarding; for existing accounts it lands here directly.)
export default function ChallengeAccept() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { acceptChallenge } = useGame({ gameId: undefined });
  const { checkCanPlay } = useGameGate();
  const ran = useRef(false);

  useEffect(() => {
    if (id && myProfile?.id && !ran.current) {
      ran.current = true;
      (async () => {
        try {
          // Challenge (ghost) races count against the daily free limit too.
          const gate = await checkCanPlay();
          if (!gate.allowed) {
            trackEvent(events.GATE_BLOCKED, {
              mode: "CHALLENGE",
              variant: "CHALLENGE",
            });
            router.replace("/upgrade-to-pro");
            return;
          }
          const gid = await acceptChallenge({ challengeId: String(id) });
          router.replace(gid ? `/game?gameId=${gid}&challenge=1` : "/home");
        } catch {
          router.replace("/home");
        }
      })();
    }
  }, [id, myProfile?.id, acceptChallenge, checkCanPlay, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <ActivityIndicator />
      <Text className="mt-4 text-center font-[jost600] text-crossed-gray-500">
        Loading your challenge…
      </Text>
    </View>
  );
}
