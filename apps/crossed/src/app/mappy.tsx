import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { RaceBar } from "../components/RaceBar";
import {
  makeRound,
  scoreTap,
  lonToXFrac,
  latToYFrac,
  xFracToLon,
  yFracToLat,
  fmtKm,
  BONUS_MAX_SEC,
  MIN_HITS,
  ROUND_SIZE,
  BIG_COUNTRIES,
  type MapPlace,
  type TapResult,
} from "../lib/map-tap";

// Signed seconds, e.g. "-2.1s" (bonus) or "+4s" (penalty).
const fmtDelta = (s: number) =>
  s === 0 ? "" : `${s > 0 ? "+" : "−"}${Math.abs(s).toFixed(1)}s`;

const MAP = require("../assets/images/mappy-world.png");
const RATIO = 1920 / 3840; // true equirectangular (plate carrée), full ±90/±180, 2:1

// Funny-named ghost opponents you race. Each game the bot is given a random but
// reasonable finish time; you win by posting a faster time (and passing the
// accuracy gate).
const BOT_NAMES = [
  "Globetrotter Greg", "Atlas Annie", "Compass Carl", "Nomad Nia",
  "Captain Cartography", "Wanderlust Wade", "Meridian Mia", "Roaming Rosa",
  "Latitude Lou", "Jetset Jess", "Pinpoint Pete", "Voyager Val",
];
// Bot finish time: ~6.5–10s per city → ~45–70s for a 7-city round. Finding a
// city, zooming/panning, and the per-tap reveal all cost real time, so the bot
// needs to be this slow to be a fair race (it was finishing way too fast).
const botTimeFor = () =>
  Math.round(ROUND_SIZE * (6.5 + Math.random() * 3.5) * 10) / 10;

