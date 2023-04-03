import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { crossword } from "./crossword-formats/sample";
import produce from "immer";

export const Crossword = () => {
  const [currentCell, setCurrentCell] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState<"Across" | "Down">("Across");
  const { top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [solution, setSolution] = useState<("#" | string)[][]>(() => {
    const initalSolutionState = crossword.puzzle.map((row) => {
      const emptyRow = row.map((cell) => {
        if (cell !== "#") {
          return "";
        } else {
          return cell;
        }
      });
      return emptyRow;
    });
    return initalSolutionState;
  });

  console.log(solution);

  const handleBackspace = ({ x, y }: { x: number; y: number }) => {
    setSolution(
      produce((draft) => {
        draft[x][y] = "";
      })
    );
  };

  const handleKey = ({ x, y, key }: { x: number; y: number; key: string }) => {
    setSolution(
      produce((draft) => {
        draft[x][y] = key;
      })
    );
  };

  const toggleDirection = () => {
    if (direction === "Across") {
      setDirection("Down");
    } else {
      setDirection("Across");
    }
  };

  return (
    <View className="flex-1" style={{ paddingTop: top }}>
      <View className="h-12 bg-green-200 items-center justify-center">
        <TouchableOpacity onPress={toggleDirection}>
          <Text>{direction === "Across" ? "Play Down" : "Play Across"}</Text>
        </TouchableOpacity>
      </View>
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
                        currentCell={currentCell}
                        setCurrentCell={setCurrentCell}
                        direction={direction}
                        value={solution[rowIndex][colIndex]}
                        handleBackspace={handleBackspace}
                        handleKey={handleKey}
                        toggleDirection={toggleDirection}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
      <CrosswordClue currentCell={currentCell} direction={direction} />
    </View>
  );
};

const CrosswordCell = ({
  rowIndex,
  colIndex,
  puzzleCell,
  currentCell,
  setCurrentCell,
  direction,
  value,
  handleBackspace,
  handleKey,
  toggleDirection,
}: {
  rowIndex: number;
  colIndex: number;
  puzzleCell: string | number;
  currentCell: { x: number; y: number };
  setCurrentCell: ({ x, y }: { x: number; y: number }) => void;
  direction: "Across" | "Down";
  value: "#" | string;
  handleBackspace: ({ x, y }: { x: number; y: number }) => void;
  handleKey: ({ x, y, key }: { x: number; y: number; key: string }) => void;
  toggleDirection: () => void;
}) => {
  const { width } = useWindowDimensions();
  const textInputFontSize = width / (crossword.dimensions.height * 2);
  if (puzzleCell === "#") {
    return <View className="flex-1 border-0.5 bg-black" />;
  }
  const { x: currentX, y: currentY } = currentCell;

  const isCurrentCell = rowIndex === currentX && colIndex === currentY;

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
      <Text className="absolute left-0.5 top-0.5 text-xs">{puzzleCell}</Text>
      <View className="flex-1">
        <TextInput
          value={value}
          onPressIn={() => {
            if (isCurrentCell) {
              toggleDirection();
            } else {
              setCurrentCell({ x: rowIndex, y: colIndex });
            }
          }}
          autoFocus={isCurrentCell}
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
          blurOnSubmit={false}
        />
      </View>
    </View>
  );
};

const CrosswordClue = ({
  currentCell,
  direction,
}: {
  currentCell: { x: number; y: number };
  direction: "Across" | "Down";
}) => {
  const keyboard = useAnimatedKeyboard();
  const translateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboard.height.value }],
    };
  });
  console.log(keyboard.height.value);
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
      const prevClue = crossword.clues[direction][currentClueIndex - 1];
      console.log(prevClue);
    }
  };
  const gotoNextClue = () => {
    if (currentClue) {
      const currentClueIndex = crossword.clues[direction].indexOf(currentClue);
      const nextClue = crossword.clues[direction][currentClueIndex + 1];
      console.log(nextClue);
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
