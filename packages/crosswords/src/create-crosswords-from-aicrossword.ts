require("dotenv").config();

import axios from "axios";
import { remoteSupabaseClient } from "./remote-supabase-client";
import { Ipuz } from "types-and-validators";

const createIpuz = (aicross: any): Ipuz => {
  const aiPuzzle = JSON.parse(aicross.puzzle);
  const aiClues = aicross.clues;
  const solution: Ipuz["solution"] = aiPuzzle.map((row) => {
    return row.map((cell) => {
      if (cell === "*") {
        return null;
      }
      return cell;
    });
  });
  const puzzle: Ipuz["puzzle"] = aiPuzzle.map((row, rowIndex) => {
    return row.map((cell, colIndex) => {
      if (cell === "*") {
        return "#";
      }
      const clue = aiClues.find((c) => {
        const { startingSquare } = c.wordLocation;
        if (
          startingSquare.row === rowIndex &&
          startingSquare.col === colIndex
        ) {
          return true;
        }
      });
      if (clue) {
        return String(clue.wordLocation.number);
      }
      return "0";
    });
  });
  const clues: Ipuz["clues"] = {
    Across: aiClues
      .filter((c) => c.wordLocation.direction === "across")
      .map((c) => ({ number: c.wordLocation.number, clue: c.clueText })),
    Down: aiClues
      .filter((c) => c.wordLocation.direction === "down")
      .map((c) => ({ number: c.wordLocation.number, clue: c.clueText })),
  };
  return {
    puzzle,
    solution,
    clues,
  };
};

const generateCrossword = async () => {
  // const aicross = await readFileSync("data/aicross.json");
  // return JSON.parse(aicross.toString());
  try {
    const response = await axios.post(
      "https://api.aicrossword.app/generatemini",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          Referer: "https://aicrossword.app/",
          Origin: "https://aicrossword.app",
          DNT: "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
          "Content-Length": "0",
        },
      }
    );
    const aicross = response.data;
    return aicross;
  } catch (error) {
    console.log(error.response.data);
  }
};

const run = async () => {
  for (let j = 0; j < 1000; j += 1) {
    const aicross = await generateCrossword();
    if (aicross) {
      const ipuz = createIpuz(aicross);
      if (ipuz.puzzle.length === ipuz.puzzle[0].length) {
        // @ts-expect-error
        await remoteSupabaseClient.from("crosswords").insert({
          ...ipuz,
          size: ipuz.puzzle.length,
          source: "aicross",
          difficulty: 7,
          isPublished: true,
          category: "general",
        });
      }
    }
  }
};

run();
