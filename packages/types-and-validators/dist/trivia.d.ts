export type Difficulty = "easy" | "medium" | "hard";
export type TriviaQuestion = {
    id: string;
    category: string;
    difficulty: Difficulty;
    q: string;
    choices: string[];
    answer: number;
};
export type TriviaQuiz = {
    category: string;
    difficulty: Difficulty;
    questions: TriviaQuestion[];
};
export declare const TRIVIA_CATEGORIES: readonly ["Science", "History", "Geography", "Sports", "Film & TV", "Art & Literature", "Music", "Nature"];
export declare const TRIVIA_COUNT = 6;
export declare const generateTrivia: (difficulty: Difficulty, seed: number, category?: string, excludeIds?: string[]) => TriviaQuiz;
export declare const triviaProgress: (quiz: TriviaQuiz | null | undefined, answers: Record<string, number> | null | undefined) => number;
export declare const triviaCorrectCount: (quiz: TriviaQuiz | null | undefined, answers: Record<string, number> | null | undefined) => number;
//# sourceMappingURL=trivia.d.ts.map