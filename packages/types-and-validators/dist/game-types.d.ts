import { Crossword } from "./crosswod-types";
import { Database } from "./supabase-types";
export type GameDifficulty = "REGULAR" | "HARD";
export type GameRow = Database["public"]["Tables"]["games"]["Row"];
export type SudokuRow = Database["public"]["Tables"]["sudokus"]["Row"];
export type Sudoku = Omit<SudokuRow, "puzzle" | "solution"> & {
    puzzle: number[][];
    solution: number[][];
};
export type Game = Omit<GameRow, "gameState"> & {
    gameState: Record<string, GameState>;
    players: Database["public"]["Tables"]["profiles"]["Row"][];
    scores: Database["public"]["Tables"]["gamePlayers"]["Row"][];
    crossword?: Crossword;
    sudoku?: Sudoku;
};
export type GameState = {
    currentCell: {
        x: number;
        y: number;
    };
    direction: "Across" | "Down";
    solution: (string | number | null)[][];
};
//# sourceMappingURL=game-types.d.ts.map