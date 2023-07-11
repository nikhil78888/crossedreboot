import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { useEffect } from "react";

export default function Game() {
  const router = useRouter();
  const navigation = useNavigation();
  const { gameId } = useLocalSearchParams();
  const { game } = useGame({ gameId: gameId as string | undefined });

  const gamePlayState = game?.playState;
  const gameType = game?.gameType;

  useEffect(() => {
    switch (gameType) {
      case "FRIENDLY":
        navigation.setOptions({ headerTitle: "FRIENDLY MATCH" });
        break;
      case "SOLO":
        navigation.setOptions({ headerTitle: "SOLO MATCH" });
        break;
      case "RANKED":
        navigation.setOptions({ headerTitle: "RANKED MATCH" });
        break;
      default:
        break;
    }
  }, [gameType, navigation]);

  useEffect(() => {
    if (gamePlayState === "COMPLETED" && navigation.isFocused()) {
      router.replace(`/game-results?gameId=${gameId}`);
    }
  }, [gamePlayState, gameId, router, navigation]);

  if (!game) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-white`}>
      <CrosswordGrid gameId={gameId as string} />
    </View>
  );
}
