import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordProvider } from "../components/Crossword";
import { useCurrentUser } from "../hooks/use-current-user";
import { FriendlyCrosswordHeader } from "../components/FriendlyCrosswordHeader";
import { useEffect } from "react";
import { SoloCrosswordHeader } from "../components/SoloCrosswordHeader";

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
    if (gamePlayState === "COMPLETED") {
      router.push(`/game-results?gameId=${gameId}`);
    }
  }, [gamePlayState, gameId, router]);

  if (!user || !game) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-white`}>
      {game.game_type === "FRIENDLY" && (
        <FriendlyCrosswordHeader gameId={gameId as string} />
      )}
      {game.game_type === "SOLO" && (
        <SoloCrosswordHeader gameId={gameId as string} />
      )}
      <CrosswordProvider
        currentGame={game}
        currentGameId={gameId as string}
        currentUser={user}
      />
    </View>
  );
}
