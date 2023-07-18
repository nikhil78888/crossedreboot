import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useGame } from "../hooks/use-game";

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
      <TouchableOpacity
        onPress={submitMatch}
        className="bg-crossed-blue-400 h-[30] w-[110] rounded-sm items-center justify-center ml-3"
      >
        <Text
          className="text-white text-sm"
          style={{ fontFamily: "bitterBold" }}
        >
          Submit Match
        </Text>
      </TouchableOpacity>
    </View>
  );
};
