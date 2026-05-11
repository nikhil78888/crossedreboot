import * as z from "zod";

// Duplicated from Prisma schema to avoid mobile build depending on @prisma/client
enum CrosswordSource {
  wizium = "wizium",
  aicross = "aicross",
}

enum CrosswordCategory {
  general = "general",
  sports = "sports",
  history = "history",
  geography = "geography",
  science = "science",
  politics = "politics",
  movies = "movies",
  television = "television",
  pop_culture = "pop_culture",
}

const clueSchema = z.array(
  z.object({
    number: z.string().describe("clue number"),
    cells: z
      .array(z.array(z.number()))
      .optional()
      .describe("the cells that should be filled by answer of the clue "),
    clue: z.string().describe("the clue"),
  })
);

export const crosswordSchema = z.object({
  id: z.string().uuid(),
  category: z.nativeEnum(CrosswordCategory),
  source: z.nativeEnum(CrosswordSource),
  size: z.number().max(7),
  difficulty: z.number().max(7),
  isPublished: z.boolean(),
  clues: z
    .object({
      Across: clueSchema.describe("list of clues when playing Across"),
      Down: clueSchema.describe("list of clues when playing Down"),
    })
    .required(),
  puzzle: z
    .array(
      z
        .array(z.string())
        .describe(
          "Array representing a row of the crossword.\n" +
            "Each cell represents a cell in the crossword.\n" +
            "The value of the cell should be {number} when it is associated with a clue.\n" +
            "The value of the cell should be 0 if it is supposed to be filled but not associated with a clue.\n" +
            "The value of the cell should be # if it should be a black square."
        )
    )
    .describe("2 dimensional array representing the crossword grid"),
  solution: z
    .array(z.array(z.string().length(1).nullable()))
    .describe(
      "2 dimensional array represeting the solution of the crossword.\n" +
        "Each cell contains the correct letter to be filled.\n" +
        "Black squares should be filled with `null`."
    ),
});

export type Crossword = z.infer<typeof crosswordSchema>;

export const ipuzSchema = crosswordSchema.pick({
  clues: true,
  puzzle: true,
  solution: true,
});

export type Ipuz = z.infer<typeof ipuzSchema>;
