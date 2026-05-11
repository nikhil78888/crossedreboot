import { ActivityIndicator, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import { ShareAppButton } from "../../components/ShareAppButton";
import { useCurrentGame } from "../../hooks/use-current-game";
import { useGame } from "../../hooks/use-game";
import { Button } from "../../components/Button";
import { NewGameButtons } from "../../components/NewGameButtons";
import { ScrollView } from "react-native-gesture-handler";

export default function Home() {
  const { currentGameId, loadingCurrentGameId } = useCurrentGame();
  const { game } = useGame({
    gameId: currentGameId,
  });
  const router = useRouter();
  const navigation = useNavigation();

  const gamePlayState = game?.playState;

  useEffect(() => {
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "PLAYING":
          router.push(`/game?gameId=${currentGameId}`);
          break;
        case "WAITING_FOR_OPPONENT":
          router.push(`/invite-friend?gameId=${currentGameId}`);
          break;
        default:
          break;
      }
    }
  }, [currentGameId, gamePlayState, router, navigation]);

  if (loadingCurrentGameId) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  if (currentGameId && !game) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      className="flex-1 bg-white px-4"
    >
      <View className="mt-2">
        <NewGameButtons />
      </View>
      <View className="mt-5 w-full">
        <ShareAppButton />
      </View>
      <View className="mt-5">
        <Button
          intent={"secondary"}
          label="Feedback"
          size={"base"}
          onPress={() => router.push("/feedback")}
        />
      </View>
    </ScrollView>
  );
}
