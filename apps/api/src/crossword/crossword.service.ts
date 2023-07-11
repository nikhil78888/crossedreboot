import { CrosswordCategory } from "database";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import * as z from "zod";
import { openAILLM } from "../lib/openai";
import {
  openAICrosswordOutputSchema,
  openAIClueOutputSchema,
} from "types-and-validators";
import { PromptTemplate } from "langchain/prompts";

const generateCrossword = async (category: CrosswordCategory) => {
  //   const parser = StructuredOutputParser.fromZodSchema(
  //     openAICrosswordOutputSchema
  //   );
  //   const formatInstructions = parser.getFormatInstructions();
  //   const prompt = new PromptTemplate({
  //     template:
  //       "Generate a NYT style crossword puzzle. Please adhere to following constraints." +
  //       "\n- The crossword should be a grid of {dimension}x{dimension} squares" +
  //       "\n- All answers should be related to {category}" +
  //       "\n- On a difficuly scale of 1 to 7, where 1 being the easiest and 7 being the toughest, the crossword should be of level {difficulty} difficulty" +
  //       "\n- Not more that 20% of the grid should be blocked cells." +
  //       "\n - The black squares should not isolate any part of the grid; that is, you should be able to get from any white square to any other white square through a path of white squares." +
  //       "\n- The pattern of black and white squares should exhibit 180-degree rotational symmetry. That means if you rotate the puzzle 180 degrees, it would look the same." +
  //       "\n- All answers should be between 3 to {dimension} letters." +
  //       "\n- Every letter should be part of both an Across and a Down word." +
  //       "\n- The same word should not appear more than once in the grid." +
  //       "\n- Each word in the grid must have a corresponding clue. Clues for the Across words are listed first, followed by the Down clues. They are numbered according to their starting square in the grid." +
  //       "\n- Every letter that is part of a word crossing another should make a legitimate word in both crossing directions." +
  //       //   "",
  //       "\n\n{formatInstructions}",
  //     inputVariables: ["category", "dimension", "difficulty"],
  //     partialVariables: { formatInstructions },
  //   });

  //   const input = await prompt.format({
  //     category: "oceans",
  //     dimension: 7,
  //     difficulty: 7,
  //   });
  //   const formattedInput = await prompt.formatPromptValue({
  //     category: "oceans",
  //     dimension: 7,
  //     difficulty: 4,
  //   });

  const parser = StructuredOutputParser.fromZodSchema(
    z.array(z.string()).describe("list of words")
  );
  const formatInstructions = parser.getFormatInstructions();
  const prompt = new PromptTemplate({
    template:
      "Generate a list of 500 words to be used in creating a crossword. Please adhere to following constraints." +
      "\n- Any word should not be more than {dimension} characters long" +
      "\n- All words should be related to {category}" +
      "\n- On a difficuly scale of 1 to 7, where 1 being the easiest and 7 being the toughest, answers and clues be of level {difficulty} difficulty" +
      "\n\n{formatInstructions}",
    inputVariables: ["category", "dimension", "difficulty"],
    partialVariables: { formatInstructions },
  });

  const input = await prompt.format({
    category: "oceans",
    dimension: 7,
    difficulty: 7,
  });
  const res = await openAILLM.call(input);
  try {
    const parsedResponse = await parser.parse(res);
    console.log({ parsedResponse });
    return parsedResponse;
  } catch (error) {
    // const formattedInput = await prompt.formatPromptValue({
    //   category: "oceans",
    //   dimension: 7,
    //   difficulty: 7,
    // });
    // const fixParser = OutputFixingParser.fromLLM(openAILLM, parser);
    // const fixed = await fixParser.parseWithPrompt(res, formattedInput);
    // console.log({ fixed });
    // return fixed;
    console.log(error);
  }
};

export const crosswordService = {
  generateCrossword,
};
