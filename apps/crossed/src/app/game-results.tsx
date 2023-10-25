import { useLocalSearchParams } from "expo-router";
import { useGame } from "../hooks/use-game";
import {
  FriendlyGameResult,
  SoloGameResult,
} from "../components/CrosswordResults";
import { View } from "react-native";

export default function GameResults() {
  const { gameId, myRating, opponentRating } = useLocalSearchParams();
  const { game } = useGame({ gameId: gameId as string });

  if (!gameId || !game) {
    return null;
  }

  return (
    <View className="flex-1">
      {game.gameType === "SOLO" ? (
        <SoloGameResult gameId={String(gameId)} />
      ) : (
        <FriendlyGameResult
          gameId={String(gameId)}
          myRating={String(myRating)}
          opponentRating={String(opponentRating)}
        />
      )}
    </View>
  );
}
