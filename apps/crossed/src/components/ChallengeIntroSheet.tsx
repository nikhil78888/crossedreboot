import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Button } from "./Button";

// First-time explainer for the "Challenge a Friend" flow. A challenge starts by
// playing SOLO, which is confusing without context ("why am I playing alone?").
// This bottom sheet sets the expectation: solve it, send it, see who wins. Shown
// only until the player has been through it once (see NewGameButtons).
//
// Everything inside the Modal is wrapped in a GestureHandlerRootView and laid out
// with plain RN Views: a Modal spawns its own native view hierarchy OUTSIDE the
// app's root GestureHandlerRootView, so gesture-handler components (incl. our
// Button) don't lay out or receive touches without one — that's what pinned the
// sheet to the top of the screen.
const STEPS = [
  { emoji: "✏️", text: "Solve the puzzle to set your time" },
  { emoji: "📤", text: "Send your result to a friend" },
  { emoji: "🏆", text: "See who wins when they play" },
];

export const ChallengeIntroSheet = ({
  visible,
  onStart,
  onClose,
}: {
  visible: boolean;
  onStart: () => void;
  onClose: () => void;
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          {/* Tap outside the sheet to dismiss */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: "white",
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 34,
            }}
          >
            <Text
              className="text-center font-[jost700] text-crossed-gray-900"
              style={{ fontSize: 22 }}
            >
              Set a time for your friend to beat
            </Text>

            <View className="mt-6">
              {STEPS.map((s, i) => (
                <View key={s.text} className="mb-4 flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-crossed-gray-100">
                    <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
                  </View>
                  <Text
                    className="ml-3 flex-1 font-[jost500] text-crossed-gray-900"
                    style={{ fontSize: 16 }}
                  >
                    {`${i + 1}. ${s.text}`}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-4">
              <Button
                intent="primary"
                size="lg"
                rounded="full"
                label="Start Challenge"
                onPress={onStart}
              />
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};
