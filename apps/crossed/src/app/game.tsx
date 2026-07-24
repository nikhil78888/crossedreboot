import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGame, solutionOf } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { CrosswordTutorial } from "../components/CrosswordTutorial";
import { SudokuGrid } from "../components/Sudoku";
import { WordSearchGrid } from "../components/WordSearch";
import { TriviaGame } from "../components/Trivia";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { events, trackEvent } from "../lib/track-event";
import { isPlaceholderUsername } from "../lib/intro-flag";
import { useMyProfile } from "../hooks/use-my-profile";
import { WaitingSpinner } from "../components/WaitingSpinner";
import { UrgencyPulse } from "../components/UrgencyPulse";
import { recordChallengeResult } from "../lib/challenge-utils";
import { supabase } from "../lib/supabase";
import { TriviaQuiz, triviaCorrectCount } from "../lib/trivia";
import { recordGameCompleted, maybeRequestReview } from "../lib/engagement";
import { ratingForVariant } from "../lib/variant-rating";

// Set once a player has seen the crossword how-to-play tutorial, so it only shows
// on their first crossword game (the guided intro) and never again.
const CROSSWORD_TUTORIAL_SEEN_KEY = "crossword_tutorial_seen_v1";

// The challenger's trivia score, recovered from their ghost timeline (progress %
// == correct / total). Used to decide a trivia challenge by accuracy.
const challengerTriviaCorrect = (
  timeline: { p?: number }[] | null | undefined,
  total: number
): number => {
  const maxP = (timeline ?? []).reduce((m, pt) => Math.max(m, pt?.p ?? 0), 0);
  return Math.round((maxP / 100) * total);
};

