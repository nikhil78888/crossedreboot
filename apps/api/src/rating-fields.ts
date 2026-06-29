// Per-variant Glicko-2 rating columns on `profiles`. Each variant has a fully
// independent ladder. Single source of truth for matchmaking, leaderboards,
// and rating application.
export const RATING_FIELDS = {
  CROSSWORD: { rating: "eloRating", rd: "ratingDeviation", vol: "volatility" },
  SUDOKU: {
    rating: "eloRatingSudoku",
    rd: "ratingDeviationSudoku",
    vol: "volatilitySudoku",
  },
  WORD_SEARCH: {
    rating: "eloRatingWordSearch",
    rd: "ratingDeviationWordSearch",
    vol: "volatilityWordSearch",
  },
  TRIVIA: {
    rating: "eloRatingTrivia",
    rd: "ratingDeviationTrivia",
    vol: "volatilityTrivia",
  },
} as const;

export const ratingFieldsFor = (variant: string | null | undefined) =>
  RATING_FIELDS[variant as keyof typeof RATING_FIELDS] ??
  RATING_FIELDS.CROSSWORD;

// Just the eloRating column name for a variant (used by leaderboards/matchmaking).
// Return type is inferred as the union of the four column literals so it stays
// assignable to supabase's typed column args.
export const eloColumnFor = (variant: string | null | undefined) =>
  ratingFieldsFor(variant).rating;
