import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";

export const NewGameButtons = () => {
  const router = useRouter();
  const { createFriendlyGame, createSoloGame } = useGame({ gameId: undefined });

  return (
    <View className="flex-row items-center space-x-2">
      <View className="flex-1">
        <TouchableOpacity
          onPress={() => {
            router.push("/ranked-lobby");
          }}
          className="h-[130] w-full max-w-[121] bg-crossed-green-50"
        >
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-3/5"
          />
          <Text className="ml-2.5 mt-2.5 font-[latoLight] text-xl text-crossed-black-700">
            Play{"\n"}Ranked
          </Text>
          <Image
            source={images.ranked}
            className="absolute bottom-2 right-1 aspect-square h-10"
          />
        </TouchableOpacity>
      </View>
      <View className="flex-1">
        <TouchableOpacity
          onPress={async () => {
            const gameId = await createFriendlyGame();
            router.push(`/invite-friend?gameId=${gameId}`);
          }}
          className="h-[130] w-full max-w-[121] bg-crossed-green-50"
        >
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-3/5"
          />
          <Text className="ml-2.5 mt-2.5 font-[latoLight] text-xl text-crossed-black-700">
            With{"\n"}Your{"\n"}Friend
          </Text>
          <Image
            source={images.friend}
            className="absolute bottom-2 right-1 h-[35] w-[50.83]"
          />
        </TouchableOpacity>
      </View>
      <View className="flex-1">
        <TouchableOpacity
          onPress={async () => {
            const gameId = await createSoloGame();
            router.push(`/game?gameId=${gameId}`);
          }}
          className="h-[130] w-full max-w-[121] bg-crossed-green-50"
        >
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-3/5"
          />
          <Text className="ml-2.5 mt-2.5 font-[latoLight] text-xl text-crossed-black-700">
            Play{"\n"}Solo
          </Text>
          <Image
            source={images.solo}
            className="absolute bottom-2 right-2 h-10 w-9"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
