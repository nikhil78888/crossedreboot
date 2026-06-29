import { Text, View } from "react-native";
import { Button } from "./Button";
import { Logo } from "./Logo";

// Shown on Home for a brand-new (just-named) player. The intro match is a
// friendly warm-up vs a bot — we say so up front, then drop them in on tap.
export const IntroGamePrompt = ({
  username,
  onPlay,
  isLoading,
}: {
  username?: string | null;
  onPlay: () => void;
  isLoading?: boolean;
}) => {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Logo />
      <Text
        className="mt-10 text-center font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 30 }}
        numberOfLines={2}
      >
        You’re all set{username ? `, ${username}` : ""}!
      </Text>
      <Text
        className="mt-3 text-center font-[jost500] text-crossed-gray-500"
        style={{ fontSize: 16, lineHeight: 24 }}
      >
        Tap below to start a quick practice match against a{" "}
        <Text className="font-[jost700] text-crossed-gray-700">friendly bot</Text>{" "}
        so you can learn the ropes. You’ll race real people after.
      </Text>
      <View className="mt-10 w-full px-2">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="Start warm-up vs bot"
          isLoading={isLoading}
          onPress={onPlay}
        />
      </View>
    </View>
  );
};
