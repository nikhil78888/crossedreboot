import { Image } from "expo-image";
import { Text } from "react-native";
import { images } from "../lib/images";
import { TouchableOpacity } from "react-native-gesture-handler";

export const PlaySoloButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="h-[130] w-[121] bg-crossed-green-50"
    >
      <Image
        source={images.card_ellipsis}
        className="absolute right-0 bottom-0 w-3/5 aspect-square"
      />
      <Text
        className="text-crossed-black-700 text-xl ml-2.5 mt-2.5"
        style={{ fontFamily: "Lato_300Light" }}
      >
        Play{"\n"}Solo
      </Text>
      <Image
        source={images.solo}
        className="absolute h-10 w-9 bottom-2 right-2"
      />
    </TouchableOpacity>
  );
};
