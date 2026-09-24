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
export declare const WS_DIR: {
    readonly RIGHT: {
        readonly dr: 0;
        readonly dc: 1;
    };
    readonly DOWN: {
        readonly dr: 1;
        readonly dc: 0;
    };
    readonly LEFT: {
        readonly dr: 0;
        readonly dc: -1;
    };
    readonly UP: {
        readonly dr: -1;
        readonly dc: 0;
    };
    readonly DOWN_RIGHT: {
        readonly dr: 1;
        readonly dc: 1;
    };
    readonly DOWN_LEFT: {
        readonly dr: 1;
        readonly dc: -1;
    };
    readonly UP_RIGHT: {
        readonly dr: -1;
        readonly dc: 1;
    };
    readonly UP_LEFT: {
        readonly dr: -1;
        readonly dc: -1;
    };
};
export type WordSearchConfig = {
    size: number;
    count: number;
    dirs: {
        dr: number;
        dc: number;
    }[];
};
export declare const generateWordSearchFrom: (config: WordSearchConfig, seed: number, themeName?: string, excludeThemes?: string[], excludeWords?: string[]) => WordSearchPuzzle;
export declare const generateWordSearch: (difficulty: "REGULAR" | "HARD", seed: number, themeName?: string, excludeThemes?: string[], excludeWords?: string[]) => WordSearchPuzzle;
export declare const matchSelection: (puzzle: WordSearchPuzzle, selection: Cell[]) => string | null;
export declare const wordSearchProgress: (puzzle: WordSearchPuzzle | null | undefined, found: string[] | null | undefined) => number;
//# sourceMappingURL=word-search.d.ts.map