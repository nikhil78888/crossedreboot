import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useChallengeResults } from "../hooks/use-challenge-results";
import { fmtSolve } from "../app/(home-tabs)/stats";
import colors from "../lib/colors";

// The challenger's feedback loop: cards showing who accepted their shared
// challenge and whether they beat the time. Each is dismissible (marks seen);
// a footer CTA nudges them to play + re-challenge.
export const ChallengeResultsBanner = () => {
  const router = useRouter();
  const { results, dismiss } = useChallengeResults();

  if (!results.length) return null;

  return (
    <View className="mt-3" style={{ gap: 10 }}>
      {results.map((r) => {
        const rival = r.opponentName || "Someone";
        const lost = r.opponentWon; // the challenger lost = opponent won
        const tint = lost ? "#FFE9EC" : colors["crossed-green"]["100"];
        const accent = lost
          ? colors["crossed-red"]["500"]
          : colors["crossed-green"]["700"];
        return (
          <View
            key={r.id}
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: tint }}
          >
            <View className="flex-row items-start">
              <View className="flex-1 pr-2">
                <Text
                  className="font-[jost700] text-[15px] text-crossed-gray-900"
                  numberOfLines={2}
                >
                  {lost
                    ? `⚡ ${rival} beat your time!`
                    : `🛡️ Your time held vs ${rival}`}
                </Text>
                <Text className="mt-1 font-[jost400] text-[13px] text-crossed-gray-900/70">
                  {lost
                    ? `They solved your puzzle in ${fmtSolve(
                        r.opponentSeconds
                      )} — you had ${fmtSolve(r.challengerSeconds)}.`
                    : `${rival} finished in ${fmtSolve(
                        r.opponentSeconds
                      )} — your ${fmtSolve(r.challengerSeconds)} stood.`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => dismiss([r.id])}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="rounded-full px-2"
              >
                <Text style={{ color: accent, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push("/select-difficulty?mode=SOLO")}
        className="rounded-full items-center py-3"
        style={{ backgroundColor: colors["crossed-blue"]["450"] }}
      >
        <Text className="font-[jost700] text-[14px] text-white">
          ⚡ Play & challenge again
        </Text>
      </TouchableOpacity>
    </View>
  );
};
