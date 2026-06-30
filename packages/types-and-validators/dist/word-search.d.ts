export type Cell = {
    r: number;
    c: number;
};
export type Placement = {
    word: string;
    cells: Cell[];
};
export type WordSearchPuzzle = {
    size: number;
    grid: string[][];
    words: string[];
    placements: Placement[];
    theme: string;
};
export declare const wordSearchConfig: (difficulty: "REGULAR" | "HARD") => {
    size: number;
    count: number;
    dirs: {
        dr: number;
        dc: number;
    }[];
};
export declare const generateWordSearch: (difficulty: "REGULAR" | "HARD", seed: number, themeName?: string) => WordSearchPuzzle;
export declare const matchSelection: (puzzle: WordSearchPuzzle, selection: Cell[]) => string | null;
export declare const wordSearchProgress: (puzzle: WordSearchPuzzle | null | undefined, found: string[] | null | undefined) => number;
//# sourceMappingURL=word-search.d.ts.map