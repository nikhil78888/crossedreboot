import { Text, View } from "react-native";
import { Button } from "./Button";
import { Logo } from "./Logo";

// Shown on Home for a brand-new (just-named) player. Their first game IS Story
// Mode Level 1 — an easy, generous puzzle vs the first boss — so the copy sets
// that up: begin the 200-level journey, beat the clock to advance.
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
        Your journey starts in{" "}
        <Text className="font-[jost700] text-crossed-gray-700">Story Mode</Text> —
        200 levels of puzzles, one boss at a time. First up:{" "}
        <Text className="font-[jost700] text-crossed-gray-700">Level 1</Text>. Solve
        it before the clock to advance!
      </Text>
      <View className="mt-10 w-full px-2">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="Start Level 1 →"
          isLoading={isLoading}
          onPress={onPlay}
        />
      </View>
    </View>
  );
};
