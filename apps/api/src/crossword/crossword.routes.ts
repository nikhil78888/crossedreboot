// /api/crosswords

import express, { Router } from "express";
import * as z from "zod";
import { validate } from "../lib/validate.middleware";
// import { CrosswordCategory } from "database";
import { Ipuz, ipuzSchema } from "types-and-validators";
import { supabase } from "../lib/supabase";
import axios from "axios";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import { PromptTemplate } from "langchain/prompts";
import { openAILLM } from "../lib/openai";

export const crosswordRouter: Router = express.Router();

const createCrosswordRequestSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({
    // category: z.nativeEnum(CrosswordCategory),
    size: z.number(),
  }),
});

crosswordRouter.post<
  Record<string, never>,
  Record<string, never> | string,
  {
    size: number;
    // category: CrosswordCategory
  },
  Record<string, never>
>("/", validate(createCrosswordRequestSchema), async (req, res, next) => {
  try {
    const { size } = req.body;
    const difficulty = 2;
    for (let i = 0; i < 1; i += 1) {
      const wordList = await getWordList(size);
      console.log("fetched word list", wordList.length);
      const wiz = await generateCrossword(wordList, size);
      console.log("generated wiz");
      if (wiz.findIndex((row: string) => row.indexOf(".") >= 0) >= 0) {
        res.status(500).send("could not create crossword");
        return;
      }
      const ipuz = createIpuz(wiz);
      console.log("created ipuz");
      const usedWords = getWordsInIpuz(ipuz);
      const sampleClueWordPairs = await getSampleClues();
      if (sampleClueWordPairs) {
        const clueWordsPairs = await generateClues(
          usedWords,
          difficulty,
          sampleClueWordPairs
        );
        console.log("got clues");
        updateClues(ipuz, clueWordsPairs);
        console.log(JSON.stringify({ ipuz, wiz, usedWords, clueWordsPairs }));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        await supabase.from("crosswords").insert({
          ...ipuz,
          size,
          source: "wizium",
          difficulty,
          isPublished: false,
          category: "general",
        });
        for (let j = 0; j < usedWords.length; j += 1) {
          await supabase
            .from("words")
            .update({ lastUsed: new Date().toISOString() })
            .filter("word", "eq", usedWords[j]);
        }
      }
    }
    res.status(201).send();
  } catch (error) {
    next(error);
  }
});

const updateClues = (
  ipuz: Ipuz,
  clueWordPairs: { clue: string; word: string }[]
) => {
  for (let i = 0; i < clueWordPairs.length; i += 1) {
    const { word, clue } = clueWordPairs[i];
    const acrossIndex = ipuz.clues.Across.findIndex((c) => c.clue === word);
    if (acrossIndex >= 0) {
      ipuz.clues.Across[acrossIndex].clue = clue;
    }
    const downIndex = ipuz.clues.Down.findIndex((c) => c.clue === word);
    if (downIndex >= 0) {
      ipuz.clues.Down[downIndex].clue = clue;
    }
  }
};

const getSampleClues = async () => {
  const rows = await supabase
    .from("random_words")
    .select("word,clue")
    .filter("clue", "neq", null)
    .limit(50);
  const sampleClueWordPairs = rows.data?.map((w) => ({
    word: w.word as string,
    clue: w.clue as string,
  }));
  return sampleClueWordPairs;
};

const generateClues = async (
  wordsInCrossword: string[],
  difficulty: number,
  sampleClueWordPairs: { word: string; clue: string }[]
) => {
  const samples = sampleClueWordPairs
    .map((sample) => `word: ${sample.word}, clue: ${sample.clue}`)
    .join("\n");
  const parser = StructuredOutputParser.fromZodSchema(
    z
      .array(
        z
          .object({
            word: z.string().describe("a word from the provided list of words"),
            clue: z.string().describe("the clue for the word"),
          })
          .describe("a single word clue pair")
      )
      .describe("list of word clue pairs")
  );
  const formatInstructions = parser.getFormatInstructions();
  const prompt = new PromptTemplate({
    template:
      "You are a crossword creator.\n" +
      "Here are some good examples of clue word pairs \n" +
      "{samples}" +
      "\n\n For the list of words given below," +
      " generate a list of clues that will be used" +
      " to populate a crossword." +
      // "\n The clues should be ${theme} related where possible." +
      "\n Ensure that the clues are both fun and challenging." +
      "\n Ensure that the word itself is not in the clue." +
      "\n Ensure that the clue isn't offensive." +
      "\n Ensure that the clue is gramatically correct in relation to the word." +
      // "\n- On a difficuly scale of 1 to 10," +
      // " where 1 being the easiest and 10 being the toughest," +
      // " clues should be of level {difficulty} difficulty" +
      "\nList of words -" +
      "\n\n{words}" +
      "\n\n{formatInstructions}",
    inputVariables: [
      "words",
      "samples",
      // "difficulty",
      // "theme"
    ],
    partialVariables: { formatInstructions },
  });

  const input = await prompt.format({
    words: wordsInCrossword.join("\n"),
    samples,
    // theme,
    // difficulty: difficulty,
  });
  console.log(input);
  const res = await openAILLM.call(input);
  try {
    const parsedResponse = await parser.parse(res);
    return parsedResponse;
  } catch (error) {
    const formattedInput = await prompt.formatPromptValue({
      words: wordsInCrossword.join("\n"),
      samples,
      // theme,
      // difficulty: difficulty,
    });
    const fixParser = OutputFixingParser.fromLLM(openAILLM, parser);
    const fixed = await fixParser.parseWithPrompt(res, formattedInput);
    return fixed;
  }
};

