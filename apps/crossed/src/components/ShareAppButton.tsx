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
      message: `https://apps.apple.com/us/app/crossed/id6448530256`,
    });
  };

  return (
    <TouchableOpacity onPress={shareApp}>
      <View className="h-[64px] w-full rounded-[10px] bg-crossed-blue-50 flex-row items-center justify-between">
        <Text className="font-[jost500] text-black text-lg ml-4 flex-1">
          Invite Your Friends & Play a Friendly Match
        </Text>
        <Image
          source={images.share}
          className="h-7 w-7 mr-9 ml-12"
          contentFit="contain"
        />
      </View>
    </TouchableOpacity>
  );
};
