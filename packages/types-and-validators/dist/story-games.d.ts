export type WordsyPuzzle = {
    answer: string;
    length: number;
    maxGuesses: number;
};
export declare const generateWordsy: (config: {
    length: number;
    maxGuesses: number;
}, seed: number) => WordsyPuzzle;
export declare const scoreWordsyGuess: (guess: string, answer: string) => number[];
export type CategoryGroup = {
    category: string;
    words: string[];
};
export type CategoriesPuzzle = {
    groups: CategoryGroup[];
    tiles: string[];
    mistakes: number;
};
export declare const generateCategories: (config: {
    mistakes: number;
    trickiness: number;
}, seed: number) => CategoriesPuzzle;
//# sourceMappingURL=story-games.d.ts.map