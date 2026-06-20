import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { events, trackEvent } from "../lib/track-event";
import { useMyProfile } from "../hooks/use-my-profile";
import { WaitingSpinner } from "../components/WaitingSpinner";
import { supabase } from "../lib/supabase";

export default function Game() {
  const router = useRouter();
  const navigation = useNavigation();
  const { gameId, tournamentId } = useLocalSearchParams();
  const { myProfile } = useMyProfile();
  const { game, finishGame, forfeitGame, abortGame, opponent } = useGame({
    gameId: gameId as string | undefined,
  });
  const [opponentRating, setOpponentRating] = useState(0);

  const gamePlayState = game?.playState;
  const gameType = game?.gameType;

  // Ticks once a second so the pre-game countdown updates.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);
  const startsAtMs = game?.startedAt
    ? new Date(`${game.startedAt}Z`).getTime()
    : null;
  const secondsToStart = startsAtMs
    ? Math.ceil((startsAtMs - now) / 1000)
    : 0;
  const counting = gamePlayState === "PLAYING" && secondsToStart > 0;

  useEffect(() => {
    if (!opponentRating && opponent?.eloRating) {
      setOpponentRating(opponent.eloRating);
    }
  }, [opponent?.eloRating, opponentRating]);

  useEffect(() => {
    const leaveButton = (onPress: () => void) => () =>
      (
        <Button
          intent={"danger"}
          mode={"text"}
          size={"sm"}
          label="Leave"
          onPress={onPress}
        />
      );
    switch (gameType) {
      case "FRIENDLY":
        navigation.setOptions({
          headerTitle: "FRIENDLY MATCH",
          headerRight: leaveButton(() => {
            trackEvent(events.FORFEIT_MATCH_CLICK);
            forfeitGame();
          }),
        });
        break;
      case "SOLO":
        navigation.setOptions({
          headerTitle: "SOLO GAME",
          headerRight: leaveButton(() => {
            trackEvent(events.SUBMIT_SOLO_MATCH_CLICK);
            finishGame();
          }),
        });
        break;
      case "RANKED":
        navigation.setOptions({
          headerTitle: "RANKED MATCH",
          headerRight: leaveButton(() => {
            trackEvent(events.FORFEIT_MATCH_CLICK);
            forfeitGame();
          }),
        });
        break;
      case "TOURNAMENT":
        navigation.setOptions({
          headerTitle: "TOURNAMENT",
          headerRight: leaveButton(() => {
            trackEvent(events.FORFEIT_MATCH_CLICK);
            forfeitGame();
          }),
        });
        break;
      default:
        break;
    }
  }, [finishGame, forfeitGame, gameType, navigation]);

  useEffect(() => {
    if (gamePlayState === "COMPLETED" && navigation.isFocused()) {
      if (gameType === "TOURNAMENT") {
        // Head back to the bracket (look up the tournament if not passed in).
        const goBack = async () => {
          let tid = tournamentId as string | undefined;
          if (!tid && gameId) {
            const { data } = await supabase
              .from("tournamentMatches")
              .select("tournamentsId")
              .eq("gamesId", gameId)
              .single();
            tid = data?.tournamentsId;
          }
          router.replace(
            tid ? `/tournament?tournamentId=${tid}` : "/home"
          );
        };
        goBack();
        return;
      }
      router.replace(
        `/game-results?gameId=${gameId}&myRating=${myProfile?.eloRating}&opponentRating=${opponentRating}`
      );
    }
  }, [
    gamePlayState,
    gameType,
    gameId,
    tournamentId,
    router,
    navigation,
    myProfile?.eloRating,
    opponentRating,
  ]);

  // Friendly rematch host waits here until the opponent joins.
  if (game && gamePlayState === "WAITING_FOR_OPPONENT") {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <WaitingSpinner />
        <Text className="mt-4 text-center font-[jost600] text-base">
          Waiting for your opponent to accept the rematch…
        </Text>
        <View className="mt-8 w-full">
          <Button
            label="Cancel"
            intent={"secondary"}
            size={"lg"}
            onPress={() => {
              abortGame();
              router.replace("/home");
            }}
          />
        </View>
      </View>
    );
  }

  // Don't render the board until the full crossword payload is present.
  if (!game || !game.crossword?.puzzle || !game.crossword?.solution) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Pre-game countdown so both players start together.
  if (counting) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="font-[jost600] text-lg text-crossed-gray-400">
          Match starting in
        </Text>
        <Text className="mt-2 font-[jost700] text-[72px] text-crossed-blue-450">
          {secondsToStart}
        </Text>
        {!!opponent && (
          <Text className="mt-2 font-[jost600] text-base">
            vs {opponent.username}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-white`}>
      <ConnectionBanner />
      <CrosswordGrid gameId={gameId as string} />
    </View>
  );
}
