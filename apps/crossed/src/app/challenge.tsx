import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";

// Deep-link target for a shared challenge: create the recipient's ghost-race
// game and drop them into it. (For brand-new installs, Branch delivers the id
// after onboarding; for existing accounts it lands here directly.)
export default function ChallengeAccept() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { acceptChallenge } = useGame({ gameId: undefined });
  const ran = useRef(false);

  useEffect(() => {
    if (id && myProfile?.id && !ran.current) {
      ran.current = true;
      (async () => {
        try {
          const gid = await acceptChallenge({ challengeId: String(id) });
          router.replace(gid ? `/game?gameId=${gid}&challenge=1` : "/home");
        } catch {
          router.replace("/home");
        }
      })();
    }
  }, [id, myProfile?.id, acceptChallenge, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <ActivityIndicator />
      <Text className="mt-4 text-center font-[jost600] text-crossed-gray-500">
        Loading your challenge…
      </Text>
    </View>
  );
}