const getWordsInIpuz = (ipuz: Ipuz) => {
  const words = [
    ...ipuz.clues.Across.map((clue) => clue.clue),
    ...ipuz.clues.Down.map((clue) => clue.clue),
  ];
  return words;
};

const createIpuz = (wiz: string[]) => {
  const rows = wiz.map((r) => r.replace("\n", "").split(""));
  const cols: string[][] = [];
  for (let i = 0; i < wiz.length; i += 1) {
    const col: string[] = [];
    for (let j = 0; j < rows.length; j += 1) {
      col.push(wiz[j][i]);
    }
    cols.push(col);
  }
  const traversalState = rows.map((r) => {
    return r.map((e) => {
      return { across: false, down: false };
    });
  });
  const clues: Ipuz["clues"] = { Across: [], Down: [] };
  const puzzle: Ipuz["puzzle"] = rows.map((row) => {
    return row.map((cell) => {
      if (cell === "#") {
        return "#";
      }
      return "0";
    });
  });
  const solution = rows.map((row) => {
    return row.map((cell) => {
      if (cell === "#") {
        return null;
      }
      return cell;
    });
  });
  let clueNumber = 1;
  for (let i = 0; i < rows.length; i += 1) {
    const currentRow = rows[i];
    for (let j = 0; j < currentRow.length; j += 1) {
      let shouldIncreaseClueCount = false;
      if (currentRow[j] !== "#") {
        const cellTraversalState = traversalState[i][j];
        if (!cellTraversalState.across) {
          let nextBlockIndex = currentRow.findIndex(
            (x, index) => index > j && x === "#"
          );
          nextBlockIndex =
            nextBlockIndex === -1 ? currentRow.length : nextBlockIndex;
          const word = currentRow.slice(j, nextBlockIndex).join("");
          if (word.length > 2) {
            clues.Across.push({ number: String(clueNumber), clue: word });
            shouldIncreaseClueCount = true;
            puzzle[i][j] = String(clueNumber);
          }
          for (let k = j; k < nextBlockIndex; k += 1) {
            traversalState[i][k].across = true;
          }
        }
        if (!cellTraversalState.down) {
          const currentCol = cols[j];
          let nextBlockIndex = currentCol.findIndex(
            (x, index) => index > i && x === "#"
          );
          nextBlockIndex =
            nextBlockIndex === -1 ? currentCol.length : nextBlockIndex;
          const word = currentCol.slice(i, nextBlockIndex).join("");
          if (word.length > 2) {
            clues.Down.push({ number: String(clueNumber), clue: word });
            puzzle[i][j] = String(clueNumber);
            shouldIncreaseClueCount = true;
          }
          for (let k = i; k < nextBlockIndex; k += 1) {
            traversalState[k][j].down = true;
          }
        }
        if (shouldIncreaseClueCount) {
          clueNumber += 1;
        }
      }
    }
  }
  const ipuz: Ipuz = ipuzSchema.parse({ clues, solution, puzzle });
  return ipuz;
};

const generateCrossword = async (wordList: string[], size: number) => {
  const response = await axios.post(
    "https://crossword-generator-v4.boringoldev.repl.co/generate-crossword",
    { words: wordList, size }
  );
  const wiz = response.data;
  return wiz;
};

const getWordList = async (size: number) => {
  const sizeMinusTwoRows = 2;
  const sizeMinusFourRows = size > 6 ? 2 : 0;
  const sizeRows = size - (sizeMinusTwoRows + sizeMinusFourRows);
  const sizeMinusTwoWords = await supabase
    .from("words")
    .select("id, word")
    .filter("wordLength", "eq", size - 2)
    .limit(sizeMinusTwoRows * 2000);
  const sizeWords = await supabase
    .from("words")
    .select("id, word")
    .filter("wordLength", "eq", size)
    .limit(sizeRows * 2000);
  const sizeMinusFourWords = sizeMinusFourRows
    ? await supabase
        .from("words")
        .select("id, word")
        .filter("wordLength", "eq", size - 4)
        .limit(sizeMinusFourRows * 2000)
    : null;

  let words: string[] = [];
  if (sizeWords.data) {
    words = [...words, ...sizeWords.data.map((word) => word.word)];
  }
  if (sizeMinusTwoWords.data) {
    words = [...words, ...sizeMinusTwoWords.data.map((word) => word.word)];
  }
  if (sizeMinusFourWords?.data) {
    words = [...words, ...sizeMinusFourWords.data.map((word) => word.word)];
  }

  return words;
};
