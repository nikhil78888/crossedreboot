import { Share, Text, View } from "react-native";
import { PrimaryButton } from "./PrimaryButton";

export const ShareAppButton = () => {
  const shareApp = () => {
    Share.share({
      title: "Checkout Crossed.",
      message: `https://testflight.apple.com/join/J4vOwUyk`,
    });
  };

  return (
    <PrimaryButton onPress={shareApp}>
      <View className="h-full w-full items-center justify-center">
        <Text className="text-white" style={{ fontFamily: "bitterBold" }}>
          Share Crossed with friends
        </Text>
      </View>
    </PrimaryButton>
  );
};
