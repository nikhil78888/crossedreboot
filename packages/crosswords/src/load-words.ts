require("dotenv").config();

import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { localSupabaseClient } from "./local-supabase-client";

const run = async () => {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: localSupabaseClient,
    tableName: "words",
    queryName: "match_words",
  });

  const loader = new CSVLoader(`data/clues.csv`);

  const allDocuments = await loader.load();
  const correctLengthDocuments = allDocuments.filter((record) => {
    const answer = record.pageContent.split("answer: ")[1].split("\n")[0];
    return answer.length < 8;
  });

  const pageSize = 200;
  for (let i = 0; i < correctLengthDocuments.length; i = i + pageSize) {
    const start = i;
    const end = start + pageSize;
    const documentsToLoad = correctLengthDocuments.slice(start, end);
    const formattedDocumentsToLoad = documentsToLoad.map((record) => {
      const answer = record.pageContent.split("answer: ")[1].split("\n")[0];
      const definition = record.pageContent
        .split("definition: ")[1]
        .split("\n")[0];
      const clue = record.pageContent.split("clue: ")[1].split("\n")[0];
      return {
        pageContent: `${answer}\n${definition}\n${clue}`,
        metadata: {
          answer,
          definition,
          clue,
          answerLength: answer.length,
        },
      };
    });
    try {
      await vectorStore.addDocuments(formattedDocumentsToLoad);
    } catch (error: any) {
      console.log(error.message);
    }
  }
};

run();
