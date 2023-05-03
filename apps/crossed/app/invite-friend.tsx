import { Alert, Share, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useRouter, useSearchParams } from "expo-router";
import { Image } from "expo-image";
import { images } from "../images";
import { useGame } from "../hooks/use-game";
import { useEffect } from "react";

export default function InviteFriend() {
  const { gameId } = useSearchParams();
  const router = useRouter();
  const { game } = useGame({ gameId: gameId as string | undefined });

  const gamePlayState = game?.play_state;

  useEffect(() => {
    // if game has ended go back home
    // if game is playing, go to game screen
    switch (gamePlayState) {
      case "COMPLETED":
        Alert.alert("The game has ended");
        router.replace("/");
        break;
      case "PLAYING":
        router.replace(`/game?gameId=${gameId}`);
        break;
      default:
        break;
    }
  }, [gameId, gamePlayState, router]);

  const inviteFriend = async () => {
    const shared = await Share.share({
      title: "Let's play",
      message: `crossed://join-game?gameId=${gameId}`,
    });
    if (shared.action === Share.dismissedAction) {
      Alert.alert("Please invite a friend to play");
      return;
    }
  };

  return (
    <Image
      source={images.splash_bg}
      className="flex-1 px-4 items-center justify-center"
    >
      <Text className="text-2xl" style={{ fontFamily: "Bitter_700Bold" }}>
        Friendly Match
      </Text>
      <Text className="mt-2 mb-8" style={{ fontFamily: "Lato_400Regular" }}>
        Waiting for opponent
      </Text>
      <PrimaryButton onPress={inviteFriend}>
        <View className="flex-1 items-center justify-center px-2">
          <Text className="text-white">Invite a Friend</Text>
        </View>
      </PrimaryButton>
    </Image>
  );
}
