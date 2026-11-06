import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GameDifficulty, useGame } from "../hooks/use-game";
import { useVariant } from "../hooks/use-variant";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useTournament } from "../hooks/use-tournament";
import { useGameGate } from "../hooks/use-subscription";
import { events, trackEvent } from "../lib/track-event";

type Mode = "SOLO" | "FRIENDLY" | "RANKED" | "TOURNAMENT" | "PRIVATE_TOURNAMENT";

// The Regular/Hard picker was removed — in practice the two felt the same, and
// the extra tap just slowed everyone down. This screen now drops the player
// straight into the match at the default difficulty, reusing the same per-mode
// start logic. (Merging the two also pools ranked matchmaking into one group.)
const DEFAULT_DIFFICULTY: GameDifficulty = "REGULAR";

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
  const [, setBusy] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const difficulty = DEFAULT_DIFFICULTY;
    (async () => {
      setBusy(true);
      try {
        trackEvent(events.DIFFICULTY_SELECTED, { mode, variant, difficulty });
        const gate = await checkCanPlay();
        if (!gate.allowed) {
          trackEvent(events.GATE_BLOCKED, { mode, variant });
          router.replace("/upgrade-to-pro");
          return;
        }
        // Trivia competitive is launched from /trivia-setup (category + level).
        if (variant === "TRIVIA" && mode !== "SOLO") {
          Alert.alert(
            "Pick a category",
            "Start Trivia from the Trivia screen to choose a category and difficulty."
          );
          router.back();
          return;
        }
        if (mode === "SOLO") {
          const id = await createSoloGame({ variant, difficulty });
          if (id) router.replace(`/game?gameId=${id}`);
          else router.back();
        } else if (mode === "FRIENDLY") {
          const id = await createFriendlyGame({ variant, difficulty });
          if (id) router.replace(`/invite-friend?gameId=${id}`);
          else router.back();
        } else if (mode === "RANKED") {
          await joinLobby(variant, difficulty);
          router.replace(
            `/ranked-lobby?variant=${variant}&difficulty=${difficulty}`
          );
        } else if (mode === "TOURNAMENT") {
          router.replace(
            `/tournament-lobby?variant=${variant}&difficulty=${difficulty}`
          );
        } else if (mode === "PRIVATE_TOURNAMENT") {
          const id = await createPrivateTournament(variant, difficulty);
          if (id) router.replace(`/tournament?tournamentId=${id}`);
          else router.back();
        } else {
          router.back();
        }
      } catch {
        Alert.alert("Something went wrong", "Please try again.");
        router.back();
      } finally {
        setBusy(false);
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator />
      <Text className="mt-4 font-[jost500] text-[15px] text-crossed-gray-500">
        Starting your game…
      </Text>
    </View>
  );
}
