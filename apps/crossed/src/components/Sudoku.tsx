import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import produce from "immer";
import { addSeconds, differenceInSeconds } from "date-fns";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { GameState } from "types-and-validators";
import { FriendlyCrosswordHeader } from "./FriendlyCrosswordHeader";

// A sudoku cell value: 1-9 when filled, 0 when empty. Givens come straight from
// the puzzle and can't be changed.
type Cell = number;

const EMPTY: Cell = 0;

// Build the starting grid: givens in place, every other cell empty (0).
const initialGrid = (puzzle: number[][]): Cell[][] =>
  puzzle.map((row) => row.map((c) => (c && c !== 0 ? c : EMPTY)));

const countFilled = (grid: Cell[][]) =>
  grid.reduce((n, row) => n + row.filter((c) => c !== EMPTY).length, 0);

export const SudokuGrid = ({
  gameId,
  showResults,
}: {
  gameId: string;
  showResults?: { playerId?: string };
}) => {
  const { myProfile } = useMyProfile();
  const { finishGame, game, opponent } = useGame({ gameId });
  const sudoku = game?.sudoku;
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width * 0.92, 440);

  const isGameFinished = game?.playState === "COMPLETED";
  const [gameState, setGameState] = useState<GameState | null>(null);
  // Pencil marks (candidate notes). Local-only — a personal aid, not synced or
  // scored. Keyed by "row,col" -> sorted list of candidate digits.
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState<Record<string, number[]>>({});

  // --- Bot opponent: fills its grid toward the solution over time ----------
  useEffect(() => {
    if (!game || !sudoku || !opponent) return;
    if (opponent?.type !== "BOT") return;

    const botGameState = game?.gameState?.[opponent.id];
    if (!botGameState) {
      const initialSolutionState = initialGrid(sudoku.puzzle);
      supabase
        .from("games")
        .update({
          gameState: game.gameState
            ? {
                ...game.gameState,
                [opponent.id]: { solution: initialSolutionState },
              }
            : { [opponent.id]: { solution: initialSolutionState } },
        })
        .eq("id", gameId)
        .then();
      return;
    }
    if (isGameFinished) return;

    const totalCells = 81;
    const botRating = (opponent as { eloRating?: number }).eloRating || 1000;
    // How much of the grid the bot completes (floor raised so bars don't stall).
    const targetFraction = Math.min(
      0.99,
      Math.max(0.65, 0.6 + (botRating - 800) / 1200)
    );
    const targetFilled = Math.max(1, Math.floor(totalCells * targetFraction));
    const botFilled = countFilled(botGameState.solution as Cell[][]);
    const cellsToFill = targetFilled - botFilled;
    const secondsLeft = differenceInSeconds(
      addSeconds(new Date(`${game.startedAt}Z`), game.gameDurationInSeconds),
      new Date(new Date().toUTCString())
    );
    // Lower = finishes sooner = more urgency, scaled by bot strength.
    const paceFactor = Math.min(
      0.85,
      Math.max(0.35, 0.85 - (botRating - 800) / 1500)
    );
    const avgDelay =
      cellsToFill > 0 ? (secondsLeft * paceFactor) / cellsToFill : 0;
    // bursty, human-like cadence (re-randomized after each fill)
    const nextDelayMs = Math.max(
      300,
      avgDelay * (0.3 + Math.random() * 1.2) * 1000
    );

    if (cellsToFill > 0 && secondsLeft > 0) {
      const interval = setInterval(() => {
        const solution = (game.gameState?.[opponent.id]?.solution ??
          botGameState.solution) as Cell[][];
        if (!solution) return;
        // find the first empty cell and drop in the correct digit
        const rowIndex = solution.findIndex((row) => row.includes(EMPTY));
        if (rowIndex < 0) {
          clearInterval(interval);
          return;
        }
        const colIndex = solution[rowIndex].findIndex((c) => c === EMPTY);
        if (colIndex < 0) return;
        const value = sudoku.solution[rowIndex][colIndex];
        const newSolution = solution.map((row, r) =>
          r === rowIndex
            ? row.map((c, col) => (col === colIndex ? value : c))
            : row
        );
        supabase
          .from("games")
          .update({
            gameState: game.gameState
              ? {
                  ...game.gameState,
                  [opponent.id]: { solution: newSolution },
                }
              : { [opponent.id]: { solution: newSolution } },
          })
          .eq("id", gameId)
          .then();
      }, nextDelayMs);
      return () => clearInterval(interval);
    }
  }, [game, gameId, isGameFinished, opponent, sudoku]);

  // --- Initialize the player's grid ----------------------------------------
  useEffect(() => {
    if (game && sudoku && myProfile && !gameState && !showResults) {
      const existing = game.gameState?.[myProfile.id];
      if (existing) {
        setGameState(existing);
        return;
      }
      setGameState({
        currentCell: { x: 0, y: 0 },
        direction: "Across",
        solution: initialGrid(sudoku.puzzle),
      });
    }
  }, [game, gameState, myProfile, showResults, sudoku]);

  // --- Results view: show a chosen player's grid (or the solution) ----------
  useEffect(() => {
    if (showResults && game && sudoku) {
      const solutionToDisplay = showResults.playerId
        ? (game.gameState?.[showResults.playerId]?.solution as Cell[][]) ??
          initialGrid(sudoku.puzzle)
        : (sudoku.solution as Cell[][]);
      setGameState({
        currentCell: { x: 0, y: 0 },
        direction: "Across",
        solution: solutionToDisplay,
      });
    }
  }, [game, showResults, sudoku]);

  // --- Auto-finish + persist progress --------------------------------------
  useEffect(() => {
    if (game && gameState && myProfile && !isGameFinished && !showResults) {
      const solved =
        JSON.stringify(gameState.solution) === JSON.stringify(sudoku?.solution);
      if (solved) {
        finishGame();
      }
      supabase
        .from("games")
        .update({
          gameState: game.gameState
            ? { ...game.gameState, [myProfile.id]: gameState }
            : { [myProfile.id]: gameState },
        })
        .eq("id", gameId)
        .then();
    }
  }, [
    finishGame,
    game,
    gameId,
    gameState,
    isGameFinished,
    myProfile,
    showResults,
    sudoku,
  ]);

  if (!game || !gameState || !sudoku) {
    return null;
  }

  const grid = gameState.solution as Cell[][];
  const givens = sudoku.puzzle;
  const { currentCell } = gameState;
  const disabled = !!showResults || isGameFinished;

  const isGiven = (r: number, c: number) => givens[r][c] !== 0;

  const selectCell = (x: number, y: number) => {
    if (disabled) return;
    setGameState(
      produce((draft) => {
        if (draft) draft.currentCell = { x, y };
      })
    );
  };

  const setCellValue = (value: Cell) => {
    if (disabled) return;
    const { x, y } = currentCell;
    if (isGiven(x, y)) return;
    setGameState(
      produce((draft) => {
        if (draft) draft.solution[x][y] = value;
      })
    );
  };

  const cellKey = (x: number, y: number) => `${x},${y}`;

  // Number pad press: in Notes mode toggle a pencil mark; otherwise place the
  // value (and clear that cell's notes).
  const handleNumber = (n: number) => {
    if (disabled) return;
    const { x, y } = currentCell;
    if (isGiven(x, y)) return;
    if (notesMode) {
      setNotes((prev) => {
        const k = cellKey(x, y);
        const cur = prev[k] ?? [];
        const next = cur.includes(n)
          ? cur.filter((v) => v !== n)
          : [...cur, n].sort((a, b) => a - b);
        return { ...prev, [k]: next };
      });
    } else {
      setCellValue(n);
      setNotes((prev) => {
        const k = cellKey(x, y);
        if (!prev[k]) return prev;
        const copy = { ...prev };
        delete copy[k];
        return copy;
      });
    }
  };

  const handleErase = () => {
    if (disabled) return;
    const { x, y } = currentCell;
    if (isGiven(x, y)) return;
    setCellValue(EMPTY);
    setNotes((prev) => {
      const k = cellKey(x, y);
      if (!prev[k]) return prev;
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
  };

  const cellPx = boardSize / 9;
  const fontSize = cellPx * 0.5;

  const sameBox = (r: number, c: number) =>
    Math.floor(r / 3) === Math.floor(currentCell.x / 3) &&
    Math.floor(c / 3) === Math.floor(currentCell.y / 3);

  const cellBg = (r: number, c: number) => {
    if (r === currentCell.x && c === currentCell.y) return "#2563eb"; // blue-600
    if (
      r === currentCell.x ||
      c === currentCell.y ||
      sameBox(r, c)
    )
      return "#dbeafe"; // blue-100
    return "#ffffff";
  };

  return (
    <View className="flex-1">
      <View className="items-center">
        <View style={{ width: boardSize }}>
          <View className="py-2">
            {showResults ? null : (
              <>
                {(game?.gameType === "FRIENDLY" ||
                  game?.gameType === "RANKED" ||
                  game?.gameType === "TOURNAMENT") && (
                  <FriendlyCrosswordHeader gameId={gameId as string} />
                )}
              </>
            )}
          </View>

          {/* Board */}
          <View
            style={{ width: boardSize, height: boardSize }}
            className="border-2 border-black"
          >
            {grid.map((row, r) => (
              <View key={`row-${r}`} className="flex-1 flex-row">
                {row.map((value, c) => {
                  const given = isGiven(r, c);
                  const wrong =
                    showResults &&
                    value !== EMPTY &&
                    value !== sudoku.solution[r][c];
                  const isSelected =
                    r === currentCell.x && c === currentCell.y && !showResults;
                  return (
                    <TouchableOpacity
                      key={`cell-${r}-${c}`}
                      activeOpacity={0.7}
                      onPress={() => selectCell(r, c)}
                      style={{
                        width: cellPx,
                        height: cellPx,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: showResults ? "#ffffff" : cellBg(r, c),
                        borderRightWidth: c % 3 === 2 && c !== 8 ? 2 : 0.5,
                        borderBottomWidth: r % 3 === 2 && r !== 8 ? 2 : 0.5,
                        borderColor: "#9ca3af",
                      }}
                    >
                      {value !== EMPTY ? (
                        <Text
                          style={{
                            fontSize,
                            fontWeight: given ? "700" : "500",
                            color: isSelected
                              ? "#ffffff"
                              : wrong
                              ? "#b91c1c"
                              : given
                              ? "#111827"
                              : "#2563eb",
                          }}
                        >
                          {String(value)}
                        </Text>
                      ) : notes[cellKey(r, c)]?.length ? (
                        // Pencil marks: a 3x3 of candidate digits.
                        <View
                          style={{
                            width: cellPx,
                            height: cellPx,
                            flexDirection: "row",
                            flexWrap: "wrap",
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <View
                              key={n}
                              style={{
                                width: cellPx / 3,
                                height: cellPx / 3,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: cellPx * 0.2,
                                  color: isSelected ? "#dbeafe" : "#6b7280",
                                }}
                              >
                                {notes[cellKey(r, c)].includes(n) ? n : ""}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Number pad */}
          {!disabled && (
            <View className="mt-6">
              <View className="flex-row justify-between">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <TouchableOpacity
                    key={`pad-${n}`}
                    activeOpacity={0.7}
                    onPress={() => handleNumber(n)}
                    style={{
                      width: boardSize / 9 - 4,
                      height: boardSize / 9 + 8,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      backgroundColor: notesMode ? "#f5f3ff" : "#eff6ff",
                      borderWidth: 1,
                      borderColor: notesMode ? "#ddd6fe" : "#bfdbfe",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize * 0.95,
                        fontWeight: "600",
                        color: notesMode ? "#7c3aed" : "#1d4ed8",
                      }}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="mt-3 flex-row" style={{ gap: 10 }}>
                {/* Notes (pencil) toggle */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setNotesMode((v) => !v)}
                  className="flex-1 flex-row items-center justify-center rounded-lg py-3"
                  style={{
                    backgroundColor: notesMode ? "#7c3aed" : "#f3f4f6",
                  }}
                >
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                  <Text
                    className="ml-2 font-[jost600] text-base"
                    style={{ color: notesMode ? "#ffffff" : "#6b7280" }}
                  >
                    Notes {notesMode ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleErase}
                  className="flex-1 items-center justify-center rounded-lg bg-crossed-gray-100 py-3"
                >
                  <Text className="font-[jost600] text-base text-crossed-gray-400">
                    Erase
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
