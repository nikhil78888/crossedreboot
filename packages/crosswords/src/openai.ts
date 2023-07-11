require("dotenv").config();

import { OpenAI } from "langchain/llms/openai";

export const openAILLM = new OpenAI({
  modelName: "gpt-4-0613",
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.5,
});
