import * as z from "zod";
declare enum CrosswordSource {
    wizium = "wizium",
    aicross = "aicross"
}
declare enum CrosswordCategory {
    general = "general",
    sports = "sports",
    history = "history",
    geography = "geography",
    science = "science",
    politics = "politics",
    movies = "movies",
    television = "television",
    pop_culture = "pop_culture"
}
export declare const crosswordSchema: z.ZodObject<{
    id: z.ZodString;
    category: z.ZodNativeEnum<typeof CrosswordCategory>;
    source: z.ZodNativeEnum<typeof CrosswordSource>;
    size: z.ZodNumber;
    difficulty: z.ZodNumber;
    isPublished: z.ZodBoolean;
    clues: z.ZodObject<{
        Across: z.ZodArray<z.ZodObject<{
            number: z.ZodString;
            cells: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">>;
            clue: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }>, "many">;
        Down: z.ZodArray<z.ZodObject<{
            number: z.ZodString;
            cells: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">>;
            clue: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    }, {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    }>;
    puzzle: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
    solution: z.ZodArray<z.ZodArray<z.ZodNullable<z.ZodString>, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    category: CrosswordCategory;
    source: CrosswordSource;
    size: number;
    difficulty: number;
    isPublished: boolean;
    clues: {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    };
    puzzle: string[][];
    solution: (string | null)[][];
}, {
    id: string;
    category: CrosswordCategory;
    source: CrosswordSource;
    size: number;
    difficulty: number;
    isPublished: boolean;
    clues: {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    };
    puzzle: string[][];
    solution: (string | null)[][];
}>;
export type Crossword = z.infer<typeof crosswordSchema>;
export declare const ipuzSchema: z.ZodObject<Pick<{
    id: z.ZodString;
    category: z.ZodNativeEnum<typeof CrosswordCategory>;
    source: z.ZodNativeEnum<typeof CrosswordSource>;
    size: z.ZodNumber;
    difficulty: z.ZodNumber;
    isPublished: z.ZodBoolean;
    clues: z.ZodObject<{
        Across: z.ZodArray<z.ZodObject<{
            number: z.ZodString;
            cells: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">>;
            clue: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }>, "many">;
        Down: z.ZodArray<z.ZodObject<{
            number: z.ZodString;
            cells: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">>;
            clue: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }, {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    }, {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    }>;
    puzzle: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
    solution: z.ZodArray<z.ZodArray<z.ZodNullable<z.ZodString>, "many">, "many">;
}, "clues" | "puzzle" | "solution">, "strip", z.ZodTypeAny, {
    clues: {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    };
    puzzle: string[][];
    solution: (string | null)[][];
}, {
    clues: {
        Across: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
        Down: {
            number: string;
            clue: string;
            cells?: number[][] | undefined;
        }[];
    };
    puzzle: string[][];
    solution: (string | null)[][];
}>;
export type Ipuz = z.infer<typeof ipuzSchema>;
export {};
//# sourceMappingURL=crosswod-types.d.ts.map