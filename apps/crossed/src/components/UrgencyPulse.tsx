import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// A red edge-glow that pulses over the whole screen once the OPPONENT is closing
// in on the finish, so the player feels the pressure to rush. Off until 85%, then
// it pulses faster the closer the opponent gets. Non-interactive (overlay only).
export const UrgencyPulse = ({ progress }: { progress: number }) => {
  const pct = progress || 0;
  const active = pct >= 85;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      const dur = pct >= 97 ? 420 : pct >= 92 ? 620 : 880;
      pulse.value = withRepeat(withTiming(1, { duration: dur }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 300 });
    }
    return () => cancelAnimation(pulse);
  }, [active, pct, pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value * 0.55 }));

  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderWidth: 6,
          borderColor: "#ef4444",
        },
        style,
      ]}
    />
  );
};
