import { Image } from "expo-image";
import { Text } from "react-native";
import { images } from "../lib/images";
import { TouchableOpacity } from "react-native-gesture-handler";

export const PlayFriendlyButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="h-[130] w-full max-w-[121] bg-crossed-green-50"
    >
      <Image
        source={images.card_ellipsis}
        className="absolute right-0 bottom-0 w-3/5 aspect-square"
      />
      <Text className="text-crossed-black-700 text-xl ml-2.5 mt-2.5 font-[latoLight]">
        With{"\n"}Your{"\n"}Friend
      </Text>
      <Image
        source={images.friend}
        className="absolute h-[35] w-[50.83] bottom-2 right-1"
      />
    </TouchableOpacity>
  );
};
