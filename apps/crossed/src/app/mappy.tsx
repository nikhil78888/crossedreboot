import { useLayoutEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "expo-router";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Button } from "../components/Button";
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
} from "../lib/map-tap";

const MAP = require("../assets/images/mappy-world.png");
const RATIO = 1920 / 3840; // true equirectangular (plate carrée), full ±90/±180, 2:1
const MIN_SCALE = 1;
const MAX_SCALE = 6;
const START_SCALE = 2.2; // start zoomed in so the map reads big, not a thin strip

type Phase = "intro" | "playing" | "done";

export default function MapTapScreen() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: "Mappy" });
  }, [navigation]);

  const screen = Dimensions.get("window");
  const VW = screen.width; // viewport width
  const VH = Math.min(Math.round(screen.height * 0.6), Math.round(VW * 1.15)); // tall viewport
  const BW = VW; // map base width (scale 1 == fit width)
  const BH = Math.round(BW * RATIO);

  // Pan/zoom shared values. Center the (scaled) map in the viewport at start.
  const startTx = 0;
  const startTy = (VH - BH) / 2;
  const scale = useSharedValue(START_SCALE);
  const tx = useSharedValue(startTx);
  const ty = useSharedValue(startTy);
  const savedScale = useSharedValue(START_SCALE);
  const savedTx = useSharedValue(startTx);
  const savedTy = useSharedValue(startTy);

  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<MapPlace[]>([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<TapResult[]>([]);
  const [feedback, setFeedback] = useState<TapResult | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetView = () => {
    scale.value = withTiming(START_SCALE);
    tx.value = withTiming(startTx);
    ty.value = withTiming(startTy);
    savedScale.value = START_SCALE;
    savedTx.value = startTx;
    savedTy.value = startTy;
  };

  const start = () => {
    setRound(makeRound(Math.floor(Math.random() * 0xffffffff) || 1));
    setIdx(0);
    setResults([]);
    setFeedback(null);
    resetView();
    const now = Date.now();
    setStartMs(now);
    setNowMs(now);
    setPhase("playing");
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setNowMs(Date.now()), 100);
  };

  // Called (on JS thread) with a tap in VIEWPORT coords + the live transform.
  const handleTap = (
    x: number,
    y: number,
    sv: number,
    txv: number,
    tyv: number
  ) => {
    if (phase !== "playing" || feedback || !round[idx]) return;
    // Invert the center-anchored transform: screen = C + s*(p - C) + t.
    const mx = BW / 2 + (x - BW / 2 - txv) / sv;
    const my = BH / 2 + (y - BH / 2 - tyv) / sv;
    const lon = xFracToLon(Math.max(0, Math.min(1, mx / BW)));
    const lat = yFracToLat(Math.max(0, Math.min(1, my / BH)));
    const res = scoreTap(round[idx], lat, lon);
    setFeedback(res);
    advanceRef.current = setTimeout(() => {
      setResults((r) => [...r, res]);
      setFeedback(null);
      if (idx + 1 >= round.length) {
        if (tickRef.current) clearInterval(tickRef.current);
        setPhase("done");
      } else {
        setIdx((i) => i + 1);
      }
    }, 1200);
  };

  const panG = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });
  const pinchG = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });
  const tapG = Gesture.Tap()
    .maxDistance(12)
    .onEnd((e) => {
      runOnJS(handleTap)(e.x, e.y, scale.value, tx.value, ty.value);
    });
  // A clean tap wins; a drag/pinch wins over the tap.
  const gesture = Gesture.Race(tapG, Gesture.Simultaneous(panG, pinchG));

  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const misses = results.filter((r) => !r.hit).length;
  const hits = results.filter((r) => r.hit).length;
  const penaltySec = misses * MISS_PENALTY_SEC;
  const elapsedSec = Math.max(0, (nowMs - startMs) / 1000);
  const totalSec = elapsedSec + penaltySec;
  const current = round[idx];

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
    const left = lonToXFrac(lon) * BW;
    const top = latToYFrac(lat) * BH;
    const sz = ring ? 14 : 11;
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
          borderWidth: ring ? 2.5 : 2,
          borderColor: color,
        }}
      >
        {label ? (
          <Text
            style={{
              position: "absolute",
              top: sz + 1,
              left: -22,
              width: sz + 44,
              textAlign: "center",
              fontSize: 9,
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
      scrollEnabled={phase !== "playing"}
    >
      {phase === "intro" && (
        <View style={{ alignItems: "center", paddingTop: 24 }}>
          <Text style={{ fontSize: 46 }}>🗺️</Text>
          <Text style={{ marginTop: 10, fontFamily: "jost700", fontSize: 26, color: "#111827" }}>
            Mappy
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
            We name a place — you tap where it is on the map. Pinch to zoom, drag
            to pan. Hits are green; misses cost +{MISS_PENALTY_SEC}s. Place all 7
            as fast as you can.
          </Text>
          <View style={{ marginTop: 28, width: "100%" }}>
            <Button intent="primary" size="xl" rounded="full" label="Start" onPress={start} />
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
            <Text style={{ fontFamily: "jost600", fontSize: 13, color: "#9ca3af" }}>
              {idx + 1} / {round.length}
            </Text>
            <Text style={{ fontFamily: "jost700", fontSize: 18, color: "#111827" }}>
              {totalSec.toFixed(1)}s
            </Text>
          </View>

          <View
            style={{
              alignItems: "center",
              marginBottom: 10,
              backgroundColor: "#eff6ff",
              borderRadius: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontFamily: "jost500", fontSize: 12, color: "#60a5fa" }}>TAP</Text>
            <Text style={{ fontFamily: "jost700", fontSize: 24, color: "#1d4ed8" }}>
              {current.name}
            </Text>
            <Text style={{ fontFamily: "jost500", fontSize: 11, color: "#9ca3af" }}>
              {current.type}
            </Text>
          </View>

          {/* Zoom/pan viewport. Overflow hidden clips the oversized map. */}
          <View
            style={{
              width: VW,
              height: VH,
              marginLeft: -12, // bleed past the ScrollView's 12px padding, full-width map
              overflow: "hidden",
              backgroundColor: "#cfe8ff",
              borderRadius: 0,
            }}
          >
            {/* GestureDetector wraps a STATIC viewport-sized layer, so the tap's
                e.x/e.y are in viewport coords (what the inversion math expects).
                The transformed map is a child that visually overflows. */}
            <GestureDetector gesture={gesture}>
              <View style={{ width: VW, height: VH }}>
                <Animated.View
                  style={[
                    { position: "absolute", left: 0, top: 0, width: BW, height: BH },
                    mapStyle,
                  ]}
                >
                  <Image source={MAP} style={{ width: BW, height: BH }} contentFit="fill" />
                  {feedback && (
                    <>
                      <Marker
                        lat={feedback.tapLat}
                        lon={feedback.tapLon}
                        color={feedback.hit ? "#16a34a" : "#dc2626"}
                      />
                      <Marker
                        lat={feedback.place.lat}
                        lon={feedback.place.lon}
                        color={feedback.hit ? "#16a34a" : "#2563eb"}
                        ring
                        label={feedback.hit ? "✓" : feedback.place.name}
                      />
                    </>
                  )}
                </Animated.View>
              </View>
            </GestureDetector>
          </View>

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
              pinch to zoom · drag to pan · within {TOLERANCE_KM[current.type]} km counts
            </Text>
          )}
        </View>
      )}

      {phase === "done" && (
        <View style={{ alignItems: "center", paddingTop: 12 }}>
          <Text style={{ fontSize: 44 }}>🗺️</Text>
          <Text style={{ marginTop: 6, fontFamily: "jost700", fontSize: 24, color: "#111827" }}>
            Round complete
          </Text>
          <Text style={{ marginTop: 10, fontFamily: "jost700", fontSize: 44, color: "#111827" }}>
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
          <Text style={{ marginTop: 10, fontFamily: "jost600", fontSize: 15, color: "#4b5563" }}>
            {hits} hit{hits === 1 ? "" : "s"} · {misses} miss{misses === 1 ? "" : "es"}
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
                <Text style={{ fontFamily: "jost600", fontSize: 14, color: "#111827" }}>
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
            <Button intent="primary" size="xl" rounded="full" label="Play again" onPress={start} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
