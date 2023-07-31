import { Image } from "expo-image";
import { Share, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { images } from "../lib/images";
import { events, trackEvent } from "../lib/track-event";

export const ShareAppButton = () => {
  const shareApp = () => {
    trackEvent(events.SHARE_CROSSED_CLICK);
    Share.share({
      title: "Checkout Crossed.",
      message: `https://testflight.apple.com/join/J4vOwUyk`,
    });
  };

  return (
    <TouchableOpacity onPress={shareApp}>
      <View className="h-10 w-full rounded-sm bg-crossed-green-50 border border-crossed-green-100 flex-row items-center pl-3">
        <Text className="font-[latoLight] text-crossed-black-700 text-base">
          Invite Your Friends & Play a Friendly Match
        </Text>
        <View className="absolute right-0 h-full aspect-square bg-crossed-green-100 rounded-l-[20px] rounded-r-sm items-center justify-center">
          <Image source={images.share_red} className="h-[25] w-[25]" />
        </View>
      </View>
    </TouchableOpacity>
  );
};
