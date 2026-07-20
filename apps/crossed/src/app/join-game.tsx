import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { useMyProfile } from "../hooks/use-my-profile";
import { useGameGate } from "../hooks/use-subscription";
import { Button } from "../components/Button";
import { Image } from "expo-image";
import { avatars } from "../lib/images";
import { events, trackEvent } from "../lib/track-event";

export default function JoinGame() {
  const { gameId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { myProfile } = useMyProfile();
  const { game, startGame, startingGame, opponentUsername, opponent } = useGame(
    {
      gameId: gameId as string | undefined,
    }
  );
  const { checkCanPlay } = useGameGate();

  // Accepting a friend's invite is a game too — same daily free limit.
  const joinIfAllowed = async () => {
    const gate = await checkCanPlay();
    if (!gate.allowed) {
      trackEvent(events.GATE_BLOCKED, {
        mode: "JOIN_INVITE",
        variant: game?.gameVariant,
      });
      router.push("/upgrade-to-pro");
      return;
    }
    // AWAIT + surface failures: a bare startGame() swallowed rejections, so a
    // failed join (duplicate row, RLS, offline) left the button looking dead.
    try {
      await startGame();
    } catch {
      Alert.alert("Couldn't join", "Please check your connection and try again.");
    }
  };

  const gamePlayState = game?.playState;

  useEffect(() => {
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "COMPLETED":
          Alert.alert("The game has ended");
          router.push("/home");
          break;
        case "ABORTED":
          Alert.alert("The game was aborted");
          router.push("/home");
          break;
        case "PLAYING":
          router.replace(`/game?gameId=${gameId}`);
          break;
        default:
          break;
      }
    }
  }, [gameId, gamePlayState, router, navigation]);

  if (!game || !myProfile) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const friendlyAvatar = Object.keys(avatars).find(
    (a) => myProfile.avatar !== a
  ) as keyof typeof avatars;
  const opponentAvatar = opponent?.avatar
    ? (opponent.avatar as keyof typeof avatars)
    : friendlyAvatar;

  return (
    <View className="flex-1 items-center px-4 bg-white">
      <Text className="mt-4 text-base font-[jost600]">
        Play a friendly match with @{opponentUsername}
      </Text>
      <View className="mt-6">
        <View
          className="h-[180px] w-[180px] border-black/20 rounded-full items-center justify-center"
          style={{ borderWidth: StyleSheet.hairlineWidth }}
        >
          <View className="p-5 bg-gray-100 rounded-full">
            <Image
              source={avatars[opponentAvatar]}
              className="h-[60px] w-[60px]"
            />
          </View>
        </View>
      </View>
      <View className="mt-6">
        <Button
          intent="primary"
          size="base"
          rounded={"full"}
          label="Start Match"
          isLoading={startingGame}
          onPress={joinIfAllowed}
        />
      </View>
      <View className="absolute bottom-8 inset-x-4">
        <Button
          intent="secondary"
          size="lg"
          label="Go back home"
          onPress={router.back}
        />
      </View>
    </View>
  );
}
