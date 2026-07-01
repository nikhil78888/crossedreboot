import { useEffect } from "react";
import { Vibration } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// How fast the red flash breathes at each urgency tier (ms per half-cycle). The
// buzz uses the same cadence so vibration and flash stay in sync.
const pulseDuration = (pct: number) => (pct >= 97 ? 420 : pct >= 92 ? 620 : 880);

// A red edge-glow that pulses over the whole screen once the OPPONENT is closing
// in on the finish, so the player feels the pressure to rush. Off until 85%, then
// it pulses faster the closer the opponent gets. Non-interactive (overlay only).
export const UrgencyPulse = ({ progress }: { progress: number }) => {
  const pct = progress || 0;
  const active = pct >= 85;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, { duration: pulseDuration(pct) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 300 });
    }
    return () => cancelAnimation(pulse);
  }, [active, pct, pulse]);

  // Throb in time with the red flash: each beat is a "da-dum" double-pulse
  // (short-gap-short) rather than one steady buzz, and the beats quicken as the
  // opponent nears the finish. The pattern is [wait, buzz, wait, buzz] so it
  // reads as a heartbeat, not a constant rumble.
  useEffect(() => {
    if (!active) return;
    const cycle = pulseDuration(pct) * 2;
    const heartbeat = [0, 35, 110, 55];
    Vibration.vibrate(heartbeat);
    const id = setInterval(() => Vibration.vibrate(heartbeat), cycle);
    return () => {
      clearInterval(id);
      Vibration.cancel();
    };
  }, [active, pct]);

  // A full-screen red wash that breathes — kept low-opacity so the grid stays
  // readable. Floors at a faint tint so it never flickers to fully clear.
  const style = useAnimatedStyle(() => ({ opacity: 0.05 + pulse.value * 0.18 }));

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
          backgroundColor: "#ef4444",
        },
        style,
      ]}
    />
  );
};
