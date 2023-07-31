import { View } from "react-native";
import { useGame } from "../hooks/use-game";
import { Button } from "./Button";

export const SoloCrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { game, finishGame } = useGame({
    gameId,
  });

  if (!game) {
    return null;
  }

  const submitMatch = () => {
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
