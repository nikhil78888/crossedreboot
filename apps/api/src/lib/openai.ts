import { OpenAI } from "langchain/llms/openai";
import { apiConfig } from "../api-config";

export const openAILLM = new OpenAI({
  modelName: "gpt-4-0613",
  openAIApiKey: apiConfig.openAIApiKey,
  temperature: 0.5,
});
