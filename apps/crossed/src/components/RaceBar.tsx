import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import colors from "../lib/colors";

// A progress bar built for tension, not just information. The fill animates
// smoothly (so leads and overtakes glide instead of snapping), and — when it's
// the player's own "hot" bar — ramps from cool blue toward a burning red as it
// nears the finish. Past 90% it pulses, and the pulse accelerates the closer it
// gets, so the last stretch viscerally says "finish." A finish-line marker sits
// at the end of the track for the eye to chase.
export const RaceBar = ({
  progress,
  hot = false,
}: {
  progress: number;
  hot?: boolean;
}) => {
  const pct = Math.max(0, Math.min(100, progress || 0));
  const width = useSharedValue(pct);
  const pulse = useSharedValue(1);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 450 });
  }, [pct, width]);

  useEffect(() => {
    if (pct >= 90) {
      const dur = pct >= 99 ? 300 : pct >= 95 ? 450 : 700;
      pulse.value = withRepeat(withTiming(0.5, { duration: dur }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [pct, pulse]);

  const fillStyle = useAnimatedStyle(() => {
    const bg = hot
      ? interpolateColor(
          width.value,
          [0, 70, 90, 98, 100],
          [
            colors["crossed-blue"]["450"],
            colors["crossed-blue"]["450"],
            colors["crossed-yellow"]["300"],
            "#f97316",
            "#ef4444",
          ]
        )
      : colors["crossed-red"]["400"];
    return {
      width: `${width.value}%`,
      backgroundColor: bg,
      opacity: pulse.value,
    };
  });

  return (
    <View
      style={{ height: 12 }}
      className="relative w-full overflow-hidden rounded-full bg-crossed-gray-100"
    >
      <Animated.View style={[{ height: "100%" }, fillStyle]} />
      {/* finish line */}
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: "rgba(0,0,0,0.18)",
        }}
      />
    </View>
  );
};
