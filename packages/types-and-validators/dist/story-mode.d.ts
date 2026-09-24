import { WordSearchConfig, WordSearchPuzzle } from "./word-search";
export declare const STORY_MAX_LEVEL = 200;
export type StoryVariant = "CROSSWORD" | "WORD_SEARCH";
export type StoryLevel = {
    level: number;
    variant: StoryVariant;
    seconds: number;
    boss: string;
    avatar: string;
    isBoss: boolean;
    ws?: WordSearchConfig;
    crosswordOffset?: number;
};
export declare const STORY_PUBLISHED_5X5 = 384;
export declare const bossAvatar: (level: number) => string;
export declare const storyGenerosity: (level: number) => number;
export declare const estimateWordSearchSolve: (puzzle: WordSearchPuzzle) => number;
export declare const storyTargetSolve: (level: number) => number;
export declare const wordSearchSecondsFor: (level: number, puzzleEstimate: number) => number;
export declare const storyDifficultyBand = 0.18;
export declare const isOnDifficulty: (level: number, puzzleEstimate: number) => boolean;
export declare const storyLevel: (level: number) => StoryLevel;
//# sourceMappingURL=story-mode.d.ts.map