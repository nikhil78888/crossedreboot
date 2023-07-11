import { useLocalSearchParams } from "expo-router";
import { useGame } from "../hooks/use-game";
import {
  FriendlyGameResult,
  SoloGameResult,
} from "../components/CrosswordResults";
import { View } from "react-native";

export default function GameResults() {
  const { gameId }: { gameId?: string } = useLocalSearchParams();
  const { game } = useGame({ gameId: gameId });

  if (!gameId || !game) {
    return null;
  }

  return (
    <View className="flex-1">
      {game.gameType === "SOLO" ? (
        <SoloGameResult gameId={gameId} />
      ) : (
        <FriendlyGameResult gameId={gameId} />
      )}
    </View>
  );
}
