import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GameVariant } from "../hooks/use-game";
import { useVariant } from "../hooks/use-variant";
import colors from "../lib/colors";

const TABS: { key: GameVariant; label: string }[] = [
  { key: "CROSSWORD", label: "Crosswords" },
  { key: "SUDOKU", label: "Sudoku" },
];

// Full-width Crosswords / Sudoku segmented control. Reads the app-wide variant
// context so home, leaderboard, and stats stay in sync.
// NOTE: flex uses inline styles, not nativewind className — `flex-1` via
// className does not apply on react-native-gesture-handler's TouchableOpacity.
export const VariantTabs = () => {
  const { variant, setVariant } = useVariant();
  const blue = colors["crossed-blue"]["450"];
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 9999,
        padding: 4,
        backgroundColor: colors["crossed-gray"]["100"],
      }}
    >
      {TABS.map((t) => {
        const active = variant === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.8}
            onPress={() => setVariant(t.key)}
            style={{
              flex: 1,
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
              className="font-[jost700] text-[15px]"
              style={{
                color: active ? "#ffffff" : colors["crossed-gray"]["400"],
              }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
