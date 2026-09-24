export type WordsyPuzzle = {
    answer: string;
    length: number;
    maxGuesses: number;
};
export declare const generateWordsy: (config: {
    length: number;
    maxGuesses: number;
}, seed: number, avoid?: string[]) => WordsyPuzzle;
export declare const scoreWordsyGuess: (guess: string, answer: string) => number[];
export type CategoryGroup = {
    category: string;
    words: string[];
};
export type CategoriesPuzzle = {
    id?: string;
    groups: CategoryGroup[];
    tiles: string[];
    mistakes: number;
};
export declare const generateCategories: (config: {
    mistakes: number;
    trickiness: number;
}, seed: number, avoidIds?: string[]) => CategoriesPuzzle;
export declare const CATEGORIES_PUZZLE_IDS: string[];
//# sourceMappingURL=story-games.d.ts.map