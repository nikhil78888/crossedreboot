require("dotenv").config();

import {
  SupabaseFilterRPCCall,
  SupabaseVectorStore,
} from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import axios from "axios";
import { writeFileSync } from "fs";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import { PromptTemplate } from "langchain/prompts";
import * as z from "zod";
import { localSupabaseClient } from "./local-supabase-client";
import { remoteSupabaseClient } from "./remote-supabase-client";
import { openAILLM } from "./openai";
import { createIpuz } from "./create-ipuz";
import { Ipuz } from "types-and-validators";
import { CrosswordCategory } from "database";

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: localSupabaseClient,
  tableName: "words",
  queryName: "match_words",
});

const getWordsInCrossword = (ipuz: Ipuz) => {
  const words = [
    ...ipuz.clues.Across.map((clue) => clue.clue),
    ...ipuz.clues.Down.map((clue) => clue.clue),
  ];
  return words;
};

const getWordListForCrossword = async (theme: string, size: number) => {
  const funcFilterB: SupabaseFilterRPCCall = (rpc) =>
    rpc
      .filter("metadata->wordLength::int", "gte", size - 2)
      .filter("metadata->wordLength::int", "lte", size);

  const results = await vectorStore.similaritySearch(
    `belonging to ${theme} category`,
    10000,
    funcFilterB
  );
  const wordList = results.map((result) => result.pageContent);
  const unique = new Set(wordList);
  return [...unique];
};

const generateCrossword = async (wordList: string[], size: number) => {
  const response = await axios.post(
    "https://crossword-generator-v4.boringoldev.repl.co/generate-crossword",
    { words: wordList, size }
  );
  const wiz = response.data;
  return wiz;
};

const generateClues = async (
  wordsInCrossword: string[],
  theme: string,
  difficulty: number
) => {
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
      "You are a crossword creator." +
      "\n For the list of words given below," +
      " generate a list of clues that will be used" +
      " to populate a crossword." +
      "\n The clues should be ${theme} related where possible." +
      "\n Ensure that the clues are both fun and challenging." +
      "\n Ensure that the word itself is not in the clue." +
      "\n Ensure that the clue isn't offensive." +
      "\n Ensure that the clue is gramatically correct in relation to the word." +
      "\n- On a difficuly scale of 1 to 10," +
      " where 1 being the easiest and 10 being the toughest," +
      " clues should be of level {difficulty} difficulty" +
      "\nList of words -" +
      "\n\n{words}" +
      "\n\n{formatInstructions}",
    inputVariables: ["words", "difficulty", "theme"],
    partialVariables: { formatInstructions },
  });

  const input = await prompt.format({
    words: wordsInCrossword.join("\n"),
    theme,
    difficulty: difficulty,
  });
  const res = await openAILLM.call(input);
  try {
    const parsedResponse = await parser.parse(res);
    return parsedResponse;
  } catch (error) {
    const formattedInput = await prompt.formatPromptValue({
      words: wordsInCrossword.join("\n"),
      theme,
      difficulty: difficulty,
    });
    const fixParser = OutputFixingParser.fromLLM(openAILLM, parser);
    const fixed = await fixParser.parseWithPrompt(res, formattedInput);
    return fixed;
  }
};

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

const run = async () => {
  const size = 5;
  const difficulty = 3;
  const categories = Object.keys(CrosswordCategory);
  for (let i = 0; i < 1; i += 1) {
    const category = categories[i] as CrosswordCategory;
    for (let j = 0; j < 4; j += 1) {
      const wordList = await getWordListForCrossword(category, size);
      console.log({ wordList: wordList.length });
      const wiz = await generateCrossword(wordList, size);
      if (wiz.findIndex((row: string) => row.indexOf(".") >= 0) >= 0) {
        console.log("could not create crossword");
        return;
      }
      const ipuz: Ipuz = createIpuz(wiz);
      const words = getWordsInCrossword(ipuz);
      const clueWordsPairs = await generateClues(words, category, difficulty);
      updateClues(ipuz, clueWordsPairs);
      writeFileSync("data/crossword.json", JSON.stringify(ipuz));
      // @ts-expect-error
      await remoteSupabaseClient.from("crosswords").insert({
        ...ipuz,
        size,
        source: "wizium",
        difficulty,
        isPublished: false,
        category,
      });
    }
  }
};

run();
