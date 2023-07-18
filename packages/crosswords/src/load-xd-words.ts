// loading data/clues-xd.csv
// https://xd.saul.pw/data/

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

  const loader = new CSVLoader(`data/clues-xd.csv`);

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
    const uniqueDocumentsToLoad = Object.values(
      documentsToLoad.reduce((accumulated, record) => {
        const answer = record.pageContent.split("answer: ")[1].split("\n")[0];
        if (accumulated[answer]) {
          return accumulated;
        } else {
          return { ...accumulated, [answer]: record };
        }
      }, {})
    );
    const newDocumentsToLoad = [];
    for (let i = 0; i < uniqueDocumentsToLoad.length; i += 1) {
      const record = documentsToLoad[i];
      const answer = record.pageContent.split("answer: ")[1].split("\n")[0];
      const { data } = await localSupabaseClient
        .from("words")
        .select()
        .filter("content", "eq", answer);
      if (!data?.length) {
        newDocumentsToLoad.push(record);
      }
    }
    console.log(`adding ${newDocumentsToLoad.length} words`);
    if (newDocumentsToLoad.length) {
      const formattedDocumentsToLoad = newDocumentsToLoad.map((record) => {
        const word = record.pageContent.split("answer: ")[1].split("\n")[0];
        const clue = record.pageContent.split("clue: ")[1].split("\n")[0];
        return {
          pageContent: word,
          metadata: {
            word,
            clue,
            wordLength: word.length,
          },
        };
      });
      try {
        await vectorStore.addDocuments(formattedDocumentsToLoad);
      } catch (error: any) {
        console.log(error.message);
      }
    }
  }
};

run();
