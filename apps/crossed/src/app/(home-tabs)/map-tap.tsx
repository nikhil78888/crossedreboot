import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  GestureResponderEvent,
} from "react-native";
import { Image } from "expo-image";
import { Button } from "../../components/Button";
import {
  makeRound,
  scoreTap,
  lonToXFrac,
  latToYFrac,
  xFracToLon,
  yFracToLat,
  fmtKm,
  MISS_PENALTY_SEC,
  TOLERANCE_KM,
  type MapPlace,
  type TapResult,
} from "../../lib/map-tap";

// Standalone Map Tap game (v1): play a timed round locally — no server game,
// no ghost yet. We wire it into Daily Duel / Story Mode once the feel is dialed.
const MAP = require("../../assets/images/maptap-world.png");
const MAP_RATIO = 954 / 1920; // the bundled equirectangular map's H/W

type Phase = "intro" | "playing" | "done";

export default function MapTapScreen() {
  const screenW = Dimensions.get("window").width;
  const mapW = screenW - 24;
  const mapH = Math.round(mapW * MAP_RATIO);

  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<MapPlace[]>([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<TapResult[]>([]);
  const [feedback, setFeedback] = useState<TapResult | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live timer tick while playing.
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(
    () => () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    },
    []
  );

  const start = () => {
    setRound(makeRound(Math.floor(Math.random() * 0xffffffff) || 1));
    setIdx(0);
    setResults([]);
    setFeedback(null);
    const now = Date.now();
    setStartMs(now);
    setNowMs(now);
    setPhase("playing");
  };

  const onMapPress = (e: GestureResponderEvent) => {
    if (phase !== "playing" || feedback) return;
    const { locationX, locationY } = e.nativeEvent;
    const lon = xFracToLon(Math.max(0, Math.min(1, locationX / mapW)));
    const lat = yFracToLat(Math.max(0, Math.min(1, locationY / mapH)));
    const res = scoreTap(round[idx], lat, lon);
    setFeedback(res);
    advanceRef.current = setTimeout(() => {
      setResults((r) => [...r, res]);
      setFeedback(null);
      if (idx + 1 >= round.length) {
        setPhase("done");
      } else {
        setIdx((i) => i + 1);
      }
    }, 1250);
  };

  const misses = results.filter((r) => !r.hit).length;
  const hits = results.filter((r) => r.hit).length;
  const penaltySec = misses * MISS_PENALTY_SEC;
  const elapsedSec =
    phase === "done"
      ? (results.length
          ? // freeze at the last recorded moment isn't tracked; approximate with
            // live clock captured at finish via nowMs
            Math.max(0, (nowMs - startMs) / 1000)
          : 0)
      : Math.max(0, (nowMs - startMs) / 1000);
  const totalSec = elapsedSec + penaltySec;
  const current = round[idx];

  // A marker positioned by lat/lon over the map.
  const Marker = ({
    lat,
    lon,
    color,
    ring,
    label,
  }: {
    lat: number;
    lon: number;
    color: string;
    ring?: boolean;
    label?: string;
  }) => {
    const left = lonToXFrac(lon) * mapW;
    const top = latToYFrac(lat) * mapH;
    const sz = ring ? 16 : 12;
    return (
      <View
        style={{
          position: "absolute",
          left: left - sz / 2,
          top: top - sz / 2,
          width: sz,
          height: sz,
          borderRadius: sz / 2,
          backgroundColor: ring ? "transparent" : color,
          borderWidth: ring ? 3 : 2,
          borderColor: color,
        }}
      >
        {label ? (
          <Text
            style={{
              position: "absolute",
              top: sz + 1,
              left: -18,
              width: sz + 36,
              textAlign: "center",
              fontSize: 10,
              fontWeight: "700",
              color,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {phase === "intro" && (
        <View style={{ alignItems: "center", paddingTop: 24 }}>
          <Text style={{ fontSize: 46 }}>🗺️</Text>
          <Text
            style={{
              marginTop: 10,
              fontFamily: "jost700",
              fontSize: 26,
              color: "#111827",
            }}
          >
            Map Tap
          </Text>
          <Text
            style={{
              marginTop: 10,
              textAlign: "center",
              fontFamily: "jost500",
              fontSize: 15,
              color: "#4b5563",
              lineHeight: 22,
              paddingHorizontal: 16,
            }}
          >
            We name a place — you tap where it is on the map. Hits are green,
            misses cost you +{MISS_PENALTY_SEC}s. Place all {7} as fast as you
            can. Lowest time wins.
          </Text>
          <View style={{ marginTop: 28, width: "100%" }}>
            <Button
              intent="primary"
              size="xl"
              rounded="full"
              label="Start"
              onPress={start}
            />
          </View>
        </View>
      )}

      {phase === "playing" && current && (
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{ fontFamily: "jost600", fontSize: 13, color: "#9ca3af" }}
            >
              {idx + 1} / {round.length}
            </Text>
            <Text
              style={{ fontFamily: "jost700", fontSize: 18, color: "#111827" }}
            >
              {totalSec.toFixed(1)}s
            </Text>
          </View>

          <View
            style={{
              alignItems: "center",
              marginBottom: 12,
              backgroundColor: "#eff6ff",
              borderRadius: 14,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{ fontFamily: "jost500", fontSize: 12, color: "#60a5fa" }}
            >
              TAP
            </Text>
            <Text
              style={{ fontFamily: "jost700", fontSize: 24, color: "#1d4ed8" }}
            >
              {current.name}
            </Text>
            <Text
              style={{ fontFamily: "jost500", fontSize: 11, color: "#9ca3af" }}
            >
              {current.type}
            </Text>
          </View>

          <Pressable onPress={onMapPress}>
            <View style={{ width: mapW, height: mapH }}>
              <Image
                source={MAP}
                style={{ width: mapW, height: mapH, borderRadius: 10 }}
                contentFit="fill"
              />
              {feedback && (
                <>
                  {/* your tap */}
                  <Marker
                    lat={feedback.tapLat}
                    lon={feedback.tapLon}
                    color={feedback.hit ? "#16a34a" : "#dc2626"}
                  />
                  {/* the true location (shown after you tap) */}
                  <Marker
                    lat={feedback.place.lat}
                    lon={feedback.place.lon}
                    color={feedback.hit ? "#16a34a" : "#2563eb"}
                    ring
                    label={feedback.hit ? "✓" : feedback.place.name}
                  />
                </>
              )}
            </View>
          </Pressable>

          {feedback ? (
            <Text
              style={{
                marginTop: 10,
                textAlign: "center",
                fontFamily: "jost700",
                fontSize: 16,
                color: feedback.hit ? "#16a34a" : "#dc2626",
              }}
            >
              {feedback.hit
                ? `Nice! ${fmtKm(feedback.distanceKm)} off`
                : `Miss — ${fmtKm(feedback.distanceKm)} off  (+${MISS_PENALTY_SEC}s)`}
            </Text>
          ) : (
            <Text
              style={{
                marginTop: 10,
                textAlign: "center",
                fontFamily: "jost500",
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              within {TOLERANCE_KM[current.type]} km counts
            </Text>
          )}
        </View>
      )}

      {phase === "done" && (
        <View style={{ alignItems: "center", paddingTop: 12 }}>
          <Text style={{ fontSize: 44 }}>🗺️</Text>
          <Text
            style={{
              marginTop: 6,
              fontFamily: "jost700",
              fontSize: 24,
              color: "#111827",
            }}
          >
            Round complete
          </Text>
          <Text
            style={{
              marginTop: 10,
              fontFamily: "jost700",
              fontSize: 44,
              color: "#111827",
            }}
          >
            {totalSec.toFixed(1)}s
          </Text>
          <Text
            style={{
              fontFamily: "jost500",
              fontSize: 12,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            your time
          </Text>
          <Text
            style={{
              marginTop: 10,
              fontFamily: "jost600",
              fontSize: 15,
              color: "#4b5563",
            }}
          >
            {hits} hit{hits === 1 ? "" : "s"} · {misses} miss
            {misses === 1 ? "" : "es"}
            {misses ? `  (+${penaltySec}s)` : ""}
          </Text>

          <View style={{ marginTop: 18, width: "100%" }}>
            {results.map((r, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <Text
                  style={{
                    fontFamily: "jost600",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {r.hit ? "✅" : "❌"}  {r.place.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "jost500",
                    fontSize: 13,
                    color: r.hit ? "#16a34a" : "#dc2626",
                  }}
                >
                  {fmtKm(r.distanceKm)}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 24, width: "100%" }}>
            <Button
              intent="primary"
              size="xl"
              rounded="full"
              label="Play again"
              onPress={start}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
