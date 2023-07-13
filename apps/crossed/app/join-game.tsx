import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useEffect } from "react";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";
import { Button } from "../components/Button";

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

  return (
    <Image
      source={images.splash_bg}
      className="flex-1 items-center justify-center px-4"
    >
      <Text className="text-2xl" style={{ fontFamily: "bitterBold" }}>
        Friendly Match
      </Text>
      <Text className="mb-8 mt-2 font-[latoRegular]">
        Play a friendly match with @{opponentUsername}
      </Text>
      <Button
        intent="primary"
        size="medium"
        label="Start Match"
        onPress={() => startGame()}
      />
    </Image>
  );
}
