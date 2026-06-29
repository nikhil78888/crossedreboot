// Client-side per-variant rating column resolution, mirroring the API's
// rating-fields module. Each variant reads its own ladder off the profile.
const ELO_COL: Record<string, string> = {
  CROSSWORD: "eloRating",
  SUDOKU: "eloRatingSudoku",
  WORD_SEARCH: "eloRatingWordSearch",
  TRIVIA: "eloRatingTrivia",
};

export const ratingForVariant = (
  profile: unknown,
  variant: string | undefined
): number | undefined =>
  (profile as Record<string, number> | undefined)?.[
    ELO_COL[variant ?? "CROSSWORD"] ?? "eloRating"
  ];

export const variantLabel = (variant: string | undefined): string =>
  variant === "SUDOKU"
    ? "Sudoku"
    : variant === "WORD_SEARCH"
    ? "Word Search"
    : variant === "TRIVIA"
    ? "Trivia"
    : "Crossword";
