import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { Crossword } from "../components/Crossword";
import { useCurrentUser } from "../hooks/use-current-user";
import { useEffect } from "react";

export default function Game() {
  const router = useRouter();
  const navigation = useNavigation();
  const { gameId } = useLocalSearchParams();
  const { game } = useGame({ gameId: gameId as string | undefined });
  const { user } = useCurrentUser();

  const gamePlayState = game?.play_state;
  const gameType = game?.game_type;

  useEffect(() => {
    switch (gameType) {
      case "FRIENDLY":
        navigation.setOptions({ headerTitle: "FRIENDLY MATCH" });
        break;
      case "SOLO":
        navigation.setOptions({ headerTitle: "SOLO MATCH" });
        break;
      default:
        break;
    }
  }, [gameType, navigation]);

  useEffect(() => {
    if (gamePlayState === "COMPLETED" && navigation.isFocused()) {
      router.push(`/game-results?gameId=${gameId}`);
    }
  }, [gamePlayState, gameId, router, navigation]);

  if (!user || !game) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-white`}>
      <Crossword gameId={gameId as string} />
    </View>
  );
}
