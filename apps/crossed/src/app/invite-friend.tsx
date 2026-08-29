import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useEffect } from "react";
import { Button } from "../components/Button";
import { Image } from "expo-image";
import { avatars } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";
import { WaitingSpinner } from "../components/WaitingSpinner";
import { branch } from "../lib/branch";

export default function InviteFriend() {
  const { gameId } = useLocalSearchParams();
  const router = useRouter();
  const { game, abortGame } = useGame({
    gameId: gameId as string | undefined,
  });
  const { myProfile } = useMyProfile();
  const navigation = useNavigation();
  const gamePlayState = game?.playState;

  useEffect(() => {
    // if game has ended go back home
    // if game is playing, go to game screen
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

  const inviteFriend = async () => {
    // Prefer a Branch link: it opens the app for existing users AND sends a
    // friend WITHOUT the app to the App Store, then drops them into this game
    // after they sign up (deferred deep link → setPendingJoinGame in _layout).
    // Fall back to the raw scheme link (existing-users-only) if Branch is absent.
    let link = `crossed://join-game?gameId=${gameId}`;
    if (branch) {
      try {
        const buo = await branch.createBranchUniversalObject(`game/${gameId}`, {
          title: "Play me on Crossed!",
          contentMetadata: {
            customMetadata: { joinGameId: String(gameId) },
          },
        });
        const res = await buo.generateShortUrl(
          { feature: "invite", channel: "share" },
          { joinGameId: String(gameId) }
        );
        if (res?.url) link = res.url;
      } catch {
        // keep the plain scheme fallback
      }
    }
    const shared = await Share.share({
      title: "Let's play",
      message: `Race me on Crossed 👉 ${link}`,
    });
    if (shared.action === Share.dismissedAction) {
      Alert.alert("Please invite a friend to play");
      return;
    }
  };

  const exitGame = () => {
    Alert.alert("Exit Game?", "Are you sure?", [
      { text: "Keep waiting", style: "cancel" },
      { text: "Exit", style: "destructive", onPress: () => abortGame() },
    ]);
  };

  if (!myProfile) {
    return null;
  }

  const friendlyAvatar = Object.keys(avatars).find(
    (a) => myProfile.avatar !== a
  ) as keyof typeof avatars;

  return (
    <View className="flex-1 items-center px-4 bg-white">
      <View className="mt-4 flex-row items-center">
        <WaitingSpinner />
        <Text className="text-base font-[jost600] ml-2">
          Waiting for opponent
        </Text>
      </View>
      <View className="mt-6">
        <View
          className="h-[180px] w-[180px] border-black/20 rounded-full items-center justify-center"
          style={{ borderWidth: StyleSheet.hairlineWidth }}
        >
          <View className="p-5 bg-gray-100 rounded-full">
            <Image
              source={avatars[friendlyAvatar]}
              className="h-[60px] w-[60px]"
            />
          </View>
        </View>
      </View>
      <View className="mt-6">
        <Button
          intent="primary"
          size="base"
          label="Invite a friend"
          rounded={"full"}
          onPress={inviteFriend}
        />
      </View>
      <View className="absolute bottom-8 inset-x-4">
        <Button
          intent="secondary"
          size="lg"
          label="Go back home"
          onPress={exitGame}
        />
      </View>
    </View>
  );
}
