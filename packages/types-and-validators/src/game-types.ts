import { Crossword } from "./crosswod-types";
import { Database } from "./supabase-types";

export type GameDifficulty = "REGULAR" | "HARD";

export type GameRow = Database["public"]["Tables"]["games"]["Row"];

// A sudoku puzzle. Stored as 9x9 int grids (0 = blank in `puzzle`).
export type SudokuRow = Database["public"]["Tables"]["sudokus"]["Row"];
export type Sudoku = Omit<SudokuRow, "puzzle" | "solution"> & {
  puzzle: number[][];
  solution: number[][];
};

export type Game = Omit<GameRow, "gameState"> & {
  gameState: Record<string, GameState>;
  players: Database["public"]["Tables"]["profiles"]["Row"][];
  scores: Database["public"]["Tables"]["gamePlayers"]["Row"][];
  // A game is either a crossword or a sudoku, per `gameVariant`.
  crossword?: Crossword;
  sudoku?: Sudoku;
};

export type GameState = {
  currentCell: { x: number; y: number };
  direction: "Across" | "Down";
  // Crossword cells are single letters; sudoku cells are 1-9. null = blank.
  solution: (string | number | null)[][];
};