const MIN_SCALE = 1;
const MAX_SCALE = 16; // deep zoom so you can place a city precisely
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
  const [botSeconds, setBotSeconds] = useState(0);
  const [botSteps, setBotSteps] = useState<number[]>([]);
  const [botName, setBotName] = useState("");
  const [endedByBot, setEndedByBot] = useState(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The bot crossing the finish line ends the round as a loss (matches the
  // ghost-race modes, where hitting the opponent's time without finishing = a
  // loss). Fires off the live clock tick.
  useEffect(() => {
    if (phase !== "playing" || !botSeconds) return;
    if ((nowMs - startMs) / 1000 >= botSeconds) {
      if (tickRef.current) clearInterval(tickRef.current);
      if (advanceRef.current) clearTimeout(advanceRef.current);
      setFeedback(null);
      setEndedByBot(true);
      setPhase("done");
    }
  }, [nowMs, phase, botSeconds, startMs]);

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
    setEndedByBot(false);
    resetView();
    const bs = botTimeFor();
    setBotSeconds(bs);
    // Jittered cumulative times at which the bot "places" each city, so its bar
    // jumps in uneven steps (like a real player) instead of filling smoothly.
    const segs = Array.from({ length: ROUND_SIZE }, () => 0.4 + Math.random());
    const sum = segs.reduce((a, b) => a + b, 0);
    let acc = 0;
    setBotSteps(segs.map((s) => (acc += (s / sum) * bs)));
    setBotName(BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]);
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

  const misses = results.filter((r) => r.tier === "miss").length;
  const bullseyes = results.filter((r) => r.tier === "bullseye").length;
  const hits = results.filter((r) => r.hit).length;
  const deltaSec = results.reduce((s, r) => s + r.timeDeltaSec, 0);
  const elapsedSec = Math.max(0, (nowMs - startMs) / 1000);
  const totalSec = Math.max(0, elapsedSec + deltaSec);
  const passed = hits >= MIN_HITS; // accuracy gate: need MIN_HITS to post a time
  // Race progress: you by places placed, the bot by elapsed time vs its target.
  const youFrac = Math.min(1, results.length / ROUND_SIZE);
  // Bot progress = how many of its (jittered) city-placement steps have elapsed.
  const botFrac = botSteps.length
    ? botSteps.filter((t) => elapsedSec >= t).length / botSteps.length
    : 0;
  const won = !endedByBot && passed && totalSec < botSeconds;
  const current = round[idx];

  // Two-row race progress bar (you vs the bot), using the shared in-game RaceBar
  // so it matches the crossword/word-search races.
  const RaceBars = () => (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{ width: 70, fontFamily: "jost600", fontSize: 12, color: "#4b5563" }}
          numberOfLines={1}
        >
          You
        </Text>
        <View style={{ flex: 1 }}>
          <RaceBar progress={youFrac * 100} hot />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
        <Text
          style={{ width: 70, fontFamily: "jost600", fontSize: 12, color: "#4b5563" }}
          numberOfLines={1}
        >
          {botName.split(" ")[0]}
        </Text>
        <View style={{ flex: 1 }}>
          <RaceBar progress={botFrac * 100} />
        </View>
      </View>
    </View>
  );

  // Markers live inside the scaled map (so they pin to a lat/lon), but we
  // counter-scale them by 1/scale about their own center so they stay a small,
  // constant on-screen size at any zoom instead of ballooning.
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
    const sz = ring ? 10 : 8;
    const counter = useAnimatedStyle(() => ({
      transform: [{ scale: 1 / scale.value }],
    }));
    return (
      <Animated.View
        style={[
          {
            position: "absolute",
            left: left - sz / 2,
            top: top - sz / 2,
            width: sz,
            height: sz,
            borderRadius: sz / 2,
            backgroundColor: ring ? "transparent" : color,
            borderWidth: ring ? 2 : 1.5,
            borderColor: color,
          },
          counter,
        ]}
      >
        {label ? (
          <Text
            style={{
              position: "absolute",
              top: sz + 1,
              left: -26,
              width: sz + 52,
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
      </Animated.View>
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
            to pan. Nail it and you SHAVE up to {BONUS_MAX_SEC}s off your time;
            get in the ballpark and you're fine; a real miss adds time. Place all
            7 as fast — and as accurately — as you can.
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
            <Text
              style={{
                fontFamily: "jost600",
                fontSize: 13,
                color: hits >= MIN_HITS ? "#16a34a" : "#9ca3af",
              }}
            >
              ✅ {hits}/{MIN_HITS}
            </Text>
            <Text style={{ fontFamily: "jost700", fontSize: 18, color: "#111827" }}>
              {totalSec.toFixed(1)}s
            </Text>
          </View>

          <RaceBars />

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
            <Text style={{ fontFamily: "jost500", fontSize: 13, color: "#6b7280" }}>
              {BIG_COUNTRIES.has(current.country) && current.province
                ? `${current.province}, ${current.country}`
                : current.country}
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
                  <Image
                    source={MAP}
                    style={{ width: BW, height: BH }}
                    contentFit="fill"
                    allowDownscaling={false}
                  />
                  {feedback &&
                    (() => {
                      // A line from your tap to the true city, so it's obvious
                      // what the two dots mean and how far off you were.
                      const ax = lonToXFrac(feedback.tapLon) * BW;
                      const ay = latToYFrac(feedback.tapLat) * BH;
                      const bx = lonToXFrac(feedback.place.lon) * BW;
                      const by = latToYFrac(feedback.place.lat) * BH;
                      const len = Math.hypot(bx - ax, by - ay);
                      const ang = Math.atan2(by - ay, bx - ax);
                      return (
                        <>
                          {len > 2 && (
                            <View
                              style={{
                                position: "absolute",
                                left: (ax + bx) / 2 - len / 2,
                                top: (ay + by) / 2 - 1,
                                width: len,
                                height: 2,
                                backgroundColor: "rgba(100,116,139,0.7)",
                                transform: [{ rotateZ: `${ang}rad` }],
                              }}
                            />
                          )}
                          {/* your guess */}
                          <Marker
                            lat={feedback.tapLat}
                            lon={feedback.tapLon}
                            color={
                              feedback.tier === "bullseye"
                                ? "#eab308"
                                : feedback.tier === "good"
                                ? "#16a34a"
                                : "#dc2626"
                            }
                            label="you"
                          />
                          {/* the real city */}
                          <Marker
                            lat={feedback.place.lat}
                            lon={feedback.place.lon}
                            color="#2563eb"
                            ring
                            label={feedback.place.name}
                          />
                        </>
                      );
                    })()}
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
              {feedback.tier === "bullseye"
                ? `🎯 Bullseye! ${fmtKm(feedback.distanceKm)}  ${fmtDelta(feedback.timeDeltaSec)}`
                : feedback.tier === "good"
                ? `Nice! ${fmtKm(feedback.distanceKm)} off`
                : `Miss — ${fmtKm(feedback.distanceKm)} off  ${fmtDelta(feedback.timeDeltaSec)}`}
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
              pinch to zoom · drag to pan · get close for a time bonus
            </Text>
          )}
        </View>
      )}

      {phase === "done" && (
        <View style={{ alignItems: "center", paddingTop: 12 }}>
          <Text style={{ fontSize: 44 }}>
            {endedByBot ? "⏱️" : passed ? (won ? "🏆" : "⏱️") : "🚫"}
          </Text>
          <Text style={{ marginTop: 6, fontFamily: "jost700", fontSize: 24, color: "#111827" }}>
            {endedByBot
              ? `${botName} won`
              : passed
              ? won
                ? `You beat ${botName}!`
                : `${botName} won`
              : "Did not finish"}
          </Text>
          {endedByBot ? (
            <Text
              style={{
                marginTop: 12,
                textAlign: "center",
                fontFamily: "jost600",
                fontSize: 15,
                color: "#dc2626",
                paddingHorizontal: 20,
                lineHeight: 22,
              }}
            >
              {botName} finished first — you ran out of time. You'd placed {hits}{" "}
              of {ROUND_SIZE}.
            </Text>
          ) : passed ? (
            <>
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
                your time · {botName} {botSeconds.toFixed(1)}s
              </Text>
            </>
          ) : (
            <Text
              style={{
                marginTop: 12,
                textAlign: "center",
                fontFamily: "jost600",
                fontSize: 15,
                color: "#dc2626",
                paddingHorizontal: 20,
                lineHeight: 22,
              }}
            >
              You only landed {hits} of {ROUND_SIZE}. You need at least {MIN_HITS}{" "}
              to post a time — no time this round.
            </Text>
          )}
          <Text style={{ marginTop: 10, fontFamily: "jost600", fontSize: 15, color: "#4b5563" }}>
            🎯 {bullseyes} bullseye · ✅ {hits - bullseyes} close · ❌ {misses} missed
            {deltaSec !== 0 ? `   (${fmtDelta(deltaSec)} total)` : ""}
          </Text>
          <Text
            style={{
              marginTop: 6,
              textAlign: "center",
              fontFamily: "jost500",
              fontSize: 12,
              color: "#9ca3af",
              paddingHorizontal: 16,
              lineHeight: 18,
            }}
          >
            🎯 dead on — time bonus   ·   ✅ close enough — counts   ·   ❌ too far —
            adds time
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
                  {r.tier === "bullseye" ? "🎯" : r.tier === "good" ? "✅" : "❌"}{"  "}
                  {r.place.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "jost500",
                    fontSize: 13,
                    color: r.tier === "miss" ? "#dc2626" : "#16a34a",
                  }}
                >
                  {fmtKm(r.distanceKm)}
                  {r.timeDeltaSec !== 0 ? `  ${fmtDelta(r.timeDeltaSec)}` : ""}
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
