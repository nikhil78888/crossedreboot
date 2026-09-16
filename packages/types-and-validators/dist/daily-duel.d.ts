export type DuelVariant = "CROSSWORD" | "WORD_SEARCH";
export type DuelMeta = {
    day: string;
    seed: number;
    variant: DuelVariant;
    opponent: string;
    seconds: number;
};
export declare const CAST: string[];
export declare const PUBLISHED_5X5 = 384;
export declare const localDay: (d?: Date) => string;
export declare const seedFrom: (day: string) => number;
export declare const duelVariant: (seed: number) => DuelVariant;
export declare const duelSeconds: (seed: number, variant: DuelVariant) => number;
export declare const duelMeta: (day?: string) => DuelMeta;
export declare const fmtSeconds: (s: number) => string;
//# sourceMappingURL=daily-duel.d.ts.map