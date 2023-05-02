import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordProvider } from "../components/Crossword";
import { useCurrentUser } from "../hooks/use-current-user";
import { CrosswordHeader } from "../components/CrosswordHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CrosswordResults } from "../components/CrosswordResults";

export default function Game() {
  const { gameId } = useLocalSearchParams();
  const { game } = useGame({ gameId: gameId as string | undefined });
  const { user } = useCurrentUser();
  const { top } = useSafeAreaInsets();

  if (!user || !game) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className={`flex-1`} style={{ paddingTop: top }}>
      {game.game_type === "FRIENDLY" && (
        <CrosswordHeader gameId={gameId as string} />
      )}
      <CrosswordProvider
        currentGame={game}
        currentGameId={gameId as string}
        currentUser={user}
      />
      {game.play_state === "COMPLETED" && (
        <CrosswordResults gameId={gameId as string} />
      )}
    </View>
  );
}
