import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useEffect } from "react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";

export default function JoinGame() {
  const { gameId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { myProfile } = useMyProfile();
  const { game, startGame, opponentUsername } = useGame({
    gameId: gameId as string | undefined,
  });

  const gamePlayState = game?.playState;

  useEffect(() => {
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
          // navigation.navigate("game", { gameId });
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

  return (
    <Image
      source={images.splash_bg}
      className="flex-1 px-4 items-center justify-center"
    >
      <Text className="text-2xl" style={{ fontFamily: "bitterBold" }}>
        Friendly Match
      </Text>
      <Text className="mt-2 mb-8 font-[latoRegular]">
        Play a friendly match with @{opponentUsername}
      </Text>
      <PrimaryButton onPress={startGame}>
        <View className="flex-1 items-center justify-center px-2">
          <Text
            className="text-white text-lg"
            style={{ fontFamily: "bitterBold" }}
          >
            Start Match
          </Text>
        </View>
      </PrimaryButton>
    </Image>
  );
}
