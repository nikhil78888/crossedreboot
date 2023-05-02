import { ActivityIndicator, Alert, Text, View } from "react-native";
import { PlaySoloButton } from "../components/PlaySoloButton";
import { PlayFriendlyButton } from "../components/PlayFriendlyButton";
import { Image } from "expo-image";
import { images } from "../images";
import { useCurrentUser } from "../hooks/use-current-user";
import { useGame } from "../hooks/use-game";
import { useRouter } from "expo-router";
import { useCurrentGame } from "../hooks/use-current-game";
import { useEffect } from "react";

export default function Index() {
  const { profile } = useCurrentUser();
  const { currentGameId, loadingCurrentGameId } = useCurrentGame();
  const { createSoloGame, createFriendlyGame, game } = useGame({
    gameId: currentGameId,
  });
  const router = useRouter();

  const gamePlayState = game?.play_state;

  useEffect(() => {
    switch (gamePlayState) {
      case "PLAYING":
      case "COMPLETED":
        router.replace(`/game?gameId=${currentGameId}`);
        break;
      case "WAITING_FOR_OPPONENT":
        router.replace(`/invite-friend?gameId=${currentGameId}`);
        break;
      default:
        break;
    }
  }, [currentGameId, gamePlayState, router]);

  if (loadingCurrentGameId) {
    return (
      <Image
        source={images.splash_bg}
        className="flex-1 px-4 items-center justify-center"
      >
        <ActivityIndicator />
      </Image>
    );
  }

  return (
    <Image
      source={images.splash_bg}
      className="flex-1 px-4 items-center justify-center"
    >
      <View className="absolute top-32 items-center">
        <Image source={images.logo} className="h-20 aspect-square" />
        <Text
          className="mt-1 text-crossed-green-900 text-xl"
          style={{ fontFamily: "Lato_700Bold" }}
        >
          Crossed
        </Text>
      </View>
      <View className="w-full">
        <Text
          className="text-crossed-green-900 text-xl"
          style={{ fontFamily: "Bitter_700Bold" }}
        >
          Welcome
        </Text>
        <Text
          className="text-crossed-green-900 text-4xl"
          style={{ fontFamily: "Bitter_700Bold" }}
        >
          @{profile?.username}
        </Text>
        <Text className="mt-6 text-xl" style={{ fontFamily: "Bitter_700Bold" }}>
          Start a New Match
        </Text>
        <View className="mt-2 flex-row items-center space-x-2">
          <View>
            <PlaySoloButton
              onPress={async () => {
                try {
                  const newGameId = await createSoloGame();
                  router.replace(`/game?gameId=${newGameId}`);
                } catch (createSoloGameError) {
                  Alert.alert(
                    "Error",
                    "Could not start game. Please try again"
                  );
                }
              }}
            />
          </View>
          <View>
            <PlayFriendlyButton
              onPress={async () => {
                try {
                  const newGameId = await createFriendlyGame();
                  router.replace(`/invite-friend?gameId=${newGameId}`);
                } catch (createFriendlyGameError) {
                  console.error(createFriendlyGameError);
                  Alert.alert(
                    "Error",
                    "Could not start game. Please try again"
                  );
                }
              }}
            />
          </View>
        </View>
      </View>
    </Image>
  );
}
