import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { useEffect } from "react";
import { Button } from "../components/Button";
import { events, trackEvent } from "../lib/track-event";

export default function Game() {
  const router = useRouter();
  const navigation = useNavigation();
  const { gameId } = useLocalSearchParams();
  const { game, finishGame, forfeitGame } = useGame({
    gameId: gameId as string | undefined,
  });

  const gamePlayState = game?.playState;
  const gameType = game?.gameType;

  useEffect(() => {
    switch (gameType) {
      case "FRIENDLY":
        navigation.setOptions({
          headerTitle: "FRIENDLY MATCH",
          headerRight: () => {
            return (
              <Button
                intent={"danger"}
                mode={"text"}
                size={"sm"}
                label="Leave"
                onPress={() => {
                  trackEvent(events.FORFEIT_MATCH_CLICK);
                  forfeitGame();
                }}
              />
            );
          },
        });
        break;
      case "SOLO":
        navigation.setOptions({
          headerTitle: "PRACTICE MATCH",
          headerRight: () => {
            return (
              <Button
                intent={"danger"}
                mode={"text"}
                size={"sm"}
                label="Leave"
                onPress={() => {
                  trackEvent(events.SUBMIT_SOLO_MATCH_CLICK);
                  finishGame();
                }}
              />
            );
          },
        });
        break;
      case "RANKED":
        navigation.setOptions({
          headerTitle: "RANKED MATCH",
          headerRight: () => {
            return (
              <Button
                intent={"danger"}
                mode={"text"}
                size={"sm"}
                label="Leave"
                onPress={() => {
                  trackEvent(events.FORFEIT_MATCH_CLICK);
                  forfeitGame();
                }}
              />
            );
          },
        });
        break;
      default:
        break;
    }
  }, [finishGame, forfeitGame, gameType, navigation]);

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
