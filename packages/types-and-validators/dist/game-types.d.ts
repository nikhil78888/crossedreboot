import { Crossword } from "./crosswod-types";
import { Database } from "./supabase-types";
export type GameRow = Database["public"]["Tables"]["games"]["Row"];
export type Game = Omit<GameRow, "gameState"> & {
    gameState: Record<string, GameState>;
    players: Database["public"]["Tables"]["profiles"]["Row"][];
    scores: Database["public"]["Tables"]["gamePlayers"]["Row"][];
    crossword: Crossword;
};
export type GameState = {
    currentCell: {
        x: number;
        y: number;
    };
    direction: "Across" | "Down";
    solution: (string | null)[][];
};
//# sourceMappingURL=game-types.d.ts.map