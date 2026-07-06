import { useOnlineStatus } from "../hooks/use-online-status";
import { useRankedGame } from "../hooks/use-ranked-game";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { GameVariant } from "../hooks/use-game";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { useGame } from "../hooks/use-game";
import { differenceInSeconds, isAfter } from "date-fns";
import { events, trackEvent } from "../lib/track-event";
import { avatars } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";
import { Avatar } from "react-native-ui-lib";
import { WaitingSpinner } from "../components/WaitingSpinner";

export default function RankedLobby() {
  const router = useRouter();
  const { variant: variantParam, difficulty: difficultyParam } =
    useLocalSearchParams();
  const variant: GameVariant = (
    ["SUDOKU", "WORD_SEARCH", "TRIVIA"].includes(variantParam as string)
      ? variantParam
      : "CROSSWORD"
  ) as GameVariant;
  const difficulty: "REGULAR" | "HARD" =
    difficultyParam === "HARD" ? "HARD" : "REGULAR";
  const { myProfile } = useMyProfile();
  const { leaveLobby, joinLobby, heartbeat } = useOnlineStatus();
  const { gameId } = useRankedGame();
  const { game, createRankedBotMatch } = useGame({ gameId });
  const [secondsToStart, setSecondsToStart] = useState(0);

  const gameStartingAt = game?.startedAt;
  const playState = game?.playState;

  // Heartbeat: keep our queue row "live" so the matcher will pair us. If this
  // stops (backgrounded/crashed), the row goes stale and we become unmatchable —
  // so we can never be matched into a game we've walked away from.
  useEffect(() => {
    if (playState === "PLAYING") return;
    const h = setInterval(() => {
      heartbeat();
    }, 4000);
    return () => clearInterval(h);
  }, [playState, heartbeat]);

  // Bot fallback. After 18s (> the 12s server force-pair + realtime lag, so a
  // real human match reliably wins the race) we start trying to drop into a bot
  // game, and KEEP retrying every 6s until we either match or get a bot — so a
  // player can never get stranded on "finding player" for minutes.
  //
  // Each attempt atomically claims our OWN queue row: an empty result means the
  // matcher already paired us (routing takes over) or the row was transiently
  // gone (a failed pairing re-queued us) — in the latter case the next retry
  // finds the row back and creates the bot. A Postgres row delete returns to
  // exactly one caller, so this can never double-match us into a human + bot.
  useEffect(() => {
    if (playState === "PLAYING") return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const attempt = async () => {
      // `cancelled` is flipped by this effect's cleanup, which runs the moment
      // playState changes to PLAYING (we got matched) — so a stale in-flight
      // attempt can't fire a bot after we've been paired.
      if (cancelled) return;
      const claimed = await leaveLobby();
      if (cancelled) return;
      if (!claimed.length) return; // matched, or transiently re-queued — retry later
      const id = await createRankedBotMatch({ variant, difficulty });
      if (id) {
        cancelled = true;
        if (interval) clearInterval(interval);
        return;
      }
      // Bot creation failed (e.g. no puzzle available) — re-queue so the next
      // attempt can retry rather than leaving the player stuck.
      if (!cancelled) await joinLobby(variant, difficulty);
    };
    const start = setTimeout(() => {
      attempt();
      interval = setInterval(attempt, 6000);
    }, 18000);
    return () => {
      cancelled = true;
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playState, leaveLobby, joinLobby, createRankedBotMatch, variant, difficulty]);

  useEffect(() => {
    if (playState === "PLAYING") {
      leaveLobby();
    }
  }, [playState, leaveLobby]);

  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      leaveLobby();
      navigation.dispatch(e.data.action);
    });
    return unsubscribe;
  }, [leaveLobby, navigation]);

  useEffect(() => {
    if (playState !== "COMPLETED" && gameStartingAt) {
      trackEvent(events.RANKED_MATCH_OPPONENT_FOUND);
      const interval = setInterval(() => {
        if (isAfter(new Date(`${gameStartingAt}Z`), new Date())) {
          const secToStart = differenceInSeconds(
            new Date(`${gameStartingAt}Z`),
            new Date()
          );
          if (secToStart < 6) {
            setSecondsToStart(secToStart);
          }
        } else {
          router.replace(`/game?gameId=${gameId}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameId, gameStartingAt, playState, router]);

  if (!myProfile) {
    return null;
  }

  const friendlyAvatar = Object.keys(avatars).find(
    (a) => myProfile.avatar !== a
  ) as keyof typeof avatars;

  return (
    <View className="flex-1 bg-white items-center">
      <Text className="mt-7 font-[jost600] text-base text-center">
        We are finding the best player for {"\n"} you to compete with.
      </Text>
      <View className="flex-row items-center">
        <Avatar
          size={60}
          name={myProfile.name || myProfile.username.charAt(0)}
          source={avatars[myProfile.avatar as keyof typeof avatars]}
          imageStyle={{ backgroundColor: "white" }}
        />
        <View
          className="mt-1 h-[180px] w-[180px] border-black/20 rounded-full items-center justify-center"
          style={{ borderWidth: StyleSheet.hairlineWidth }}
        >
          <View className="p-5 bg-gray-100 rounded-full">
            <Text className="font-[jost700] text-[32px]">VS</Text>
          </View>
        </View>
        <Avatar
          size={60}
          source={avatars[friendlyAvatar]}
          imageStyle={{ backgroundColor: "white" }}
        />
      </View>
      <View className="mt-8">
        {secondsToStart > 0 ? (
          <Text className="text-sm font-[jost600]">
            Match starting in {secondsToStart} seconds...
          </Text>
        ) : (
          <View className="flex-row items-center">
            <WaitingSpinner />
            <Text className="ml-2 text-sm font-[jost600]">
              finding player...
            </Text>
          </View>
        )}
      </View>
      <View className="absolute bottom-8 inset-x-4">
        <Button
          label="Go back home"
          intent={"secondary"}
          size={"lg"}
          onPress={() => {
            trackEvent(events.LEAVE_LOBBY_CLICK);
            router.back();
          }}
        />
      </View>
    </View>
  );
}
