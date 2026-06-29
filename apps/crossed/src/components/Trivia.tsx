import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { TriviaQuiz, triviaProgress } from "../lib/trivia";
import colors from "../lib/colors";

const fmtClock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export const TriviaGame = ({ gameId }: { gameId: string }) => {
  const { game, finishGame } = useGame({ gameId });
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

  // Persist progress + detect completion (all questions answered).
  useEffect(() => {
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
        ...(game.gameState ?? {}),
        [myProfile.id]: {
          answers,
          solvedInSeconds: elapsed,
          timeline: timelineRef.current,
        },
      };
      supabase
        .from("games")
        .update({ gameState: mergedDone as never })
        .eq("id", gameId)
        .then();
      finishGame();
      return;
    }
    const merged = {
      ...(game.gameState ?? {}),
      [myProfile.id]: { answers },
    };
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      supabase
        .from("games")
        .update({ gameState: merged as never })
        .eq("id", gameId)
        .then();
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

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
      <View className="mb-3 flex-row items-center justify-between px-1">
        <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
          Q{Math.min(idx + 1, total)}/{total} · {correctCount} correct
        </Text>
        <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
          {fmtClock(elapsed)}
        </Text>
      </View>

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
