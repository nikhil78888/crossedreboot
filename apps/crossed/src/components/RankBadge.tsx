import { View, Text } from "react-native";
import { getRank } from "../lib/rank";

// Compact tier badge for list rows, and a large version (with progress) for
// profile/stats. Turns a rating number into "Gold II 🥇" etc.
export const RankBadge = ({
  rating,
  size = "sm",
}: {
  rating?: number | null;
  size?: "sm" | "lg";
}) => {
  const rank = getRank(rating);

  if (size === "lg") {
    return (
      <View className="items-center">
        <Text style={{ fontSize: 44 }}>{rank.emoji}</Text>
        <Text className="font-[jost700] text-xl mt-1" style={{ color: rank.color }}>
          {rank.label}
        </Text>
        <Text className="font-[jost500] text-sm text-crossed-gray-400 mt-0.5">
          {Math.round(rating ?? 1100)} pts
        </Text>
        {rank.pointsToNext != null && (
          <View className="w-40 mt-2">
            <View className="h-2 rounded-full bg-crossed-gray-100 overflow-hidden">
              <View
                className="h-2 rounded-full"
                style={{ width: `${Math.round(rank.progress * 100)}%`, backgroundColor: rank.color }}
              />
            </View>
            <Text className="font-[jost400] text-xs text-crossed-gray-400 mt-1 text-center">
              {rank.pointsToNext} pts to next
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-row items-center">
      <Text style={{ fontSize: 16 }}>{rank.emoji}</Text>
      <Text
        className="ml-1 font-[jost600] text-[13px]"
        style={{ color: rank.color }}
      >
        {rank.label}
      </Text>
    </View>
  );
};
