import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { SudokuGrid } from "../components/Sudoku";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { events, trackEvent } from "../lib/track-event";
import { isPlaceholderUsername } from "../lib/intro-flag";
import { useMyProfile } from "../hooks/use-my-profile";
import { WaitingSpinner } from "../components/WaitingSpinner";
import { supabase } from "../lib/supabase";

export default function Game() {
  const router = useRouter();
  const navigation = useNavigation();
  const { gameId, tournamentId, guided, preview } = useLocalSearchParams();
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
    if (!opponentRating && opponent) {
      const r =
        game?.gameVariant === "SUDOKU"
          ? (opponent as { eloRatingSudoku?: number }).eloRatingSudoku
          : opponent.eloRating;
      if (r) setOpponentRating(r);
    }
  }, [opponent, opponentRating, game?.gameVariant]);

  useEffect(() => {
    // Submit/forfeit over a flaky network must never trap the user on the
    // locked game screen: on failure, offer Retry or "Leave anyway" -> home.
    const leaveAction = async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch {
        Alert.alert(
          "Couldn't submit",
          "Check your connection and try again.",
          [
            { text: "Retry", onPress: () => leaveAction(action) },
            {
              text: "Leave anyway",
              style: "destructive",
              onPress: () => router.replace("/home"),
            },
          ]
        );
      }
    };
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
            leaveAction(forfeitGame);
          }),
        });
        break;
      case "SOLO":
        navigation.setOptions({
          headerTitle: "SOLO GAME",
          headerRight: leaveButton(() => {
            trackEvent(events.SUBMIT_SOLO_MATCH_CLICK);
            leaveAction(finishGame);
          }),
        });
        break;
      case "RANKED":
        navigation.setOptions({
          headerTitle: "RANKED MATCH",
          headerRight: leaveButton(() => {
            trackEvent(events.FORFEIT_MATCH_CLICK);
            leaveAction(forfeitGame);
          }),
        });
        break;
      case "TOURNAMENT":
        navigation.setOptions({
          headerTitle: "TOURNAMENT",
          headerRight: leaveButton(() => {
            trackEvent(events.FORFEIT_MATCH_CLICK);
            leaveAction(forfeitGame);
          }),
        });
        break;
      default:
        break;
    }
  }, [finishGame, forfeitGame, gameType, navigation, router]);

  const navigatedAway = useRef(false);
  useEffect(() => {
    if (
      gamePlayState === "COMPLETED" &&
      navigation.isFocused() &&
      !navigatedAway.current
    ) {
      navigatedAway.current = true;
      const won = !!myProfile?.id && game?.winnerId === myProfile.id;
      trackEvent(events.GAME_COMPLETED, {
        gameType,
        variant: game?.gameVariant,
        won,
      });
      // Only log real onboarding completions (placeholder username) to keep the
      // funnel clean — demo/preview runs from an existing account are excluded.
      const isOnboardingRace = isPlaceholderUsername(myProfile?.username);
      if (isOnboardingRace) {
        trackEvent(events.INTRO_RACE_COMPLETED, { won });
      }
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
      // New player who hasn't named themselves yet → send them to the win +
      // "pick a username" screen instead of the standard results. preview=1 lets
      // an existing account walk the same screen without renaming anything.
      if (preview === "1" || isPlaceholderUsername(myProfile?.username)) {
        router.replace(
          `/set-username?won=${won ? 1 : 0}${
            preview === "1" ? "&preview=1" : ""
          }`
        );
        return;
      }
      const myRating =
        game?.gameVariant === "SUDOKU"
          ? (myProfile as { eloRatingSudoku?: number })?.eloRatingSudoku
          : myProfile?.eloRating;
      router.replace(
        `/game-results?gameId=${gameId}&myRating=${myRating}&opponentRating=${opponentRating}`
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
          Waiting for your opponent to join…
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

  const isSudoku = game?.gameVariant === "SUDOKU";

  // Don't render the board until the full puzzle payload is present.
  const puzzleReady = isSudoku
    ? !!game?.sudoku?.puzzle && !!game?.sudoku?.solution
    : !!game?.crossword?.puzzle && !!game?.crossword?.solution;
  if (!game || !puzzleReady) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Pre-game countdown so both players start together.
  if (counting) {
    const isRace =
      guided === "1" || gameType === "RANKED" || gameType === "TOURNAMENT";
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        {isRace && (
          <Text className="mb-2 text-center font-[jost700] text-[22px] text-crossed-gray-900">
            🏁 Live Crossword Race
          </Text>
        )}
        {!!opponent && (
          <Text className="mb-1 text-center font-[jost600] text-base text-crossed-gray-700">
            You vs {opponent.username}
          </Text>
        )}
        {isRace && (
          <Text className="mb-6 text-center font-[jost400] text-sm text-crossed-gray-400">
            A real opponent is solving the same grid — first to finish wins. Go
            fast!
          </Text>
        )}
        <Text className="font-[jost600] text-lg text-crossed-gray-400">
          Starting in
        </Text>
        <Text className="mt-2 font-[jost700] text-[72px] text-crossed-blue-450">
          {secondsToStart}
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-white`}>
      <ConnectionBanner />
      {isSudoku ? (
        <SudokuGrid gameId={gameId as string} />
      ) : (
        <CrosswordGrid gameId={gameId as string} />
      )}
    </View>
  );
}
