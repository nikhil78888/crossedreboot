import { useState } from "react";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Button } from "./Button";

// A quick, skippable "how to play" panel for the crossword race. Rendered as an
// opaque bottom sheet BELOW the (frozen) board so it reads as one screen — the
// grid and race bars stay visible above it, and the sheet holds the coaching.
// Skip lives inside the sheet (the game header's Quit button is hidden while
// this is up), so the two never collide.
//
// For now this is wired to fire only on the settings "Preview new-user
// experience" path so it can be tested before it ships to real new users.
const STEPS = [
  {
    emoji: "🏁",
    title: "It's a race",
    body: "Fill every square correctly before your opponent does. Their progress is the bar up top.",
  },
  {
    emoji: "👆",
    title: "Pick a square",
    body: "Tap any square to select it. Its clue appears in the bar just below the grid.",
  },
  {
    emoji: "⌨️",
    title: "Type your answer",
    body: "Use the keyboard to fill letters — the grid jumps to the next square automatically.",
  },
  {
    emoji: "🔁",
    title: "Across or Down",
    body: "Tap a selected square again, or tap the clue itself, to switch between Across and Down.",
  },
  {
    emoji: "◀ ▶",
    title: "Move between clues",
    body: "Use the arrows on either side of the clue to step to the next or previous one. Solve it all to win!",
  },
];

export const CrosswordTutorial = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        backgroundColor: "white",
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 34,
        // Lift it off the board so it clearly reads as a panel.
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      {/* Top row: progress dots (left) + Skip (right) */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row">
          {STEPS.map((s, i) => (
            <View
              key={s.title}
              className={`mr-1.5 h-2 w-2 rounded-full ${
                i === step ? "bg-crossed-blue-450" : "bg-crossed-gray-200"
              }`}
            />
          ))}
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Text className="font-[jost600] text-sm text-crossed-gray-400">
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center">
        <Text style={{ fontSize: 34 }}>{current.emoji}</Text>
        <View className="ml-3 flex-1">
          <Text
            className="font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 20 }}
          >
            {current.title}
          </Text>
        </View>
      </View>
      <Text
        className="mt-2 font-[jost400] text-crossed-gray-400"
        style={{ fontSize: 15, lineHeight: 22 }}
      >
        {current.body}
      </Text>

      <View className="mt-5">
        <Button
          intent="primary"
          size="lg"
          rounded="full"
          label={isLast ? "Let’s play" : "Next"}
          onPress={() => (isLast ? onClose() : setStep((s) => s + 1))}
        />
      </View>
    </View>
  );
};
