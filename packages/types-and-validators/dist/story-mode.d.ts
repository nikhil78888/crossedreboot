import { WordSearchConfig } from "./word-search";
export declare const STORY_MAX_LEVEL = 200;
export type StoryVariant = "CROSSWORD" | "WORD_SEARCH";
export type StoryLevel = {
    level: number;
    variant: StoryVariant;
    seconds: number;
    boss: string;
    isBoss: boolean;
    ws?: WordSearchConfig;
    crosswordOffset?: number;
};
export declare const STORY_PUBLISHED_5X5 = 384;
export declare const storyLevel: (level: number) => StoryLevel;
//# sourceMappingURL=story-mode.d.ts.map