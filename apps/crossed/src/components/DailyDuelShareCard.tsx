import { forwardRef } from "react";
import { Text, View } from "react-native";
import { Logo } from "./Logo";

// A branded, offscreen result card for the Daily Duel — rendered into the tree
// (positioned offscreen) so react-native-view-shot can capture it to a PNG that
// the player shares as an image, like Wordle/other apps. All inline styles at a
// FIXED width so the capture is deterministic regardless of device (NativeWind
// className is unreliable inside a captured/offscreen view).

const PURPLE = "#7c3aed";
const GREEN = "#16a34a";
const INK = "#111827";
const SUB = "#6b7280";
const TRACK = "#ede9fe";

export type DuelShareData = {
  won: boolean;
  youSolved: boolean;
  yourSeconds: number;
  theirSeconds: number;
  rival: string;
  dateLabel: string;
  streak: number;
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, "0")}`;

const Bar = ({ frac, color }: { frac: number; color: string }) => (
  <View
    style={{
      height: 14,
      borderRadius: 7,
      backgroundColor: TRACK,
      flex: 1,
      overflow: "hidden",
    }}
  >
    <View
      style={{
        height: 14,
        borderRadius: 7,
        width: `${Math.max(8, Math.min(100, frac * 100))}%`,
        backgroundColor: color,
      }}
    />
  </View>
);

const Row = ({
  name,
  time,
  frac,
  win,
}: {
  name: string;
  time: string;
  frac: number;
  win: boolean;
}) => (
  <View style={{ marginTop: 12 }}>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
      }}
    >
      <Text
        style={{ fontFamily: "jost700", fontSize: 15, color: win ? INK : SUB }}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text
        style={{
          fontFamily: "jost700",
          fontSize: 15,
          color: win ? GREEN : SUB,
        }}
      >
        {time}
      </Text>
    </View>
    <Bar frac={frac} color={win ? GREEN : "#c4b5fd"} />
  </View>
);

export const DailyDuelShareCard = forwardRef<View, DuelShareData>(
  ({ won, youSolved, yourSeconds, theirSeconds, rival, dateLabel, streak }, ref) => {
    // Longer bar = faster. Winner gets a full bar; the other is proportional.
    let youFrac: number, themFrac: number;
    if (!youSolved) {
      youFrac = 0.1;
      themFrac = 1;
    } else if (won) {
      youFrac = 1;
      themFrac = theirSeconds > 0 ? yourSeconds / theirSeconds : 0.6;
    } else {
      themFrac = 1;
      youFrac = yourSeconds > 0 ? theirSeconds / yourSeconds : 0.6;
    }

    const headline = won ? "🏆  I WON" : youSolved ? "SO CLOSE" : "TOUGH ONE 😤";

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: 340,
          backgroundColor: "white",
          borderRadius: 28,
          paddingVertical: 26,
          paddingHorizontal: 24,
          borderWidth: 1,
          borderColor: "#f0edf7",
        }}
      >
        {/* header */}
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Text style={{ fontSize: 22 }}>⚔️</Text>
          <Text
            style={{
              fontFamily: "jost700",
              fontSize: 22,
              color: PURPLE,
              letterSpacing: 0.5,
            }}
          >
            CROSSED
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "jost600",
            fontSize: 13,
            color: SUB,
            marginTop: 2,
          }}
        >
          Daily Duel · {dateLabel}
        </Text>

        {/* result */}
        <Text
          style={{
            fontFamily: "jost700",
            fontSize: 32,
            color: won ? GREEN : INK,
            marginTop: 18,
          }}
        >
          {headline}
        </Text>

        {/* comparison */}
        <View style={{ marginTop: 14 }}>
          <Row
            name="You"
            time={youSolved ? fmt(yourSeconds) : "DNF"}
            frac={youFrac}
            win={won}
          />
          <Row
            name={rival}
            time={fmt(theirSeconds)}
            frac={themFrac}
            win={!won && youSolved ? true : !youSolved}
          />
        </View>

        {/* streak */}
        {streak >= 2 && (
          <View
            style={{
              marginTop: 18,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#fff7ed",
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: 15 }}>🔥</Text>
            <Text
              style={{ fontFamily: "jost700", fontSize: 14, color: "#c2410c" }}
            >
              {streak}-day streak
            </Text>
          </View>
        )}

        {/* footer */}
        <View
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "#f0edf7",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ transform: [{ scale: 0.7 }], marginLeft: -10 }}>
            <Logo />
          </View>
          <Text
            style={{ fontFamily: "jost600", fontSize: 13, color: PURPLE }}
          >
            🧩 Free on the App Store
          </Text>
        </View>
      </View>
    );
  }
);

DailyDuelShareCard.displayName = "DailyDuelShareCard";