export default function Game() {
  const router = useRouter();
  const navigation = useNavigation();
  const { gameId, tournamentId, guided, preview } = useLocalSearchParams();
  const { myProfile } = useMyProfile();
  const {
    game,
    finishGame,
    forfeitGame,
    abortGame,
    opponent,
    opponentProgress,
    opponentUsername,
  } = useGame({
    gameId: gameId as string | undefined,
  });
  const [opponentRating, setOpponentRating] = useState(0);
  // "How to play" overlay for the crossword race. It shows on a player's FIRST
  // crossword game (which is essentially always the guided intro), then never
  // again — tracked by a persistent flag. The settings "Preview new-user
  // experience" run (preview=1) always shows it, ignoring the flag, so it stays
  // testable. It's presented as a gate BEFORE the race: the board (and its clock
  // + keyboard) only mount once the tutorial is closed, and the race clock is
  // restarted on close so no time is spent reading it.
  const [tutorialClosed, setTutorialClosed] = useState(false);
  // null = still reading the "seen" flag; false = not seen yet; true = seen.
  const [tutorialSeen, setTutorialSeen] = useState<boolean | null>(null);
  // When the tutorial closes we drive a fresh countdown from this LOCAL start
  // time immediately — independent of realtime — so the board never flashes with
  // the clock that ran while they read the tutorial. The matching DB write keeps
  // the board's own clock + the bot in sync.
  const [forcedStartMs, setForcedStartMs] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(CROSSWORD_TUTORIAL_SEEN_KEY)
      .then((v) => active && setTutorialSeen(!!v))
      // On a read error, treat as seen so we don't nag with the tutorial.
      .catch(() => active && setTutorialSeen(true));
    return () => {
      active = false;
    };
  }, []);

  const gamePlayState = game?.playState;
  const gameType = game?.gameType;
  // The how-to-play tutorial is active. While it's up we render a frozen board
  // with a bottom-sheet tutorial and hide the header's Quit button so it can't
  // collide with the sheet's Skip. Preview always shows it. Real players see it
  // once, on the guided intro (guided=1) — a player's first crossword is always
  // the intro, and scoping to it keeps the on-close clock restart off real live
  // matches (which share the game row, so a restart would desync the opponent).
  const tutorialActive =
    game?.gameVariant === "CROSSWORD" &&
    !tutorialClosed &&
    (preview === "1" || (guided === "1" && tutorialSeen === false));

  // Ticks once a second so the pre-game countdown updates.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);
  // Prefer the local restart clock (set on tutorial close) so the countdown is
  // immediate and never shows the tutorial-elapsed time, even if the realtime
  // update of startedAt is slow.
  const startsAtMs =
    forcedStartMs ??
    (game?.startedAt ? new Date(`${game.startedAt}Z`).getTime() : null);
  const secondsToStart = startsAtMs
    ? Math.ceil((startsAtMs - now) / 1000)
    : 0;
  const counting = gamePlayState === "PLAYING" && secondsToStart > 0;

  // Close the tutorial and start the race fresh. The clock ran while the player
  // read the tutorial, so restart it: drive a local 6s countdown right away, and
  // push the same startedAt to the DB (the board's clock + the bot key off it).
  // The local countdown gives that write time to propagate before the board
  // mounts, so the board never renders against a stale/elapsed clock.
  const closeTutorial = () => {
    const restartAt = Date.now() + 6000;
    setForcedStartMs(restartAt);
    setTutorialClosed(true);
    // Remember it so it never shows again (best-effort; preview ignores it).
    setTutorialSeen(true);
    AsyncStorage.setItem(CROSSWORD_TUTORIAL_SEEN_KEY, "1").catch(
      () => undefined
    );
    const persist = async () => {
      await supabase
        .from("games")
        .update({ startedAt: new Date(restartAt).toISOString() })
        .eq("id", gameId as string);
    };
    // Retry once on a network failure so the board's clock isn't left stale.
    persist().catch(() => persist().catch(() => undefined));
  };

  // Challenge race: decide when to end against the challenger's ghost.
  const ghostEnded = useRef(false);
  useEffect(() => {
    if (gamePlayState !== "PLAYING" || !startsAtMs || ghostEnded.current) return;
    const ch = (
      game?.gameState as
        | { __challenge?: { seconds?: number; timeline?: { p?: number }[] } }
        | undefined
    )?.__challenge;
    if (!ch?.seconds) return;
    const elapsed = (now - startsAtMs) / 1000;

    // Trivia is decided by ACCURACY, not the clock. End only when you've already
    // gotten MORE wrong than the challenger (you can't catch up), or you're tied
    // on wrong answers and their solve time has elapsed (then the faster finish
    // wins). If you're ahead on accuracy, keep going until every question is
    // answered (handled by the Trivia screen's own completion).
    if (game?.gameVariant === "TRIVIA") {
      const quiz = (game?.gameState as { __trivia?: TriviaQuiz } | undefined)
        ?.__trivia;
      if (!quiz) return;
      const mine = myProfile?.id
        ? (game?.gameState?.[myProfile.id] as
            | { answers?: Record<string, number> }
            | undefined)
        : undefined;
      const total = quiz.questions.length;
      const answered = Object.keys(mine?.answers ?? {}).length;
      const myWrong = answered - triviaCorrectCount(quiz, mine?.answers);
      const theirWrong = total - challengerTriviaCorrect(ch.timeline, total);
      if (
        myWrong > theirWrong ||
        (myWrong === theirWrong && elapsed >= ch.seconds)
      ) {
        ghostEnded.current = true;
        finishGame();
      }
      return;
    }

    // Crossword / word search: a time race — end the moment their solve time
    // elapses. If you haven't beaten it by then, you've lost.
    if (elapsed >= ch.seconds) {
      ghostEnded.current = true;
      finishGame();
    }
  }, [
    now,
    gamePlayState,
    startsAtMs,
    game?.gameState,
    game?.gameVariant,
    myProfile?.id,
    finishGame,
  ]);

  useEffect(() => {
    if (!opponentRating && opponent) {
      const r = ratingForVariant(opponent, game?.gameVariant);
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
          label="Quit"
          onPress={onPress}
        />
      );
    // Warn before quitting so a stray tap doesn't cost the match. Competitive
    // games forfeit (a loss); a solo game just submits whatever's on the board.
    const confirmQuit = ({
      forfeit,
      onProceed,
    }: {
      forfeit: boolean;
      onProceed: () => void;
    }) =>
      Alert.alert(
        "Quit game?",
        forfeit
          ? "If you quit now you’ll forfeit the game and it counts as a loss."
          : "Your puzzle will be submitted as it is right now.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Quit", style: "destructive", onPress: onProceed },
        ]
      );
    // During the how-to-play tutorial, retitle the header and hide Quit so it
    // can't sit on top of the tutorial sheet's Skip.
    if (tutorialActive) {
      navigation.setOptions({
        headerTitle: "HOW TO PLAY",
        headerRight: () => null,
      });
      return;
    }
    switch (gameType) {
      case "FRIENDLY":
        navigation.setOptions({
          headerTitle: "FRIENDLY MATCH",
          headerRight: leaveButton(() =>
            confirmQuit({
              forfeit: true,
              onProceed: () => {
                trackEvent(events.FORFEIT_MATCH_CLICK);
                leaveAction(forfeitGame);
              },
            })
          ),
        });
        break;
      case "SOLO":
        navigation.setOptions({
          headerTitle: "SOLO GAME",
          headerRight: leaveButton(() =>
            confirmQuit({
              forfeit: false,
              onProceed: () => {
                trackEvent(events.SUBMIT_SOLO_MATCH_CLICK);
                leaveAction(finishGame);
              },
            })
          ),
        });
        break;
      case "RANKED":
        navigation.setOptions({
          headerTitle: "RANKED MATCH",
          headerRight: leaveButton(() =>
            confirmQuit({
              forfeit: true,
              onProceed: () => {
                trackEvent(events.FORFEIT_MATCH_CLICK);
                leaveAction(forfeitGame);
              },
            })
          ),
        });
        break;
      case "TOURNAMENT":
        navigation.setOptions({
          headerTitle: "TOURNAMENT",
          headerRight: leaveButton(() =>
            confirmQuit({
              forfeit: true,
              onProceed: () => {
                trackEvent(events.FORFEIT_MATCH_CLICK);
                leaveAction(forfeitGame);
              },
            })
          ),
        });
        break;
      default:
        break;
    }
  }, [finishGame, forfeitGame, gameType, navigation, router, tutorialActive]);

  const navigatedAway = useRef(false);
  useEffect(() => {
    if (
      gamePlayState === "COMPLETED" &&
      navigation.isFocused() &&
      !navigatedAway.current
    ) {
      navigatedAway.current = true;
      const won = !!myProfile?.id && game?.winnerId === myProfile.id;
      // Win margin in correct squares (player vs opponent) for an exciting,
      // "you barely won!" line on the result screen.
      const sol = game
        ? (solutionOf(game) as unknown as (string | number | null)[][])
        : undefined;
      const correctCount = (s?: (string | number | null)[][]) => {
        if (!s || !sol) return 0;
        let n = 0;
        for (let r = 0; r < s.length; r++) {
          const row = s[r] || [];
          for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (
              cell != null &&
              cell !== "" &&
              cell !== "#" &&
              cell === sol[r]?.[c]
            )
              n++;
          }
        }
        return n;
      };
      const myCells = correctCount(
        (myProfile?.id
          ? game?.gameState?.[myProfile.id]?.solution
          : undefined) as unknown as (string | number | null)[][] | undefined
      );
      const botCells = correctCount(
        (opponent ? game?.gameState?.[opponent.id]?.solution : undefined) as
          | unknown
          | undefined as (string | number | null)[][] | undefined
      );
      const margin = Math.max(0, myCells - botCells);
      trackEvent(events.GAME_COMPLETED, {
        gameType,
        variant: game?.gameVariant,
        won,
      });
      // Engagement: count this play, and — on a good note only (a win, or a
      // self-paced solo finish, never right after losing) — consider asking for
      // an App Store review. The helper self-limits to players who play often.
      recordGameCompleted().then(() => {
        if (!opponent || won) maybeRequestReview();
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
      // Challenge ghost race → crossword / word search decided by TIME, trivia by
      // ACCURACY (correct answers, tie broken by time).
      const challengeMeta = (
        game?.gameState as Record<string, unknown> | undefined
      )?.["__challenge"] as
        | {
            id?: string | null;
            challengerId?: string | null;
            seconds?: number | null;
            name?: string | null;
            timeline?: { p?: number }[] | null;
          }
        | undefined;
      if (challengeMeta) {
        const start = game?.startedAt ?? game?.createdAt;
        // Prefer the recorded solve time (set only on a correct solution); fall
        // back to wall-clock for the on-screen result. `solved` being null means
        // they forfeited/timed out rather than actually finishing.
        const solved = (
          myProfile?.id
            ? (game?.gameState?.[myProfile.id] as
                | { solvedInSeconds?: number | null }
                | undefined)
            : undefined
        )?.solvedInSeconds;
        const yourSeconds =
          solved ??
          (start
            ? Math.max(
                0,
                Math.round(
                  (Date.now() - new Date(`${start}Z`).getTime()) / 1000
                )
              )
            : 0);
        const theirSeconds = challengeMeta.seconds ?? 0;

        let beat: boolean;
        let resultParams: string;
        if (game?.gameVariant === "TRIVIA") {
          const quiz = (
            game?.gameState as { __trivia?: TriviaQuiz } | undefined
          )?.__trivia;
          const mine = myProfile?.id
            ? (game?.gameState?.[myProfile.id] as
                | { answers?: Record<string, number> }
                | undefined)
            : undefined;
          const total = quiz?.questions.length ?? 0;
          const youScore = triviaCorrectCount(quiz, mine?.answers);
          const themScore = challengerTriviaCorrect(
            challengeMeta.timeline,
            total
          );
          // More correct wins; a tie on correct is broken by the faster solve.
          beat =
            youScore > themScore ||
            (youScore === themScore &&
              solved != null &&
              theirSeconds > 0 &&
              solved < theirSeconds);
          resultParams = `variant=TRIVIA&youScore=${youScore}&themScore=${themScore}&total=${total}&you=${yourSeconds}&them=${theirSeconds}&youSolved=${
            solved != null ? 1 : 0
          }`;
        } else {
          // Win = solved strictly faster than the challenger. (Reaching their
          // time without solving = a loss, which ends the game.)
          beat = solved != null && theirSeconds > 0 && solved < theirSeconds;
          resultParams = `variant=${
            game?.gameVariant ?? "CROSSWORD"
          }&you=${yourSeconds}&them=${theirSeconds}&youSolved=${
            solved != null ? 1 : 0
          }`;
        }
        // Close the loop either way (feeds the challenger's results feed). Skip
        // only when there's no challenger or it's your own test.
        if (
          challengeMeta.challengerId &&
          myProfile?.id &&
          challengeMeta.challengerId !== myProfile.id &&
          theirSeconds > 0
        ) {
          recordChallengeResult({
            challengeId: challengeMeta.id ?? null,
            challengerId: challengeMeta.challengerId,
            opponentId: myProfile.id,
            opponentName: myProfile.username ?? null,
            gameVariant: game?.gameVariant ?? "CROSSWORD",
            challengerSeconds: theirSeconds,
            opponentSeconds: yourSeconds,
            opponentWon: beat,
          });
        }
        router.replace(
          `/challenge-result?name=${encodeURIComponent(
            challengeMeta.name ?? "your rival"
          )}&won=${beat ? 1 : 0}&${resultParams}`
        );
        return;
      }
      // SOLO word search / trivia use a dedicated, variant-agnostic result
      // screen (their solo score/time). Ranked/friendly matches fall through to
      // the SHARED head-to-head results screen (/game-results) so every variant
      // looks the same after a competitive game.
      if (
        gameType === "SOLO" &&
        (game?.gameVariant === "WORD_SEARCH" || game?.gameVariant === "TRIVIA")
      ) {
        const me = myProfile?.id
          ? (
              game?.gameState as
                | Record<string, { solvedInSeconds?: number }>
                | undefined
            )?.[myProfile.id]
          : undefined;
        const youSecs = me?.solvedInSeconds ?? 0;
        // Did they actually finish, or just leave/time out? (Leaving a solo game
        // routes here too — it must not claim "Solved!")
        const didSolve = me?.solvedInSeconds != null;
        // In a bot race the bot is capped under 100%, so finishing = winning.
        const raceWon = gameType !== "SOLO" && didSolve;
        router.replace(
          `/variant-result?variant=${game.gameVariant}&type=${gameType}&won=${
            raceWon ? 1 : 0
          }&solved=${didSolve ? 1 : 0}&you=${youSecs}&difficulty=${
            game.difficulty ?? "REGULAR"
          }&gameId=${gameId}`
        );
        return;
      }
      const beforeRating = ratingForVariant(myProfile, game?.gameVariant);
      // The guided intro game (username already set) → a celebratory "enter the
      // app" screen instead of the standard results. preview=1 walks the same
      // screen from an existing account without changing anything.
      if (guided === "1" || preview === "1") {
        router.replace(
          `/intro-complete?won=${won ? 1 : 0}&margin=${margin}&before=${
            beforeRating ?? ""
          }${preview === "1" ? "&preview=1" : ""}`
        );
        return;
      }
      router.replace(
        `/game-results?gameId=${gameId}&myRating=${beforeRating}&opponentRating=${opponentRating}`
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
  const isWordSearch = game?.gameVariant === "WORD_SEARCH";
  const isTrivia = game?.gameVariant === "TRIVIA";
  // The guided first-time warm-up (vs a weak bot) — drives the beatable intro.
  const isIntro = guided === "1";

  // Don't render the board until the full puzzle payload is present. Word search
  // and trivia carry their puzzle inline in gameState (no content join).
  const puzzleReady = isWordSearch
    ? !!(game?.gameState as { __wordsearch?: unknown } | undefined)?.__wordsearch
    : isTrivia
    ? !!(game?.gameState as { __trivia?: unknown } | undefined)?.__trivia
    : isSudoku
    ? !!game?.sudoku?.puzzle && !!game?.sudoku?.solution
    : !!game?.crossword?.puzzle && !!game?.crossword?.solution;
  if (!game || !puzzleReady) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Guided intro: hold a spinner until we know whether the tutorial was already
  // seen, so the countdown/board never flashes before it appears.
  if (
    game?.gameVariant === "CROSSWORD" &&
    guided === "1" &&
    preview !== "1" &&
    !tutorialClosed &&
    tutorialSeen === null
  ) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // "How to play" — the board renders FROZEN (paused: no clock, no bot movement,
  // no keyboard) with the tutorial as an opaque bottom sheet beneath it, so the
  // grid + race bars stay visible above and it reads as one screen. The clock
  // starts fresh once it's closed. Shows on a player's first crossword; preview
  // always shows it.
  if (tutorialActive) {
    return (
      <View className="flex-1 bg-white">
        <ConnectionBanner />
        <CrosswordGrid gameId={gameId as string} paused />
        <CrosswordTutorial onClose={closeTutorial} />
      </View>
    );
  }

  // Pre-game countdown so both players start together.
  if (counting) {
    // The guided intro is a warm-up vs a bot — don't bill it as a real opponent.
    const isRace =
      isIntro || gameType === "RANKED" || gameType === "TOURNAMENT";
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        {isRace && (
          <Text
            className="mb-3 text-center font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 30 }}
          >
            {isIntro
              ? "🤖 Warm-up Match"
              : `🏁 Live ${
                  isWordSearch
                    ? "Word Search"
                    : isTrivia
                    ? "Trivia"
                    : isSudoku
                    ? "Sudoku"
                    : "Crossword"
                } Race`}
          </Text>
        )}
        {!!opponent && (
          <Text
            className="mb-2 text-center font-[jost600] text-crossed-gray-700"
            style={{ fontSize: 22 }}
          >
            {isIntro
              ? "You vs a friendly bot 🤖"
              : `You vs ${opponentUsername || opponent.username}`}
          </Text>
        )}
        {isRace && (
          <Text
            className="mb-8 text-center font-[jost400] text-crossed-gray-500"
            style={{ fontSize: 17, lineHeight: 24 }}
          >
            {(() => {
              const task = isTrivia
                ? "answering the same questions"
                : isWordSearch
                ? "searching the same grid"
                : "solving the same grid";
              return isIntro
                ? `A friendly bot is ${task} — finish first to win! This one's just practice.`
                : `A real opponent is ${task} — first to finish wins. Go fast!`;
            })()}
          </Text>
        )}
        <Text
          className="font-[jost600] text-crossed-gray-400"
          style={{ fontSize: 22 }}
        >
          Starting in
        </Text>
        <Text
          className="mt-2 font-[jost700] text-crossed-blue-450"
          style={{ fontSize: 84 }}
        >
          {secondsToStart}
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-white`}>
      <ConnectionBanner />
      {isWordSearch ? (
        <WordSearchGrid gameId={gameId as string} />
      ) : isTrivia ? (
        <TriviaGame gameId={gameId as string} />
      ) : isSudoku ? (
        <SudokuGrid gameId={gameId as string} />
      ) : (
        <CrosswordGrid gameId={gameId as string} />
      )}
      <UrgencyPulse progress={opponentProgress} />
    </View>
  );
}
