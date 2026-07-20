import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { TriviaQuiz, triviaProgress } from "../lib/trivia";
import { ghostProgressAt, type TimelinePoint } from "../lib/challenge-utils";
import { FriendlyCrosswordHeader } from "./FriendlyCrosswordHeader";
import colors from "../lib/colors";

const fmtClock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export const TriviaGame = ({ gameId }: { gameId: string }) => {
  const { game, finishGame, opponent } = useGame({ gameId });
  const { myProfile } = useMyProfile();

  const quiz = (game?.gameState as { __trivia?: TriviaQuiz } | undefined)
    ?.__trivia;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<number | null>(null); // current reveal
  const [now, setNow] = useState(Date.now());
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineRef = useRef<{ t: number; p: number }[]>([]);
  const finishedRef = useRef(false);
  const gsRef = useRef(game?.gameState);
  const answersRef = useRef<Record<string, number>>({});
  useEffect(() => {
    gsRef.current = game?.gameState;
  }, [game?.gameState]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const isRace = !!opponent;

  const startAtMs = useMemo(() => {
    const s = game?.startedAt ?? game?.createdAt;
    return s ? new Date(`${s}Z`).getTime() : null;
  }, [game?.startedAt, game?.createdAt]);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, []);
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (writeTimer.current) clearTimeout(writeTimer.current);
    },
    []
  );
  const elapsed = startAtMs ? Math.max(0, Math.round((now - startAtMs) / 1000)) : 0;

  // Restore answers saved on the server (resuming after a background/kill), and
  // jump to the first unanswered question. Without this the quiz restarts from
  // scratch and the next answer overwrites every earlier one.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !myProfile?.id || !game?.gameState || !quiz)
      return;
    const mine = (
      game.gameState as Record<
        string,
        { answers?: Record<string, number> } | undefined
      >
    )[myProfile.id];
    hydratedRef.current = true;
    const saved = mine?.answers;
    if (saved && Object.keys(saved).length) {
      setAnswers(saved);
      answersRef.current = saved;
      const next = quiz.questions.findIndex((q) => saved[q.id] === undefined);
      setIdx(next < 0 ? quiz.questions.length - 1 : next);
    }
  }, [game?.gameState, myProfile?.id, quiz]);

  // Persist progress + detect completion (all questions answered).
  useEffect(() => {
    // Never write before restoring, or we'd clobber saved answers.
    if (!hydratedRef.current) return;
    if (!quiz || !myProfile || !game || finishedRef.current) return;
    const answered = Object.keys(answers).length;
    if (answered === 0) return;
    const p = triviaProgress(quiz, answers);
    const last = timelineRef.current[timelineRef.current.length - 1];
    if (!last || p > last.p) timelineRef.current.push({ t: elapsed, p });

    if (answered >= quiz.questions.length) {
      finishedRef.current = true;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      const mergedDone = {
        ...(gsRef.current ?? {}),
        [myProfile.id]: {
          answers,
          solvedInSeconds: elapsed,
          timeline: timelineRef.current,
        },
      };
      // AWAIT the winning write before finishing: the server re-reads gameState
      // from the DB to score, so a fire-and-forget write here can lose the race
      // and score the last answer as unanswered (same fix as crossword/sudoku/
      // word search).
      void (async () => {
        await supabase
          .from("games")
          .update({ gameState: mergedDone as never })
          .eq("id", gameId);
        finishGame();
      })();
      return;
    }
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      supabase
        .from("games")
        .update({
          gameState: {
            ...(gsRef.current ?? {}),
            [myProfile.id]: { answers },
          } as never,
        })
        .eq("id", gameId)
        .then();
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  // Bot opponent: rubber-band its correct-answer count toward the player
  // (capped ~90% so finishing wins) — answering the first N questions correctly.
  const startAtMsForBot = startAtMs;
  useEffect(() => {
    const bot = opponent as { id?: string; type?: string } | undefined;
    if (!quiz || !game || !bot?.id || bot.type !== "BOT" || !startAtMsForBot)
      return;
    const total = quiz.questions.length;
    const duration = game.gameDurationInSeconds || 240;
    const botId = bot.id;
    let botCount =
      Object.keys(
        (gsRef.current as Record<string, { answers?: Record<string, number> }> | undefined)?.[
          botId
        ]?.answers ?? {}
      ).length || 0;
    const tick = setInterval(() => {
      if (finishedRef.current) {
        clearInterval(tick);
        return;
      }
      const elapsedSec = Math.max(0, (Date.now() - startAtMsForBot) / 1000);
      const elapsedFrac = Math.min(1, elapsedSec / duration);
      const ghostTl = (
        gsRef.current as
          | { __challenge?: { timeline?: TimelinePoint[] } }
          | undefined
      )?.__challenge?.timeline;
      let targetFrac: number;
      if (ghostTl) {
        targetFrac = ghostProgressAt(ghostTl, elapsedSec) / 100;
      } else {
        const playerFrac = total
          ? Object.keys(answersRef.current).length / total
          : 0;
        const lead = 0.18 - 0.13 * Math.min(1, elapsedFrac / 0.4);
        const earlyFloor = elapsedFrac < 0.3 ? 0.22 : 0;
        targetFrac = Math.min(0.9, Math.max(earlyFloor, playerFrac + lead));
      }
      const target = Math.max(0, Math.floor(total * targetFrac));
      if (target > botCount) {
        botCount = target;
        const botAnswers: Record<string, number> = {};
        for (let i = 0; i < botCount; i++) {
          const q = quiz.questions[i];
          if (q) botAnswers[q.id] = q.answer; // bot answers correctly
        }
        supabase
          .from("games")
          .update({
            gameState: {
              ...(gsRef.current ?? {}),
              [botId]: { answers: botAnswers },
            } as never,
          })
          .eq("id", gameId)
          .then();
      }
    }, 800);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponent, quiz, startAtMsForBot, game?.gameDurationInSeconds]);

  if (!quiz) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="font-[jost500] text-crossed-gray-400">Loading…</Text>
      </View>
    );
  }

  const total = quiz.questions.length;
  const current = quiz.questions[Math.min(idx, total - 1)];
  const correctCount = quiz.questions.filter(
    (qq) => answers[qq.id] === qq.answer
  ).length;

  const onPick = (choice: number) => {
    if (picked !== null || finishedRef.current || answers[current.id] != null)
      return;
    setPicked(choice);
    const next = { ...answers, [current.id]: choice };
    advanceTimer.current = setTimeout(() => {
      setAnswers(next);
      setPicked(null);
      setIdx((i) => i + 1);
    }, 700);
  };

  return (
    <View className="flex-1 bg-white px-5 pt-2">
      {/* Header: progress + count-up timer */}
      {/* Race: the shared head-to-head header (timer + opponent/you bars + red
          pulse) — identical to crossword — plus the question position. Solo: a
          count-up clock + running score. */}
      {isRace ? (
        <>
          <View className="mb-2">
            <FriendlyCrosswordHeader gameId={gameId} />
          </View>
          <Text className="mb-1 text-center font-[jost600] text-[13px] text-crossed-gray-400">
            Question {Math.min(idx + 1, total)} of {total}
          </Text>
        </>
      ) : (
        <View className="mb-3 flex-row items-center justify-between px-1">
          <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
            Q{Math.min(idx + 1, total)}/{total} · {correctCount} correct
          </Text>
          <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
            {fmtClock(elapsed)}
          </Text>
        </View>
      )}

      {/* Question */}
      <View className="mt-2 rounded-2xl bg-crossed-gray-50 px-5 py-6">
        <Text className="text-center font-[jost600] text-[12px] tracking-wide text-crossed-gray-400">
          {current.category.toUpperCase()}
        </Text>
        <Text
          className="mt-2 text-center font-[jost700] text-crossed-gray-900"
          style={{ fontSize: 21, lineHeight: 28 }}
        >
          {current.q}
        </Text>
      </View>

      {/* Choices */}
      <View className="mt-5" style={{ gap: 12 }}>
        {current.choices.map((choice, i) => {
          const isPicked = picked === i;
          const isCorrect = i === current.answer;
          const reveal = picked !== null;
          let bg = "white";
          let border = colors["crossed-gray"]["100"];
          let textColor = "#111827";
          if (reveal && isCorrect) {
            bg = colors["crossed-green"]["100"];
            border = colors["crossed-green"]["700"];
            textColor = colors["crossed-green"]["700"];
          } else if (reveal && isPicked && !isCorrect) {
            bg = "#FFE9EC";
            border = colors["crossed-red"]["500"];
            textColor = colors["crossed-red"]["500"];
          }
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.85}
              onPress={() => onPick(i)}
              style={{
                borderWidth: 1.5,
                borderColor: border,
                backgroundColor: bg,
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 18,
              }}
            >
              <Text
                style={{ fontFamily: "jost600", fontSize: 16, color: textColor }}
              >
                {choice}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
