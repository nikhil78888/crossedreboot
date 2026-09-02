import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native-gesture-handler";
import { images } from "../lib/images";

// Default header back button. `canGoBack` is a METHOD — the old code checked the
// (always-truthy) function reference, so the arrow rendered even with nothing to
// go back to and then no-op'd on tap. Now it always does something useful: go
// back if there's history, otherwise return to Home.
export const BackButton = () => {
  const router = useRouter();
  return (
    <TouchableOpacity
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 16 }}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(home-tabs)/home");
        }
      }}
    >
      <Image
        source={images.back_arrow_left}
        className="h-6 w-4"
        contentFit="contain"
      />
    </TouchableOpacity>
  );
};
