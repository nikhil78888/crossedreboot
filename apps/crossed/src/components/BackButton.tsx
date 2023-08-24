import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native-gesture-handler";
import { images } from "../lib/images";

export const BackButton = () => {
  const router = useRouter();

  if (!router.canGoBack) {
    return null;
  }

  return (
    <TouchableOpacity onPress={() => router.back()}>
      <Image
        source={images.back_arrow_left}
        className="h-6 w-4"
        contentFit="contain"
      />
    </TouchableOpacity>
  );
};
