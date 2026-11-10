import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { GameVariant } from "../hooks/use-game";
import { useVariant } from "../hooks/use-variant";
import colors from "../lib/colors";

// "MAP_TAP" is a LAUNCHER, not a pipeline variant — it's a standalone game for
// now, so tapping it routes to /map-tap instead of calling setVariant.
type TabKey = GameVariant | "MAP_TAP";
const TABS: { key: TabKey; label: string }[] = [
  { key: "CROSSWORD", label: "Crossword" },
  { key: "SUDOKU", label: "Sudoku" },
  { key: "WORD_SEARCH", label: "Word Search" },
  { key: "MAP_TAP", label: "Map Tap" },
  // TRIVIA disabled (2026-08): not reaching users — hidden from the picker for now.
  // { key: "TRIVIA", label: "Trivia" },
];

// Full-width Crosswords / Sudoku segmented control. flex:1 lives on a plain
// wrapper View (it does not apply reliably on react-native-gesture-handler's
// TouchableOpacity), and the touchable stretches to fill it.
export const VariantTabs = () => {
  const { variant, setVariant } = useVariant();
  const router = useRouter();
  const blue = colors["crossed-blue"]["450"];
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 9999,
        padding: 5,
        gap: 6,
        backgroundColor: colors["crossed-gray"]["100"],
      }}
    >
      {TABS.map((t) => {
        const active = t.key !== "MAP_TAP" && variant === t.key;
        return (
          <View key={t.key} style={{ flex: 1 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                t.key === "MAP_TAP"
                  ? router.push("/map-tap")
                  : setVariant(t.key)
              }
              style={{
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9999,
                paddingVertical: 11,
                backgroundColor: active ? blue : "transparent",
                shadowColor: "#000",
                shadowOpacity: active ? 0.15 : 0,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: active ? 2 : 0,
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="font-[jost700] text-[14px]"
                style={{
                  color: active ? "#ffffff" : colors["crossed-gray"]["400"],
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};
