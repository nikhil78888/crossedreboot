import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GameVariant } from "../hooks/use-game";
import { useVariant } from "../hooks/use-variant";
import colors from "../lib/colors";

// Matched icon family: 🔠 (letters) for crosswords, 🔢 (numbers) for sudoku —
// instantly reads as words vs. numbers.
const TABS: { key: GameVariant; label: string; icon: string }[] = [
  { key: "CROSSWORD", label: "Crosswords", icon: "🔠" },
  { key: "SUDOKU", label: "Sudoku", icon: "🔢" },
];

// Full-width Crosswords / Sudoku tabs (underline style). Reads the app-wide
// variant context so home, leaderboard, and stats all stay in sync.
export const VariantTabs = () => {
  const { variant, setVariant } = useVariant();
  const blue = colors["crossed-blue"]["450"];
  const gray = colors["crossed-gray"]["400"];
  return (
    <View className="flex-row border-b border-crossed-gray-100">
      {TABS.map((t) => {
        const active = variant === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.7}
            onPress={() => setVariant(t.key)}
            className="flex-1 flex-row items-center justify-center pt-1.5 pb-3"
            style={{
              borderBottomWidth: 2.5,
              borderBottomColor: active ? blue : "transparent",
              marginBottom: -1,
            }}
          >
            <Text style={{ fontSize: 17, opacity: active ? 1 : 0.55 }}>
              {t.icon}
            </Text>
            <Text
              className="ml-2 font-[jost700] text-[16px]"
              style={{ color: active ? blue : gray }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
