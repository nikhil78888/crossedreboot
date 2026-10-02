import { forwardRef } from "react";
import { Text, View } from "react-native";
import { Logo } from "./Logo";

// Offscreen, branded card for sharing your Daily Duel RANK (vs the finish-screen
// card, which shares your time). Captured to a PNG by react-native-view-shot.
// Fixed width + inline styles so the capture is deterministic across devices.

const PURPLE = "#7c3aed";
const GREEN = "#16a34a";
const INK = "#111827";
const SUB = "#6b7280";

export type RankShareData = {
  rank: number | null;
  percentile: number | null;
  beatPct: number | null;
  total: number;
  yourSeconds: number | null;
  dnf: boolean;
  dateLabel: string;
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, "0")}`;

export const DailyRankShareCard = forwardRef<View, RankShareData>(
  ({ rank, percentile, beatPct, total, yourSeconds, dnf, dateLabel }, ref) => {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: 340,
          backgroundColor: "white",
          borderRadius: 28,
          paddingVertical: 28,
          paddingHorizontal: 24,
          borderWidth: 1,
          borderColor: "#f0edf7",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
          style={{ fontFamily: "jost600", fontSize: 13, color: SUB, marginTop: 2 }}
        >
          Daily Duel · {dateLabel}
        </Text>

        {dnf ? (
          <>
            <Text
              style={{
                fontFamily: "jost700",
                fontSize: 40,
                color: INK,
                marginTop: 22,
              }}
            >
              😤 TOUGH ONE
            </Text>
            <Text
              style={{
                fontFamily: "jost600",
                fontSize: 16,
                color: SUB,
                marginTop: 8,
              }}
            >
              Didn't beat the clock today. Can you?
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{
                fontFamily: "jost500",
                fontSize: 15,
                color: SUB,
                marginTop: 22,
              }}
            >
              I ranked
            </Text>
            <Text
              style={{
                fontFamily: "jost700",
                fontSize: 60,
                color: GREEN,
                marginTop: -2,
              }}
            >
              #{rank}
            </Text>
            <Text
              style={{ fontFamily: "jost700", fontSize: 20, color: INK }}
            >
              {percentile != null ? `Top ${percentile}%` : ""}
              {yourSeconds != null ? `  ·  ${fmt(yourSeconds)}` : ""}
            </Text>
            {beatPct != null && total > 1 && (
              <Text
                style={{
                  fontFamily: "jost500",
                  fontSize: 14,
                  color: SUB,
                  marginTop: 4,
                }}
              >
                Faster than {beatPct}% of {total} players today
              </Text>
            )}
          </>
        )}

        <View
          style={{
            marginTop: 24,
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
          <Text style={{ fontFamily: "jost600", fontSize: 13, color: PURPLE }}>
            🧩 Free on the App Store
          </Text>
        </View>
      </View>
    );
  }
);

DailyRankShareCard.displayName = "DailyRankShareCard";
