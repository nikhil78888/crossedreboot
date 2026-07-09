import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import produce from "immer";
import { calculateScore, puzzleOf, solutionOf, useGame } from "../hooks/use-game";
import { ghostProgressAt } from "../lib/challenge-utils";
import { TextInput, TouchableOpacity } from "react-native-gesture-handler";
import { FriendlyCrosswordHeader } from "./FriendlyCrosswordHeader";
import { SoloTimer } from "./SoloTimer";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { Crossword, GameState } from "types-and-validators";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { addSeconds, differenceInSeconds } from "date-fns";
import { logSeenClues } from "../lib/clue-resolver";

type CrosswordContextType = {
  crossword: Crossword;
  currentCell: GameState["currentCell"];
  setCurrentCell: (cell: GameState["currentCell"]) => void;
  direction: GameState["direction"];
  setDirection: (newDirection: GameState["direction"]) => void;
  solution: GameState["solution"];
  setSolution: ({
    cell,
    value,
  }: {
    cell: GameState["currentCell"];
    value: string;
  }) => void;
  gameId: string;
  playerResult?: GameState["solution"];
};

const CrosswordContext = createContext<CrosswordContextType>(null!);

export const CrosswordGrid = ({
  gameId,
  showResults,
  isIntro,
}: {
  gameId: string;
  showResults?: {
    playerId?: string;
  };
  // The first-time guided warm-up: cap the bot low so a new player always wins.
  isIntro?: boolean;
}) => {
  const { myProfile } = useMyProfile();
  const { finishGame, game, opponent } = useGame({ gameId });
  const crossword = game?.crossword;
  const { width } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState<number | null>();
  const { height, progress } = useReanimatedKeyboardAnimation();

  const crosswordContainerStyle = useAnimatedStyle(() => {
    const maxWidth = width * 0.9;
    if (progress.value !== 1 || !containerHeight) {
      return { width: maxWidth };
    }
    const deductible = height.value - 160;
    return {
      width: Math.min(containerHeight - Math.abs(deductible), maxWidth),
    };
  }, [containerHeight]);

  const clueContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: height.value }],
    };
  });

  const isGameFinished = game?.playState === "COMPLETED";
  const [gameState, setGameState] = useState<GameState | null>(null);
  // Debounce progress writes so we don't write the full game row on every
  // keystroke (realtime/write amplification). The WIN write is never debounced.
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Progress samples [{t: secs, p: score}] over the solve — the ghost replay a
  // challenged friend will race against.
  const timelineRef = useRef<{ t: number; p: number }[]>([]);
  useEffect(
    () => () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
    },
    []
  );

  // Record the (word, clue) pairs this player was shown, so they're never
  // served the same pair again — even in a game they didn't create. Once.
  const loggedClues = useRef(false);
  useEffect(() => {
    if (!showResults && crossword && myProfile && !loggedClues.current) {
      loggedClues.current = true;
      logSeenClues(crossword, crossword.clues, myProfile.id);
    }
  }, [crossword, myProfile, showResults]);

  // auto update bot game state if applicable
  useEffect(() => {
    if (game && crossword && opponent) {
      if (opponent?.type === "BOT") {
        const botGameState = game?.gameState?.[opponent.id];
        if (!botGameState) {
          // initialize game state
          const initialSolutionState: GameState["solution"] =
            crossword.puzzle.map((row) => {
              const emptyRow = row.map((cell) => {
                if (cell !== "#") {
                  return "";
                } else {
                  return null;
                }
              });
              return emptyRow;
            });
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
        }
        if (!isGameFinished) {
          // update bot game state with correct solution
          const totalFillableCells = crossword.solution.reduce((count, row) => {
            return (count = count + row.filter((cell) => !!cell).length);
          }, 0);
          const botFilledCells =
            botGameState?.solution.reduce((count, row) => {
              return (
                count +
                row.filter((cell) => cell !== "" && cell !== null).length
              );
            }, 0) || 0;
          const secondsLeft = differenceInSeconds(
            addSeconds(
              new Date(`${game.startedAt}Z`),
              game.gameDurationInSeconds
            ),
            new Date(new Date().toUTCString())
          );
          const elapsedFrac =
            game.gameDurationInSeconds > 0
              ? Math.min(
                  1,
                  Math.max(0, 1 - secondsLeft / game.gameDurationInSeconds)
                )
              : 0;

          let totalBotFillableCells: number;
          let nextDelayMs: number;
          const challengeMeta = (
            game?.gameState as Record<string, unknown> | undefined
          )?.["__challenge"] as
            | { timeline?: { t: number; p: number }[] }
            | undefined;
          if (challengeMeta?.timeline && game.startedAt) {
            // Ghost race: replay the challenger's recorded timeline exactly.
            const elapsedSec = Math.max(
              0,
              Math.round(
                (Date.now() - new Date(`${game.startedAt}Z`).getTime()) / 1000
              )
            );
            const ghostP = ghostProgressAt(challengeMeta.timeline, elapsedSec);
            totalBotFillableCells = Math.max(
              0,
              Math.floor((totalFillableCells * ghostP) / 100)
            );
            nextDelayMs = 250;
          } else {
            // Rubber-band (every other bot game): surge out of the gate, then
            // quietly track the player's progress so the race stays close —
            // a hair ahead, capped ~90% so finishing wins.
            const playerSolution = myProfile?.id
              ? game?.gameState?.[myProfile.id]?.solution
              : undefined;
            const playerFilled = playerSolution
              ? playerSolution.reduce(
                  (count, row) =>
                    count +
                    row.filter((cell) => cell !== "" && cell !== null).length,
                  0
                )
              : 0;
            const playerFrac = totalFillableCells
              ? playerFilled / totalFillableCells
              : 0;
            const lead = 0.18 - 0.13 * Math.min(1, elapsedFrac / 0.4);
            const earlyFloor = elapsedFrac < 0.3 ? 0.22 : 0;
            // First-time warm-up: cap the bot LOW and DON'T rubber-band to the
            // player, so a new player wins comfortably even if they leave part of
            // the grid blank. Otherwise the bot tracks ~18% ahead and beats
            // anyone who doesn't finish — the reason new players were losing it.
            const targetFrac = isIntro
              ? 0.4
              : Math.min(0.9, Math.max(earlyFloor, playerFrac + lead));
            totalBotFillableCells = Math.max(
              1,
              Math.floor(totalFillableCells * targetFrac)
            );
            nextDelayMs = 450 + Math.random() * 700;
          }
          const cellsToFill = totalBotFillableCells - botFilledCells;
          if (botGameState && cellsToFill > 0 && secondsLeft > 0) {
            const interval = setInterval(() => {
              const solution = botGameState?.solution;
              if (!solution) return;
              const rowToFillIndex = solution.findIndex((row) =>
                row.includes("")
              );
              // bot has filled all of its cells — stop (this was the mid-game
              // crash: solution[-1] -> reading .findIndex of undefined).
              if (rowToFillIndex < 0) {
                clearInterval(interval);
                return;
              }
              const rowToFill = solution[rowToFillIndex];
              const colToFillIndex = rowToFill.findIndex((cell) => cell === "");
              if (colToFillIndex < 0) {
                return;
              }
              const valueToFill =
                crossword.solution[rowToFillIndex][colToFillIndex];
              const newSolution = [
                ...solution.slice(0, rowToFillIndex),
                [
                  ...rowToFill.slice(0, colToFillIndex),
                  valueToFill,
                  ...rowToFill.slice(colToFillIndex + 1),
                ],
                ...solution.slice(rowToFillIndex + 1),
              ];
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
        }
      }
    }
  }, [crossword, game, gameId, isGameFinished, opponent]);

  useEffect(() => {
    // initialize gameState
    if (game && crossword && myProfile && !gameState) {
      const playerGameState = game.gameState?.[myProfile.id];
      if (playerGameState) {
        setGameState(playerGameState);
        return;
      }
      const initialSolutionState = crossword.puzzle.map((row) => {
        const emptyRow = row.map((cell) => {
          if (cell !== "#") {
            return "";
          } else {
            return null;
          }
        });
        return emptyRow;
      });
      setGameState({
        currentCell: {
          x: 0,
          y: crossword.solution[0].findIndex(
            (cellResult) => cellResult !== null
          ),
        },
        direction: "Across",
        solution: initialSolutionState,
      });
    }
  }, [crossword, game, gameState, myProfile]);

  useEffect(() => {
    // update game state if showResults
    if (showResults && game && crossword) {
      const solutionToDisplay = showResults.playerId
        ? game.gameState?.[showResults.playerId]?.solution ?? crossword.solution
        : crossword.solution;
      setGameState({
        direction: "Across",
        currentCell: {
          x: 0,
          y: crossword.solution[0].findIndex(
            (cellResult) => cellResult !== null
          ),
        },
        solution: solutionToDisplay,
      });
    }
  }, [crossword, game, showResults]);

  useEffect(() => {
    if (!(game && gameState && myProfile && !isGameFinished)) return;
    // Capture a progress sample (only when it advances) for the ghost replay.
    // Solo games have no startedAt (self-paced) — fall back to createdAt so solo
    // solves still record a time + timeline (and get the Challenge button).
    const startAt = game.startedAt ?? game.createdAt;
    if (startAt) {
      const p = calculateScore({
        correctSolution: solutionOf(game),
        solution: gameState.solution,
        puzzle: puzzleOf(game),
      });
      const last = timelineRef.current[timelineRef.current.length - 1];
      if (!last || p > last.p) {
        const t = Math.max(
          0,
          Math.round((Date.now() - new Date(`${startAt}Z`).getTime()) / 1000)
        );
        timelineRef.current.push({ t, p });
      }
    }
    const merged = game.gameState
      ? { ...game.gameState, [myProfile.id]: gameState }
      : { [myProfile.id]: gameState };
    const write = () =>
      supabase.from("games").update({ gameState: merged }).eq("id", gameId).then();
    // Win check is immediate (synchronous) so finishing isn't gated on a write.
    const hasEmptyCell = gameState.solution.find((row) => row.includes(""));
    const isCorrectSolution =
      !hasEmptyCell &&
      JSON.stringify(gameState.solution) ===
        JSON.stringify(game.crossword?.solution);
    if (isCorrectSolution) {
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      // Stamp how long the solve took so stats + challenges can show it.
      const solveSeconds = startAt
        ? Math.max(
            0,
            Math.round(
              (Date.now() - new Date(`${startAt}Z`).getTime()) / 1000
            )
          )
        : null;
      const mergedDone: Record<string, unknown> = {
        ...(game.gameState ?? {}),
        [myProfile.id]: {
          ...gameState,
          solvedInSeconds: solveSeconds,
          timeline: timelineRef.current,
        },
      };
      // The server's finish-game handler reads gameState from the DB to compute
      // the score. AWAIT the winning-state write before finishing so scoring can
      // never read a stale (debounced, e.g. 97%) progress write — the cause of
      // "sometimes I get 97 instead of 100 when everything's right".
      void (async () => {
        await supabase
          .from("games")
          .update({ gameState: mergedDone as never })
          .eq("id", gameId);
        finishGame();
      })();
      return;
    }
    // Otherwise debounce the progress write (drives the opponent's bar).
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(write, 800);
  }, [finishGame, game, gameId, gameState, isGameFinished, myProfile]);

  if (!game || !gameState || !crossword) {
    return null;
  }

  const { solution, currentCell, direction } = gameState;

  const setCurrentCell = (cell: GameState["currentCell"]) => {
    setGameState(
      produce((draft) => {
        if (draft) {
          draft.currentCell = cell;
        }
      })
    );
  };

  const setDirection = (newDirection: GameState["direction"]) => {
    setGameState(
      produce((draft) => {
        if (draft) {
          draft.direction = newDirection;
        }
      })
    );
  };

  const setSolution = ({
    cell,
    value,
  }: {
    cell: GameState["currentCell"];
    value: string;
  }) => {
    setGameState(
      produce((draft) => {
        if (draft) {
          draft.solution[cell.x][cell.y] = value;
        }
      })
    );
  };

  const gotoPrevCell = ({
    cell,
    direction,
    clearDestination,
  }: {
    cell: { x: number; y: number };
    direction: "Across" | "Down";
    clearDestination?: boolean;
  }) => {
    if (direction === "Across") {
      // go back in same row
      for (let i = cell.y - 1; i >= 0; i = i - 1) {
        if (solution[cell.x][i] !== null) {
          setCurrentCell({ x: cell.x, y: i });
          if (clearDestination) {
            setSolution({ cell: { x: cell.x, y: i }, value: "" });
          }
          setDirection(direction);
          return;
        }
      }
      // go back in prev row
      const prevRow = cell.x - 1;
      if (prevRow >= 0) {
        for (let i = crossword.size - 1; i >= 0; i = i - 1) {
          if (solution[prevRow][i] !== null) {
            setCurrentCell({ x: prevRow, y: i });
            if (clearDestination) {
              setSolution({ cell: { x: prevRow, y: i }, value: "" });
            }
            setDirection(direction);
            return;
          }
        }
      } else {
        // switch direction and start search from last cell
        gotoPrevCell({
          cell: {
            x: crossword.size,
            y: crossword.size - 1,
          },
          direction: "Down",
        });
      }
    }
    if (direction === "Down") {
      // go back in same col
      for (let i = cell.x - 1; i >= 0; i = i - 1) {
        if (solution[i][cell.y] !== null) {
          setCurrentCell({ x: i, y: cell.y });
          if (clearDestination) {
            setSolution({ cell: { x: i, y: cell.y }, value: "" });
          }
          setDirection(direction);
          return;
        }
      }
      // go back in prev col
      const prevCol = cell.y - 1;
      if (prevCol >= 0) {
        for (let i = crossword.size - 1; i >= 0; i = i - 1) {
          if (solution[i][prevCol] !== null) {
            setCurrentCell({ x: i, y: prevCol });
            if (clearDestination) {
              setSolution({ cell: { x: i, y: prevCol }, value: "" });
            }
            setDirection(direction);
            return;
          }
        }
      } else {
        // switch direction and start from last cell
        gotoPrevCell({
          cell: {
            x: crossword.size - 1,
            y: crossword.size,
          },
          direction: "Across",
        });
      }
    }
  };

  const handleBackspace = ({ x, y }: { x: number; y: number }) => {
    if (isGameFinished) {
      return;
    }
    if (solution[x][y] !== "") {
      setSolution({ cell: { x, y }, value: "" });
    } else {
      gotoPrevCell({ cell: currentCell, direction, clearDestination: true });
    }
  };

  const gotoNextCell = ({
    cell,
    direction,
    allowLoop,
  }: {
    cell: { x: number; y: number };
    direction: "Across" | "Down";
    allowLoop: boolean;
  }) => {
    if (isGameFinished) {
      return;
    }
    // A cell only has a clue in a direction if it belongs to a 2+ cell word that
    // way. Skip lone boxes (no clue in this direction) so cycling lands on the
    // next real clue instead of stalling on a single square.
    const inAcrossWord = (x: number, y: number) =>
      solution[x]?.[y] != null &&
      (solution[x]?.[y - 1] != null || solution[x]?.[y + 1] != null);
    const inDownWord = (x: number, y: number) =>
      solution[x]?.[y] != null &&
      (solution[x - 1]?.[y] != null || solution[x + 1]?.[y] != null);
    if (direction === "Across") {
      // next clued cell in the current row
      const emptyRowCellIndex = solution[cell.x].findIndex(
        (c, col) => c !== null && col > cell.y && inAcrossWord(cell.x, col)
      );
      if (emptyRowCellIndex >= 0) {
        setCurrentCell({ x: cell.x, y: emptyRowCellIndex });
        setDirection(direction);
        return;
      }
      // next clued cell in following rows
      for (let i = cell.x + 1; i < crossword.size; i += 1) {
        const row = i;
        const idx = solution[row].findIndex(
          (c, col) => c !== null && inAcrossWord(row, col)
        );
        if (idx >= 0) {
          setCurrentCell({ x: row, y: idx });
          setDirection(direction);
          return;
        }
      }
      if (allowLoop) {
        gotoNextCell({
          cell: { x: -1, y: 0 },
          direction: "Down",
          allowLoop: false,
        });
      }
    }
    if (direction === "Down") {
      // next clued cell in the current column
      const currentCol = cell.y;
      const colCells = solution.map((row) => row[currentCol]);
      const idx = colCells.findIndex(
        (c, index) =>
          c !== null && index > cell.x && inDownWord(index, currentCol)
      );
      if (idx >= 0) {
        setCurrentCell({ x: idx, y: currentCol });
        setDirection(direction);
        return;
      }
      // next clued cell in following columns
      const nextCol = currentCol + 1;
      if (nextCol <= crossword.size - 1) {
        for (let i = nextCol; i < crossword.size; i += 1) {
          const colCells2 = solution.map((row) => row[i]);
          const idx2 = colCells2.findIndex(
            (c, index) => c !== null && inDownWord(index, i)
          );
          if (idx2 >= 0) {
            setCurrentCell({ x: idx2, y: i });
            setDirection(direction);
            return;
          }
        }
      }
      if (allowLoop) {
        gotoNextCell({
          cell: { x: 0, y: -1 },
          direction: "Across",
          allowLoop: false,
        });
      }
    }
  };

  const handleKey = ({ x, y, key }: { x: number; y: number; key: string }) => {
    if (!isGameFinished) {
      if (solution[x][y] === "") {
        setSolution({ cell: { x, y }, value: key });
        gotoNextCell({ cell: currentCell, direction, allowLoop: true });
      } else {
        setSolution({ cell: { x, y }, value: key });
        gotoNextCell({ cell: currentCell, direction, allowLoop: true });
      }
    }
  };

  const toggleDirection = () => {
    if (direction === "Across") {
      setDirection("Down");
    } else {
      setDirection("Across");
    }
  };

  const jumpToClue = ({
    clue,
    direction,
  }: {
    clue: { number: string; clue: string };
    direction: "Down" | "Across";
  }) => {
    const x = crossword.puzzle.findIndex((row) =>
      row.includes(String(clue.number))
    );
    const y = crossword.puzzle[x].findIndex(
      (cell) => cell === String(clue.number)
    );
    setCurrentCell({ x, y });
    setDirection(direction);
  };

  if (__DEV__) {
    console.info(crossword.solution.map((row) => row.join(",")));
  }

  return (
    <CrosswordContext.Provider
      value={{
        crossword,
        currentCell,
        setCurrentCell,
        direction,
        setDirection,
        solution,
        setSolution,
        gameId: gameId,
      }}
    >
      <View
        className="flex-1"
        onLayout={(e) => {
          setContainerHeight(e.nativeEvent.layout.height);
        }}
      >
        <View className="items-center">
          <Animated.View style={crosswordContainerStyle}>
            <View className="py-2">
              {showResults ? null : (
                <>
                  {(game?.gameType === "FRIENDLY" ||
                    game?.gameType === "RANKED" ||
                    game?.gameType === "TOURNAMENT") && (
                    <FriendlyCrosswordHeader gameId={gameId as string} />
                  )}
                  {game?.gameType === "SOLO" && (
                    <SoloTimer startAt={game?.startedAt ?? game?.createdAt} />
                  )}
                </>
              )}
            </View>
            <View className="aspect-square border">
              {crossword.puzzle.map((puzzleRow, rowIndex) => {
                const rowKey = puzzleRow.join(",");
                return (
                  <View className="flex-1 flex-row" key={rowKey}>
                    {puzzleRow.map((puzzleCell, colIndex) => {
                      const colKey = rowKey + puzzleCell + String(colIndex);
                      return (
                        <View className="flex-1" key={colKey}>
                          <CrosswordCell
                            rowIndex={rowIndex}
                            colIndex={colIndex}
                            puzzleCell={puzzleCell}
                            value={
                              solution[rowIndex][colIndex] as string | null
                            }
                            handleBackspace={handleBackspace}
                            handleKey={handleKey}
                            toggleDirection={toggleDirection}
                            disabled={!!showResults || isGameFinished}
                          />
                          {showResults &&
                            solution[rowIndex][colIndex] !==
                              game.crossword?.solution[rowIndex][colIndex] && (
                              <View className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-700"></View>
                            )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
        <Animated.View
          className={showResults ? "mt-8 w-full" : "absolute bottom-0 w-full"}
          style={showResults ? {} : clueContainerStyle}
        >
          <CrosswordClue
            currentCell={currentCell}
            direction={direction}
            jumpToClue={jumpToClue}
            toggleDirection={toggleDirection}
          />
        </Animated.View>
      </View>
    </CrosswordContext.Provider>
  );
};

const useCrosswordContext = () => {
  const context = useContext(CrosswordContext);
  if (!context) {
    throw new Error("useCrosswordContext must be used within ContextProvider");
  }
  return context;
};

const CrosswordCell = ({
  rowIndex,
  colIndex,
  puzzleCell,
  value,
  handleBackspace,
  handleKey,
  toggleDirection,
  disabled,
}: {
  rowIndex: number;
  colIndex: number;
  puzzleCell: string | number | { cell: string | number };
  value: string | null;
  handleBackspace: ({ x, y }: { x: number; y: number }) => void;
  handleKey: ({ x, y, key }: { x: number; y: number; key: string }) => void;
  toggleDirection: () => void;
  disabled: boolean;
}) => {
  const { crossword, currentCell, setCurrentCell, direction } =
    useCrosswordContext();
  const { width } = useWindowDimensions();
  const textInputFontSize = width / (crossword.size * 2);
  const textInputRef = useRef<TextInput | null>(null);

  const { x: currentX, y: currentY } = currentCell;
  const isCurrentCell = rowIndex === currentX && colIndex === currentY;

  useEffect(() => {
    if (disabled && textInputRef.current) {
      textInputRef.current.blur();
    }
    if (!disabled && isCurrentCell && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [isCurrentCell, disabled]);

  if (puzzleCell === "#") {
    return <View className="border-0.5 flex-1 bg-black" />;
  }

  const getBackgroundColor = () => {
    if (isCurrentCell) {
      return "bg-blue-600";
    }
    if (direction === "Across" && currentX === rowIndex) {
      const leftMark = Math.min(colIndex, currentY);
      const rightMark = Math.max(colIndex, currentY);
      const hasBreak = crossword.puzzle[rowIndex].find((cell, index) => {
        if (leftMark < index && index < rightMark && cell === "#") {
          return true;
        }
      });
      return hasBreak ? "bg-white" : "bg-crossed-blue-100";
    }
    if (direction === "Down" && currentY === colIndex) {
      const currentCol = crossword.puzzle.map((row) => row[currentY]);
      const topMark = Math.min(rowIndex, currentX);
      const bottomMark = Math.max(rowIndex, currentX);
      const hasBreak = currentCol.find((cell, index) => {
        if (topMark < index && index < bottomMark && cell === "#") {
          return true;
        }
      });
      return hasBreak ? "bg-white" : "bg-crossed-blue-100";
    }
    return "bg-white";
  };

  return (
    <View className={`border-0.5 flex-1 ${getBackgroundColor()}`}>
      {typeof puzzleCell === "object" ? (
        <>
          {puzzleCell.cell && puzzleCell.cell !== "0" && (
            <Text className="absolute left-0.5 top-0.5 text-xs">
              {puzzleCell.cell}
            </Text>
          )}
        </>
      ) : (
        puzzleCell !== "0" && (
          <Text className="absolute left-0.5 top-0.5 text-xs">
            {puzzleCell}
          </Text>
        )
      )}
      <View className="relative flex-1">
        <TextInput
          ref={textInputRef}
          value={value || ""}
          onPressIn={() => {
            if (isCurrentCell) {
              toggleDirection();
            } else {
              setCurrentCell({ x: rowIndex, y: colIndex });
            }
          }}
          className="h-full w-full font-semibold"
          maxLength={1}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="characters"
          caretHidden={true}
          contextMenuHidden={true}
          inputMode="text"
          keyboardType="ascii-capable"
          textAlign="center"
          pointerEvents="box-only"
          // Hide the field's own text: the native input briefly shows the raw
          // (lowercase) keystroke before React re-renders the controlled value,
          // which caused a "lowercase flash". The letter is drawn by the overlay
          // Text below instead, so only the committed uppercase value is visible.
          style={{ fontSize: textInputFontSize, color: "transparent" }}
          selectTextOnFocus={false}
          onKeyPress={(e) => {
            const regex = /^(?:[a-zA-Z]|Backspace)$/;
            const key = e.nativeEvent.key;
            if (regex.test(key)) {
              const isBackspace = /^(?:Backspace)$/.test(key);
              if (isBackspace) {
                handleBackspace({ x: rowIndex, y: colIndex });
              } else {
                handleKey({ x: rowIndex, y: colIndex, key: key.toUpperCase() });
              }
            }
          }}
          blurOnSubmit={disabled}
          enabled={!disabled}
          editable={!disabled}
          showSoftInputOnFocus={!disabled}
        />
        {/* The visible letter — always the committed uppercase value, so there's
            no lowercase flash from the native input while typing. */}
        {!!value && (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
          >
            <Text
              className="font-semibold"
              style={{ fontSize: textInputFontSize }}
            >
              {value}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const CrosswordClue = ({
  currentCell,
  direction,
  jumpToClue,
  toggleDirection,
}: {
  currentCell: { x: number; y: number };
  direction: "Across" | "Down";
  jumpToClue: ({
    clue,
    direction,
  }: {
    clue: { number: string; clue: string };
    direction: "Across" | "Down";
  }) => void;
  toggleDirection: () => void;
}) => {
  const { crossword } = useCrosswordContext();
  const { x: currentX, y: currentY } = currentCell;
  const currentRow = crossword.puzzle[currentX];
  const currentCol = crossword.puzzle.map((row) => row[currentY]);
  const puzzleCell = currentRow[currentY];

  const getCurrentClue = () => {
    const clue = crossword.clues[direction].find(
      (x) => String(x.number) === String(puzzleCell)
    );
    if (clue) {
      return clue;
    } else {
      if (direction === "Across") {
        const prevBlackCellsInRow = currentRow.reduce(
          (prev, currentValue, currentIndex) => {
            if (currentValue === "#" && currentIndex < currentY) {
              return [...prev, currentIndex];
            }
            return prev;
          },
          [] as number[]
        );
        // assume clue is in the first cell
        let clueCellColIndex = 0;
        if (prevBlackCellsInRow.length) {
          // clue is in the cell immediately after prev black cell
          clueCellColIndex =
            prevBlackCellsInRow[prevBlackCellsInRow.length - 1] + 1;
        }
        const clueCell = crossword.puzzle[currentX][clueCellColIndex];
        const clue = crossword.clues[direction].find(
          (x) => String(x.number) === String(clueCell)
        );
        if (clue) {
          return clue;
        }
      }
    }
    if (direction === "Down") {
      const prevBlackCellsInCol = currentCol.reduce(
        (prev, currentValue, currentIndex) => {
          if (currentValue === "#" && currentIndex < currentX) {
            return [...prev, currentIndex];
          }
          return prev;
        },
        [] as number[]
      );
      // assume clue is in the first cell
      let clueCellRowIndex = 0;
      if (prevBlackCellsInCol.length) {
        // clue is in the cell immediately after prev black cell
        clueCellRowIndex =
          prevBlackCellsInCol[prevBlackCellsInCol.length - 1] + 1;
      }
      const clueCell = crossword.puzzle[clueCellRowIndex][currentY];
      const clue = crossword.clues[direction].find(
        (x) => String(x.number) === String(clueCell)
      );
      if (clue) {
        return clue;
      }
    }
  };

  const currentClue = getCurrentClue();

  // One flat, ordered list of every clue (Across then Down) so the arrows can
  // always step to the next/previous one — even when the current cell has no
  // clue in the active direction (a one-way cell), where currentClue is
  // undefined and the arrows used to get stuck.
  const orderedClues: {
    clue: { number: string; clue: string };
    direction: "Across" | "Down";
  }[] = [
    ...crossword.clues.Across.map((clue) => ({
      clue,
      direction: "Across" as const,
    })),
    ...crossword.clues.Down.map((clue) => ({
      clue,
      direction: "Down" as const,
    })),
  ];

  const currentOrderedIndex = currentClue
    ? orderedClues.findIndex(
        (o) => o.direction === direction && o.clue === currentClue
      )
    : -1;

  const gotoPrevClue = () => {
    if (!orderedClues.length) return;
    // -1 (no current clue) wraps to the last clue; 0 wraps to the last too.
    const prevIndex =
      currentOrderedIndex <= 0
        ? orderedClues.length - 1
        : currentOrderedIndex - 1;
    const prev = orderedClues[prevIndex];
    jumpToClue({ clue: prev.clue, direction: prev.direction });
  };
  const gotoNextClue = () => {
    if (!orderedClues.length) return;
    // -1 (no current clue) -> 0, the first clue; otherwise step forward + wrap.
    const next =
      orderedClues[(currentOrderedIndex + 1) % orderedClues.length];
    jumpToClue({ clue: next.clue, direction: next.direction });
  };

  return (
    <View className="h-[53] w-full items-center justify-center bg-crossed-yellow-300 px-10">
      <View className="absolute inset-y-0 left-0 items-center justify-center">
        <TouchableOpacity
          onPress={gotoPrevClue}
          className="h-full w-10 items-center justify-center "
        >
          <Image source={images.arrow_left} className="h-3.5 w-2" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity className="flex-row" onPress={toggleDirection}>
        <Text
          allowFontScaling={false}
          className="font-[jost500] text-base whitespace-normal"
        >
          {currentClue?.clue.trim().replace(/(\r\n|\n|\r)/gm, " ")}
        </Text>
      </TouchableOpacity>
      <View className="absolute inset-y-0 right-0 items-center justify-center">
        <TouchableOpacity
          onPress={gotoNextClue}
          className="h-full w-10 items-center justify-center"
        >
          <Image source={images.arrow_right} className="h-3.5 w-2" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
