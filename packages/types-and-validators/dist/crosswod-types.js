"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
exports.__esModule = true;
exports.ipuzSchema = exports.crosswordSchema = void 0;
var z = __importStar(require("zod"));
// Duplicated from Prisma schema to avoid mobile build depending on @prisma/client
var CrosswordSource;
(function (CrosswordSource) {
    CrosswordSource["wizium"] = "wizium";
    CrosswordSource["aicross"] = "aicross";
})(CrosswordSource || (CrosswordSource = {}));
var CrosswordCategory;
(function (CrosswordCategory) {
    CrosswordCategory["general"] = "general";
    CrosswordCategory["sports"] = "sports";
    CrosswordCategory["history"] = "history";
    CrosswordCategory["geography"] = "geography";
    CrosswordCategory["science"] = "science";
    CrosswordCategory["politics"] = "politics";
    CrosswordCategory["movies"] = "movies";
    CrosswordCategory["television"] = "television";
    CrosswordCategory["pop_culture"] = "pop_culture";
})(CrosswordCategory || (CrosswordCategory = {}));
var clueSchema = z.array(z.object({
    number: z.string().describe("clue number"),
    cells: z
        .array(z.array(z.number()))
        .optional()
        .describe("the cells that should be filled by answer of the clue "),
    clue: z.string().describe("the clue")
}));
exports.crosswordSchema = z.object({
    id: z.string().uuid(),
    category: z.nativeEnum(CrosswordCategory),
    source: z.nativeEnum(CrosswordSource),
    size: z.number().max(7),
    difficulty: z.number().max(7),
    isPublished: z.boolean(),
    clues: z
        .object({
        Across: clueSchema.describe("list of clues when playing Across"),
        Down: clueSchema.describe("list of clues when playing Down")
    })
        .required(),
    puzzle: z
        .array(z
        .array(z.string())
        .describe("Array representing a row of the crossword.\n" +
        "Each cell represents a cell in the crossword.\n" +
        "The value of the cell should be {number} when it is associated with a clue.\n" +
        "The value of the cell should be 0 if it is supposed to be filled but not associated with a clue.\n" +
        "The value of the cell should be # if it should be a black square."))
        .describe("2 dimensional array representing the crossword grid"),
    solution: z
        .array(z.array(z.string().length(1).nullable()))
        .describe("2 dimensional array represeting the solution of the crossword.\n" +
        "Each cell contains the correct letter to be filled.\n" +
        "Black squares should be filled with `null`.")
});
exports.ipuzSchema = exports.crosswordSchema.pick({
    clues: true,
    puzzle: true,
    solution: true
});
