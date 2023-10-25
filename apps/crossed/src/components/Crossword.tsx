import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import produce from "immer";
import { useGame } from "../hooks/use-game";
import { TextInput, TouchableOpacity } from "react-native-gesture-handler";
import { FriendlyCrosswordHeader } from "./FriendlyCrosswordHeader";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { Crossword, GameState } from "types-and-validators";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";

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
}: {
  gameId: string;
  showResults?: {
    playerId?: string;
  };
}) => {
  const { myProfile } = useMyProfile();
  const { finishGame, game } = useGame({ gameId });
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

  useEffect(() => {
    // initialize gameState
    if (game && crossword && myProfile && !gameState) {
      const playerGameState = game.gameState?.[myProfile.id];
      if (playerGameState) {
        setGameState(playerGameState);
        return;
      }
      const initalSolutionState = crossword.puzzle.map((row) => {
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
        solution: initalSolutionState,
      });
    }
  }, [crossword, game, gameState, myProfile]);

  useEffect(() => {
    // update game state if showResults
    if (showResults && game && crossword) {
      const solutionToDisplay = showResults.playerId
        ? game.gameState?.[showResults.playerId].solution
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
    // write gameState to database
    if (game && gameState && myProfile) {
      if (!isGameFinished) {
        supabase
          .from("games")
          .update({
            gameState: game.gameState
              ? {
                  ...game.gameState,
                  [myProfile.id]: gameState,
                }
              : { [myProfile.id]: gameState },
          })
          .eq("id", gameId)
          .then(() => {
            const hasEmptyCell = gameState.solution.find((row) =>
              row.includes("")
            );
            if (!hasEmptyCell) {
              const isCorrectSolution =
                JSON.stringify(gameState.solution) ===
                JSON.stringify(game.crossword.solution);
              if (isCorrectSolution) {
                finishGame();
              }
            }
          });
      }
    }
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
    if (direction === "Across") {
      // find non black cell in current row
      const emptyRowCellIndex = solution[cell.x].findIndex(
        (c, col) => c !== null && col > cell.y
      );
      if (emptyRowCellIndex >= 0) {
        setCurrentCell({ x: cell.x, y: emptyRowCellIndex });
        setDirection(direction);
        return;
      }
      // find non black cell in following rows
      for (let i = cell.x + 1; i < crossword.size; i += 1) {
        const row = i;
        const emptyRowCellIndex = solution[row].findIndex(
          (cell) => cell !== null
        );
        if (emptyRowCellIndex >= 0) {
          setCurrentCell({ x: row, y: emptyRowCellIndex });
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
      // find non black in current col
      const currentCol = cell.y;
      const solutionCellsInCurrentCol = solution.map((row) => row[currentCol]);
      const emptyRowIndexInCurrentCol = solutionCellsInCurrentCol.findIndex(
        (c, index) => c !== null && index > cell.x
      );
      if (emptyRowIndexInCurrentCol >= 0) {
        setCurrentCell({ x: emptyRowIndexInCurrentCol, y: currentCol });
        setDirection(direction);
        return;
      }

      // find non black cells in following columns
      const nextCol = currentCol + 1;
      if (nextCol <= crossword.size - 1) {
        for (let i = nextCol; i < crossword.size; i += 1) {
          const currentCol = i;
          const solutionCellsInCurrentCol = solution.map(
            (row) => row[currentCol]
          );
          const emptyRowIndexInCurrentCol = solutionCellsInCurrentCol.findIndex(
            (c) => c !== null
          );
          if (emptyRowIndexInCurrentCol >= 0) {
            setCurrentCell({ x: emptyRowIndexInCurrentCol, y: i });
            setDirection(direction);
            return;
          }
        }
      }
      // change direction and start from first cell
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
            <View className="py-3">
              {showResults ? null : (
                <>
                  {(game?.gameType === "FRIENDLY" ||
                    game?.gameType === "RANKED") && (
                    <FriendlyCrosswordHeader gameId={gameId as string} />
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
                            value={solution[rowIndex][colIndex]}
                            handleBackspace={handleBackspace}
                            handleKey={handleKey}
                            toggleDirection={toggleDirection}
                            disabled={!!showResults || isGameFinished}
                          />
                          {showResults &&
                            solution[rowIndex][colIndex] !==
                              game.crossword.solution[rowIndex][colIndex] && (
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
          style={{ fontSize: textInputFontSize }}
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
        {/* {disabled && <View className="absolute inset-0 h-full w-full" />} */}
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

  const gotoPrevClue = () => {
    if (currentClue) {
      const currentClueIndex = crossword.clues[direction].indexOf(currentClue);
      if (currentClueIndex > 0) {
        const prevClue = crossword.clues[direction][currentClueIndex - 1];
        jumpToClue({ clue: prevClue, direction });
      } else {
        if (direction === "Across") {
          const downClues = crossword.clues["Down"];
          const prevClue = downClues[downClues.length - 1];
          jumpToClue({ clue: prevClue, direction: "Down" });
        }
        if (direction === "Down") {
          const acrossClues = crossword.clues["Across"];
          const prevClue = acrossClues[acrossClues.length - 1];
          jumpToClue({ clue: prevClue, direction: "Across" });
        }
      }
    }
  };
  const gotoNextClue = () => {
    if (currentClue) {
      const currentClueIndex = crossword.clues[direction].indexOf(currentClue);
      if (currentClueIndex < crossword.clues[direction].length - 1) {
        const nextClue = crossword.clues[direction][currentClueIndex + 1];
        jumpToClue({ clue: nextClue, direction });
      } else {
        if (direction === "Across") {
          const downClues = crossword.clues["Down"];
          const nextClue = downClues[0];
          jumpToClue({ clue: nextClue, direction: "Down" });
        }
        if (direction === "Down") {
          const acrossClues = crossword.clues["Across"];
          const nextClue = acrossClues[0];
          jumpToClue({ clue: nextClue, direction: "Across" });
        }
      }
    }
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
        <Text className="font-[jost500] text-base whitespace-normal">
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
