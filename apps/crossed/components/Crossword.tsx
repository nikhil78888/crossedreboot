import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import produce from "immer";
import { Game, GameState, TCrossword } from "../types";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { gamesCollection } from "../firebase-collection";
import { useGame } from "../hooks/use-game";

type CrosswordContextType = {
  crossword: TCrossword;
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
};

const CrosswordContext = createContext<CrosswordContextType>(null!);

export const CrosswordProvider = ({
  currentGame,
  currentGameId,
  currentUser,
}: {
  currentGame: Game;
  currentGameId: string;
  currentUser: FirebaseAuthTypes.User;
}) => {
  const { crossword } = currentGame;
  const playerGameState = currentGame.game_state?.[currentUser.uid];
  const [gameState, setGameState] = useState<GameState>(() => {
    if (playerGameState) {
      return playerGameState;
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
    return {
      currentCell: { x: 0, y: 0 },
      direction: "Across",
      solution: initalSolutionState,
    };
  });

  const setCurrentCell = (cell: GameState["currentCell"]) => {
    setGameState(
      produce((draft) => {
        draft.currentCell = cell;
      })
    );
  };

  const setDirection = (newDirection: GameState["direction"]) => {
    setGameState(
      produce((draft) => {
        draft.direction = newDirection;
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
        draft.solution[cell.x][cell.y] = value;
      })
    );
  };

  useEffect(() => {
    // write gameState to database
    gamesCollection.doc(currentGameId).update({
      [`game_state.${currentUser.uid}`]: {
        ...gameState,
        solution: JSON.stringify(gameState.solution),
      },
    });
  }, [currentGameId, currentUser.uid, gameState]);

  return (
    <CrosswordContext.Provider
      value={{
        crossword,
        currentCell: gameState.currentCell,
        setCurrentCell,
        direction: gameState.direction,
        setDirection,
        solution: gameState.solution,
        setSolution,
        gameId: currentGameId,
      }}
    >
      <Crossword />
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

const Crossword = () => {
  const {
    crossword,
    currentCell,
    setCurrentCell,
    direction,
    setDirection,
    solution,
    setSolution,
    gameId,
  } = useCrosswordContext();
  const { width } = useWindowDimensions();
  const [isPlayingAfterFilled, setPlayingAfterFilled] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { finishGame, game } = useGame({
    gameId,
  });

  const isGameFinished = game?.play_state === "COMPLETED";

  useEffect(() => {
    if (isGameFinished) {
      setShowResult(true);
    }
  }, [isGameFinished]);

  useEffect(() => {
    const hasEmptyCell = solution.find((row) => row.includes(""));
    if (!hasEmptyCell) {
      const isCorrectSolution =
        JSON.stringify(solution) === JSON.stringify(crossword.solution);
      if (!isCorrectSolution) {
        if (!isPlayingAfterFilled) {
          Alert.alert(
            "So close ...",
            "The puzzle is filled, but at least one square's amiss.",
            [{ text: "Keep Trying" }]
          );
          setPlayingAfterFilled(true);
        }
      } else {
        if (!isGameFinished) {
          finishGame();
        }
      }
    }
  }, [
    crossword.solution,
    gameId,
    isPlayingAfterFilled,
    isGameFinished,
    solution,
    finishGame,
  ]);

  const gotoPrevCell = ({
    cell,
    direction,
  }: {
    cell: { x: number; y: number };
    direction: "Across" | "Down";
  }) => {
    if (direction === "Across") {
      // go back in same row
      for (let i = cell.y - 1; i >= 0; i = i - 1) {
        if (solution[cell.x][i] !== "#") {
          setCurrentCell({ x: cell.x, y: i });
          setDirection(direction);
          return;
        }
      }
      // go back in prev row
      const prevRow = cell.x - 1;
      if (prevRow >= 0) {
        for (let i = crossword.dimensions.width - 1; i >= 0; i = i - 1) {
          if (solution[prevRow][i] !== "#") {
            setCurrentCell({ x: prevRow, y: i });
            setDirection(direction);
            return;
          }
        }
      } else {
        // switch direction and start search from last cell
        gotoPrevCell({
          cell: {
            x: crossword.dimensions.height - 1,
            y: crossword.dimensions.width - 1,
          },
          direction: "Down",
        });
      }
    }
    if (direction === "Down") {
      // go back in same col
      for (let i = cell.x - 1; i >= 0; i = i - 1) {
        if (solution[i][cell.y] !== "#") {
          setCurrentCell({ x: i, y: cell.y });
          setDirection(direction);
          return;
        }
      }
      // go back in prev col
      const prevCol = cell.y - 1;
      if (prevCol >= 0) {
        for (let i = crossword.dimensions.height - 1; i >= 0; i = i - 1) {
          if (solution[i][prevCol] !== "#") {
            setCurrentCell({ x: i, y: prevCol });
            setDirection(direction);
            return;
          }
        }
      } else {
        // switch direction and start from last cell
        gotoPrevCell({
          cell: {
            x: crossword.dimensions.height - 1,
            y: crossword.dimensions.width - 1,
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
      gotoPrevCell({ cell: currentCell, direction });
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
      // find empty cell in current row
      const emptyRowCellIndex = solution[cell.x].findIndex(
        (c, col) => c === "" && col > cell.y
      );
      if (emptyRowCellIndex > 0) {
        setCurrentCell({ x: cell.x, y: emptyRowCellIndex });
        setDirection(direction);
        return;
      }
      // find empty cell in following rows
      for (let i = cell.x + 1; i < crossword.dimensions.height; i += 1) {
        const row = i;
        const emptyRowCellIndex = solution[row].findIndex(
          (cell) => cell === ""
        );
        if (emptyRowCellIndex >= 0) {
          setCurrentCell({ x: row, y: emptyRowCellIndex });
          setDirection(direction);
          return;
        }
      }
      if (allowLoop) {
        gotoNextCell({
          cell: { x: 0, y: 0 },
          direction: "Down",
          allowLoop: false,
        });
      }
    }
    if (direction === "Down") {
      // find empty cell in current col
      const currentCol = cell.y;
      const solutionCellsInCurrentCol = solution.map((row) => row[currentCol]);
      const emptyRowIndexInCurrentCol = solutionCellsInCurrentCol.findIndex(
        (c, index) => c === "" && index > cell.x
      );
      if (emptyRowIndexInCurrentCol >= 0) {
        setCurrentCell({ x: emptyRowIndexInCurrentCol, y: currentCol });
        setDirection(direction);
        return;
      }

      // find empty cells in following columns
      const nextCol = currentCol + 1;
      if (nextCol <= crossword.dimensions.width - 1) {
        for (let i = nextCol; i < crossword.dimensions.width; i += 1) {
          const currentCol = i;
          const solutionCellsInCurrentCol = solution.map(
            (row) => row[currentCol]
          );
          const emptyRowIndexInCurrentCol = solutionCellsInCurrentCol.findIndex(
            (c) => c === ""
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
          cell: { x: 0, y: 0 },
          direction: "Across",
          allowLoop: false,
        });
      }
    }
  };

  const handleKey = ({ x, y, key }: { x: number; y: number; key: string }) => {
    setSolution({ cell: { x, y }, value: key });
    gotoNextCell({ cell: currentCell, direction, allowLoop: true });
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
    const x = crossword.puzzle.findIndex((row) => row.includes(clue.number));
    const y = crossword.puzzle[x].findIndex((cell) => cell === clue.number);
    setCurrentCell({ x, y });
    setDirection(direction);
  };

  return (
    <View className="flex-1">
      <View className="flex-1">
        <View className="border" style={{ width, height: width }}>
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
                        showResult={showResult}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
      <CrosswordClue
        currentCell={currentCell}
        direction={direction}
        jumpToClue={jumpToClue}
      />
    </View>
  );
};

const CrosswordCell = ({
  rowIndex,
  colIndex,
  puzzleCell,
  value,
  handleBackspace,
  handleKey,
  toggleDirection,
  showResult,
}: {
  rowIndex: number;
  colIndex: number;
  puzzleCell: string | number;
  value: string | null;
  handleBackspace: ({ x, y }: { x: number; y: number }) => void;
  handleKey: ({ x, y, key }: { x: number; y: number; key: string }) => void;
  toggleDirection: () => void;
  showResult: boolean;
}) => {
  const { crossword, currentCell, setCurrentCell, direction } =
    useCrosswordContext();
  const { width } = useWindowDimensions();
  const textInputFontSize = width / (crossword.dimensions.height * 2);
  const textInputRef = useRef<TextInput | null>(null);

  const { x: currentX, y: currentY } = currentCell;
  const isCurrentCell = rowIndex === currentX && colIndex === currentY;

  useEffect(() => {
    if (showResult && textInputRef.current) {
      textInputRef.current.blur();
    }
    if (!showResult && isCurrentCell && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [isCurrentCell, showResult]);

  if (puzzleCell === "#") {
    return <View className="flex-1 border-0.5 bg-black" />;
  }

  const getBackgroundColor = () => {
    if (isCurrentCell) {
      return "bg-yellow-300";
    }
    if (direction === "Across" && currentX === rowIndex) {
      const leftMark = Math.min(colIndex, currentY);
      const rightMark = Math.max(colIndex, currentY);
      const hasBreak = crossword.puzzle[rowIndex].find((cell, index) => {
        if (leftMark < index && index < rightMark && cell === "#") {
          return true;
        }
      });
      return hasBreak ? "bg-white" : "bg-blue-300";
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
      return hasBreak ? "bg-white" : "bg-blue-300";
    }
    return "bg-white";
  };

  return (
    <View className={`flex-1 border-0.5 ${getBackgroundColor()}`}>
      {puzzleCell !== "0" && (
        <Text className="absolute left-0.5 top-0.5 text-xs">{puzzleCell}</Text>
      )}
      <View className="flex-1">
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
          className="h-full w-full"
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
          blurOnSubmit={showResult}
        />
      </View>
    </View>
  );
};

const CrosswordClue = ({
  currentCell,
  direction,
  jumpToClue,
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
}) => {
  const { crossword } = useCrosswordContext();
  const keyboard = useAnimatedKeyboard();
  const translateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboard.height.value }],
    };
  });
  const { x: currentX, y: currentY } = currentCell;
  const currentRow = crossword.puzzle[currentX];
  const currentCol = crossword.puzzle.map((row) => row[currentY]);
  const puzzleCell = currentRow[currentY];

  const getCurrentClue = () => {
    const clue = crossword.clues[direction].find(
      (x) => x.number === puzzleCell
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
          (x) => x.number === clueCell
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
        (x) => x.number === clueCell
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
    <Animated.View
      className="h-12 bg-blue-300 px-10 justify-center"
      style={translateStyle}
    >
      <View className="absolute left-0 inset-y-0 items-center justify-center w-10">
        <TouchableOpacity onPress={gotoPrevClue}>
          <Text>{"<"}</Text>
        </TouchableOpacity>
      </View>
      <Text>{currentClue?.clue}</Text>
      <View className="absolute right-0 inset-y-0 items-center justify-center w-10">
        <TouchableOpacity onPress={gotoNextClue}>
          <Text>{">"}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};
