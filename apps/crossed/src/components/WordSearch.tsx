import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import {
  Cell,
  WordSearchPuzzle,
  matchSelection,
  wordSearchProgress,
} from "../lib/word-search";
import colors from "../lib/colors";

const fmtClock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

// Straight line of cells from a to b (row, column, or 45° diagonal); null if the
// two cells don't form one of those.
const lineBetween = (a: Cell, b: Cell): Cell[] | null => {
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  const straight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  if (!straight) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const cells: Cell[] = [];
  for (let i = 0; i <= steps; i++)
    cells.push({ r: a.r + sr * i, c: a.c + sc * i });
  return cells;
};

export const WordSearchGrid = ({ gameId }: { gameId: string }) => {
  const { game, finishGame } = useGame({ gameId });
  const { myProfile } = useMyProfile();

  const puzzle = (
    game?.gameState as { __wordsearch?: WordSearchPuzzle } | undefined
  )?.__wordsearch;

  const [found, setFound] = useState<string[]>([]);
  const [sel, setSel] = useState<Cell[]>([]);
  const dragStart = useRef<Cell | null>(null);
  const [now, setNow] = useState(Date.now());
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const elapsed = startAtMs
    ? Math.max(0, Math.round((now - startAtMs) / 1000))
    : 0;

  // Persist progress + detect completion.
  useEffect(() => {
    if (!puzzle || !myProfile || !game || finishedRef.current) return;
    const p = wordSearchProgress(puzzle, found);
    const last = timelineRef.current[timelineRef.current.length - 1];
    if (!last || p > last.p) timelineRef.current.push({ t: elapsed, p });

    if (found.length >= puzzle.words.length) {
      finishedRef.current = true;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      const mergedDone = {
        ...(game.gameState ?? {}),
        [myProfile.id]: {
          found,
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
      [myProfile.id]: { found },
    };
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      supabase
        .from("games")
        .update({ gameState: merged as never })
        .eq("id", gameId)
        .then();
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  // Size the grid so the whole board + the full word list fit on screen.
  const { width, height } = Dimensions.get("window");
  const size = puzzle?.size ?? 9;
  const cellSize = Math.floor(
    Math.min((width - 24) / size, (height - 330) / size)
  );

  if (!puzzle) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="font-[jost500] text-crossed-gray-400">Loading…</Text>
      </View>
    );
  }

  const foundCells = new Set<string>();
  for (const pl of puzzle.placements)
    if (found.includes(pl.word))
      pl.cells.forEach((c) => foundCells.add(`${c.r},${c.c}`));
  const selSet = new Set(sel.map((c) => `${c.r},${c.c}`));

  const cellAt = (x: number, y: number): Cell => ({
    r: Math.max(0, Math.min(size - 1, Math.floor(y / cellSize))),
    c: Math.max(0, Math.min(size - 1, Math.floor(x / cellSize))),
  });

  const commit = () => {
    const word = sel.length > 1 ? matchSelection(puzzle, sel) : null;
    if (word && !found.includes(word)) setFound((f) => [...f, word]);
    setSel([]);
    dragStart.current = null;
  };

  // Drag a finger across the letters to trace a word. runOnJS so the selection
  // state updates directly.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      if (finishedRef.current) return;
      const cell = cellAt(e.x, e.y);
      dragStart.current = cell;
      setSel([cell]);
    })
    .onUpdate((e) => {
      if (finishedRef.current || !dragStart.current) return;
      const cur = cellAt(e.x, e.y);
      const line = lineBetween(dragStart.current, cur);
      setSel(line ?? [dragStart.current]);
    })
    .onEnd(commit)
    .onFinalize(() => {
      if (dragStart.current) commit();
    });

  const gridPx = cellSize * size;

  return (
    <View className="flex-1 bg-white px-3 pt-2">
      <View className="mb-2 flex-row items-center justify-between px-1">
        <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
          {found.length}/{puzzle.words.length} found
        </Text>
        <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
          {fmtClock(elapsed)}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View className="self-center" style={{ width: gridPx, height: gridPx }}>
          {puzzle.grid.map((row, r) => (
            <View key={r} className="flex-row">
              {row.map((ch, c) => {
                const isFound = foundCells.has(`${r},${c}`);
                const isSel = selSet.has(`${r},${c}`);
                return (
                  <View
                    key={c}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 0.5,
                      borderColor: colors["crossed-gray"]["100"],
                      backgroundColor: isSel
                        ? colors["crossed-blue"]["450"]
                        : isFound
                        ? colors["crossed-green"]["100"]
                        : "white",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "jost600",
                        fontSize: Math.max(11, cellSize * 0.42),
                        color: isSel ? "white" : "#111827",
                      }}
                    >
                      {ch}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </GestureDetector>

      <View
        className="mt-3 flex-row flex-wrap justify-center"
        style={{ gap: 7 }}
      >
        {puzzle.words.map((w) => {
          const got = found.includes(w);
          return (
            <View
              key={w}
              className="rounded-full px-2.5 py-1"
              style={{
                backgroundColor: got
                  ? colors["crossed-green"]["100"]
                  : colors["crossed-gray"]["50"],
              }}
            >
              <Text
                style={{
                  fontFamily: "jost600",
                  fontSize: 13,
                  textDecorationLine: got ? "line-through" : "none",
                  color: got ? colors["crossed-green"]["700"] : "#374151",
                }}
              >
                {w}
              </Text>
            </View>
          );
        })}
      </View>
      <Text className="mt-2 text-center font-[jost400] text-[12px] text-crossed-gray-400">
        Drag across the letters to trace a word ({puzzle.theme})
      </Text>
    </View>
  );
};
