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
export const VariantTabs = () => {
  const { variant, setVariant } = useVariant();
  const blue = colors["crossed-blue"]["450"];
  return (
    <View
      className="flex-row rounded-full p-1"
      style={{ backgroundColor: colors["crossed-gray"]["100"] }}
    >
      {TABS.map((t) => {
        const active = variant === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.8}
            onPress={() => setVariant(t.key)}
            className="flex-1 items-center rounded-full"
            style={{
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
