import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { Logo } from "./Logo";

// The first screen a new player sees. Shared by the real welcome route and the
// in-app preview so they can never drift. Sets expectations (competitive, a live
// first match) before the player taps Play.
export const WelcomeContent = ({
  onPlay,
  isPlaying,
  onSignIn,
}: {
  onPlay: () => void;
  isPlaying?: boolean;
  onSignIn: () => void;
}) => {
  return (
    <View className="flex-1 items-center bg-crossed-gray-50">
      <View className="mt-24">
        <Logo />
      </View>
      <View className="mt-10 w-full items-center px-6">
        <View
          className="relative items-center"
          style={{ maxWidth: Dimensions.get("window").width - 48 }}
        >
          <View className="absolute inset-x-0 bottom-[6px] h-[28px] bg-crossed-yellow-300" />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="font-[besleyMedium] text-[52px] text-crossed-gray-900"
          >
            {"Let’s play."}
          </Text>
        </View>
        <Text
          className="mt-5 text-center font-[jost500] text-crossed-gray-500"
          style={{ fontSize: 15, lineHeight: 22 }}
        >
          The home of competitive crosswords & sudoku.{"\n"}
          Tap Play to race a real opponent in your first match.
        </Text>
      </View>
      <View className="mt-10 w-full px-5">
        <Button
          intent="primary"
          size="lg"
          rounded={"full"}
          isLoading={isPlaying}
          onPress={onPlay}
          label="PLAY"
        />
        <View className="my-9 w-full flex-row space-x-12 px-4">
          <View
            className="flex-1 bg-crossed-gray-200"
            style={{ height: StyleSheet.hairlineWidth }}
          />
          <View
            className="flex-1 bg-crossed-gray-200"
            style={{ height: StyleSheet.hairlineWidth }}
          />
        </View>
        <Button
          intent="primary"
          size="lg"
          rounded={"full"}
          mode={"outline"}
          onPress={onSignIn}
          label="SIGN IN"
        />
      </View>
    </View>
  );
};
