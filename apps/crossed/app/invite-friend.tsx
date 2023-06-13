import { Alert, Share, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useNavigation, useRouter, useSearchParams } from "expo-router";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useGame } from "../hooks/use-game";
import { useEffect } from "react";
import { TouchableOpacity } from "react-native-gesture-handler";

export default function InviteFriend() {
  const { gameId } = useSearchParams();
  const router = useRouter();
  const { game, abortGame } = useGame({
    gameId: gameId as string | undefined,
  });
  const navigation = useNavigation();
  const gamePlayState = game?.play_state;

  useEffect(() => {
    // if game has ended go back home
    // if game is playing, go to game screen
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "COMPLETED":
          Alert.alert("The game has ended");
          router.replace("/");
          break;
        case "ABORTED":
          Alert.alert("The game was aborted");
          router.replace("/");
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
    const shared = await Share.share({
      title: "Let's play",
      message: `crossed://join-game?gameId=${gameId}`,
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
          <Text
            className="text-white text-lg"
            style={{ fontFamily: "Bitter_700Bold" }}
          >
            Invite a Friend
          </Text>
        </View>
      </PrimaryButton>
      <TouchableOpacity
        className="mt-8 h-10 px-2 justify-center"
        onPress={exitGame}
      >
        <Text
          className="text-gray-600 text-lg"
          style={{ fontFamily: "Lato_400Regular" }}
        >
          Exit Game
        </Text>
      </TouchableOpacity>
    </Image>
  );
}
