import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GameDifficulty, useGame } from "../hooks/use-game";
import { useVariant } from "../hooks/use-variant";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useTournament } from "../hooks/use-tournament";
import { useGameGate } from "../hooks/use-subscription";
import { events, trackEvent } from "../lib/track-event";
import colors from "../lib/colors";

type Mode = "SOLO" | "FRIENDLY" | "RANKED" | "TOURNAMENT" | "PRIVATE_TOURNAMENT";

export default function SelectDifficulty() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: Mode }>();
  const { variant } = useVariant();
  const { createSoloGame, createFriendlyGame } = useGame({ gameId: undefined });
  const { joinLobby } = useOnlineStatus();
  const { createPrivateTournament } = useTournament({
    tournamentId: undefined,
  });
  const { checkCanPlay } = useGameGate();
  const [busy, setBusy] = useState<GameDifficulty | null>(null);

  const isSudoku = variant === "SUDOKU";

  const go = async (difficulty: GameDifficulty) => {
    if (busy) return;
    setBusy(difficulty);
    try {
      trackEvent(events.DIFFICULTY_SELECTED, { mode, variant, difficulty });
      // Word search / trivia are solo-only for now; competitive modes (the
      // race vs a bot) are coming next.
      if (
        (variant === "WORD_SEARCH" || variant === "TRIVIA") &&
        mode !== "SOLO"
      ) {
        Alert.alert(
          "Coming soon",
          "Competitive modes for this game type are on the way — try Solo for now."
        );
        return;
      }
      // Competitive modes are gated by the subscription/daily limit.
      if (mode !== "SOLO") {
        const gate = await checkCanPlay();
        if (!gate.allowed) {
          trackEvent(events.GATE_BLOCKED, { mode, variant });
          router.replace("/upgrade-to-pro");
          return;
        }
      }
      if (mode === "SOLO") {
        const id = await createSoloGame({ variant, difficulty });
        if (id) router.replace(`/game?gameId=${id}`);
      } else if (mode === "FRIENDLY") {
        const id = await createFriendlyGame({ variant, difficulty });
        if (id) router.replace(`/invite-friend?gameId=${id}`);
      } else if (mode === "RANKED") {
        await joinLobby(variant, difficulty);
        router.replace(
          `/ranked-lobby?variant=${variant}&difficulty=${difficulty}`
        );
      } else if (mode === "TOURNAMENT") {
        // Enqueue + wait in the lobby; a single-leader matcher batches players
        // into clean 8-person brackets (handles big simultaneous bursts).
        router.replace(
          `/tournament-lobby?variant=${variant}&difficulty=${difficulty}`
        );
      } else if (mode === "PRIVATE_TOURNAMENT") {
        const id = await createPrivateTournament(variant, difficulty);
        if (id) router.replace(`/tournament?tournamentId=${id}`);
      }
    } catch (e) {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const OPTIONS: {
    key: GameDifficulty;
    label: string;
    emoji: string;
    blurb: string;
    bg: string;
    fg: string;
  }[] = [
    {
      key: "REGULAR",
      label: "Regular",
      emoji: "🙂",
      blurb: isSudoku
        ? "Easy & medium puzzles — a relaxed solve."
        : "Approachable clues — straightforward and fun.",
      bg: colors["crossed-blue"]["50"],
      fg: colors["crossed-blue"]["450"],
    },
    {
      key: "HARD",
      label: "Hard",
      emoji: "🔥",
      blurb: isSudoku
        ? "Hard puzzles — for seasoned solvers."
        : "Trickier, cleverer clues — a real challenge.",
      bg: "#fef2f2",
      fg: colors["crossed-red"]["400"],
    },
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        paddingHorizontal: 20,
        paddingTop: 24,
      }}
    >
      <Text className="font-[jost700] text-[26px] text-crossed-gray-900">
        Choose Difficulty
      </Text>
      <Text className="mt-1 font-[jost400] text-[14px] text-crossed-gray-400">
        {isSudoku ? "Sudoku" : "Crosswords"} ·{" "}
        {mode === "RANKED"
          ? "you'll be matched with players at the same level"
          : "pick how challenging you want it"}
      </Text>

      <View className="mt-6" style={{ gap: 16 }}>
        {OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.key}
            activeOpacity={0.9}
            disabled={!!busy}
            onPress={() => go(o.key)}
            style={{
              borderRadius: 20,
              padding: 20,
              minHeight: 104,
              justifyContent: "center",
              backgroundColor: o.bg,
              borderWidth: 2,
              borderColor: o.bg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 34 }}>{o.emoji}</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text
                  className="font-[jost700] text-[22px]"
                  style={{ color: o.fg }}
                >
                  {o.label}
                </Text>
                <Text
                  numberOfLines={2}
                  className="mt-0.5 font-[jost400] text-[13px] text-crossed-gray-900/60"
                >
                  {o.blurb}
                </Text>
              </View>
              {busy === o.key ? (
                <ActivityIndicator color={o.fg} />
              ) : (
                <Text style={{ color: o.fg, fontSize: 22 }}>→</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
