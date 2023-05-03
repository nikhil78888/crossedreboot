import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useGame } from "../hooks/use-game";
import { useRouter } from "expo-router";

export const SoloCrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { game, finishGame } = useGame({
    gameId,
  });
  const router = useRouter();

  if (!game) {
    return null;
  }

  const submitMatch = async () => {
    await finishGame();
    router.push(`/game-results?gameId=${gameId}`);
  };

  return (
    <View className="flex-row items-center justify-end">
      <TouchableOpacity
        onPress={submitMatch}
        className="bg-crossed-blue-400 h-[30] w-[110] rounded-sm items-center justify-center ml-3"
      >
        <Text
          className="text-white text-sm"
          style={{ fontFamily: "Bitter_700Bold" }}
        >
          Submit Match
        </Text>
      </TouchableOpacity>
    </View>
  );
};
