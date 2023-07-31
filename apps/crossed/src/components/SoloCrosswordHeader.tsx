import { View } from "react-native";
import { useGame } from "../hooks/use-game";
import { Button } from "./Button";
import { events, trackEvent } from "../lib/track-event";

export const SoloCrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { game, finishGame } = useGame({
    gameId,
  });

  if (!game) {
    return null;
  }

  const submitMatch = () => {
    trackEvent(events.SUBMIT_SOLO_MATCH_CLICK);
    finishGame();
  };

  return (
    <View className="flex-row items-center justify-end">
      <Button
        intent="secondary"
        size="small"
        onPress={submitMatch}
        label="Submit Match"
      />
    </View>
  );
};
