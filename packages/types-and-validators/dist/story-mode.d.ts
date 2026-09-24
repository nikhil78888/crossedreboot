import { WordSearchConfig, WordSearchPuzzle } from "./word-search";
export declare const STORY_MAX_LEVEL = 200;
export type StoryVariant = "CROSSWORD" | "WORD_SEARCH" | "WORDSY" | "CATEGORIES";
export declare const STORY_VARIANTS: StoryVariant[];
export type StoryLevel = {
    level: number;
    variant: StoryVariant;
    seconds: number;
    boss: string;
    avatar: string;
    isBoss: boolean;
    ws?: WordSearchConfig;
    crosswordOffset?: number;
    wordsy?: {
        length: number;
        maxGuesses: number;
    };
    categories?: {
        mistakes: number;
        trickiness: number;
    };
};
export declare const STORY_PUBLISHED_5X5 = 384;
export declare const HARD_LEVEL = 100;
export declare const bossAvatar: (level: number) => string;
export declare const bossNameFor: (level: number) => string;
export type RacePhase = "start" | "mid" | "late" | "clinch";
export declare const racePhaseFor: (opponentProgress: number) => RacePhase;
export declare const bossTaunt: (level: number, opponentProgress: number) => string;
export declare const wordsyConfigFor: (level: number) => {
    length: number;
    maxGuesses: number;
};
export declare const categoriesConfigFor: (level: number) => {
    mistakes: number;
    trickiness: number;
};
export declare const storyGenerosity: (level: number) => number;
export declare const estimateWordSearchSolve: (puzzle: WordSearchPuzzle) => number;
export declare const storyTargetSolve: (level: number) => number;
export declare const wordSearchSecondsFor: (level: number, puzzleEstimate: number) => number;
export declare const storyDifficultyBand = 0.12;
export declare const isOnDifficulty: (level: number, puzzleEstimate: number) => boolean;
export declare const storyLevel: (level: number) => StoryLevel;
//# sourceMappingURL=story-mode.d.ts.map