import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
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
  for (let i = 0; i <= steps; i++) cells.push({ r: a.r + sr * i, c: a.c + sc * i });
  return cells;
};

export const WordSearchGrid = ({ gameId }: { gameId: string }) => {
  const { game, finishGame } = useGame({ gameId });
  const { myProfile } = useMyProfile();

  const puzzle = (
    game?.gameState as { __wordsearch?: WordSearchPuzzle } | undefined
  )?.__wordsearch;

  const [found, setFound] = useState<string[]>([]);
  const [start, setStart] = useState<Cell | null>(null);
  const [now, setNow] = useState(Date.now());
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineRef = useRef<{ t: number; p: number }[]>([]);
  const finishedRef = useRef(false);

  // Count-up clock from the game start (solo has no startedAt → createdAt).
  const startAtMs = useMemo(() => {
    const s = game?.startedAt ?? game?.createdAt;
    return s ? new Date(`${s}Z`).getTime() : null;
  }, [game?.startedAt, game?.createdAt]);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, []);
  const elapsed = startAtMs ? Math.max(0, Math.round((now - startAtMs) / 1000)) : 0;

  // Persist progress (drives the opponent's bar) + detect completion.
  useEffect(() => {
    if (!puzzle || !myProfile || !game || finishedRef.current) return;
    const p = wordSearchProgress(puzzle, found);
    const last = timelineRef.current[timelineRef.current.length - 1];
    if (!last || p > last.p) timelineRef.current.push({ t: elapsed, p });

    const done = found.length >= puzzle.words.length;
    if (done) {
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

  const onCellPress = (r: number, c: number) => {
    if (finishedRef.current) return;
    if (!start) {
      setStart({ r, c });
      return;
    }
    const line = lineBetween(start, { r, c });
    setStart(null);
    if (!line) return;
    const word = matchSelection(puzzle, line);
    if (word && !found.includes(word)) setFound((f) => [...f, word]);
  };

  const dim = Dimensions.get("window").width - 24;
  const cellSize = Math.floor(dim / puzzle.size);

  return (
    <View className="flex-1 bg-white px-3 pt-2">
      {/* Count-up timer + progress */}
      <View className="mb-2 flex-row items-center justify-between px-1">
        <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
          {found.length}/{puzzle.words.length} found
        </Text>
        <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
          {fmtClock(elapsed)}
        </Text>
      </View>

      {/* Grid */}
      <View className="self-center" style={{ width: cellSize * puzzle.size }}>
        {puzzle.grid.map((row, r) => (
          <View key={r} className="flex-row">
            {row.map((ch, c) => {
              const isFound = foundCells.has(`${r},${c}`);
              const isStart = start?.r === r && start?.c === c;
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.6}
                  onPress={() => onCellPress(r, c)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 0.5,
                    borderColor: colors["crossed-gray"]["100"],
                    backgroundColor: isStart
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
                      color: isStart ? "white" : "#111827",
                    }}
                  >
                    {ch}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Word list */}
      <View className="mt-4 flex-row flex-wrap justify-center" style={{ gap: 8 }}>
        {puzzle.words.map((w) => {
          const got = found.includes(w);
          return (
            <View
              key={w}
              className="rounded-full px-3 py-1"
              style={{
                backgroundColor: got
                  ? colors["crossed-green"]["100"]
                  : colors["crossed-gray"]["50"],
              }}
            >
              <Text
                style={{
                  fontFamily: "jost600",
                  fontSize: 14,
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
      <Text className="mt-3 text-center font-[jost400] text-[12px] text-crossed-gray-400">
        Tap the first and last letter of a word ({puzzle.theme})
      </Text>
    </View>
  );
};
