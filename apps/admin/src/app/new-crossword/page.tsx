"use client";

import axios from "axios";
import { useState } from "react";
import { classNames } from "../../lib/utils";

export default function NewCrossword() {
  const [selectedPattern, setSelectedPattern] = useState(-1);
  const [prompt, setPrompt] = useState("");
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            New Crossword
          </h1>
        </div>
      </div>
      <div className="mt-4 w-full flex flex-row space-x-2 overflow-x-auto">
        {patterns.map((rows, patternIndex) => (
          <button
            onClick={() => setSelectedPattern(patternIndex)}
            key={`${JSON.stringify(rows)}-${patternIndex}`}
            className="relative"
          >
            {rows.map((row, rowIndex) => (
              <div
                className="flex flex-row items-center"
                key={`${JSON.stringify(row)}-${patternIndex}-${rowIndex}`}
              >
                {row.map((cell, cellIndex) => (
                  <div
                    className={classNames(
                      "h-6 aspect-square border items-center justify-center flex",
                      cell === "x" ? "bg-black" : "bg-yellow-200"
                    )}
                    key={`${patternIndex}-${rowIndex}-${cell}-${cellIndex}`}
                  ></div>
                ))}
              </div>
            ))}
            {selectedPattern !== patternIndex && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label>Prompt</label>
        <textarea
          rows={16}
          className="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            "For the list of words given below," +
            " generate a list of clues that will be used" +
            " to populate a crossword." +
            // "\n The clues should be ${theme} related where possible." +
            "\n Ensure that the clues are both fun and challenging." +
            "\n Ensure that the word itself is not in the clue." +
            "\n Ensure that the clue isn't offensive." +
            "\n Ensure that the clue is gramatically correct in relation to the word."
          }
        />
      </div>
      <div className="mt-4">
        <button
          type="button"
          disabled={selectedPattern === -1}
          onClick={async () => {
            const pattern = patterns[selectedPattern];
            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/crosswords`,
                { size: pattern.length, pattern, prompt }
              );
              alert("New Crossword Created");
            } catch (error) {
              alert("Oops! Something went wrong.");
            }
          }}
          className="block rounded-md bg-indigo-600 disabled:bg-indigo-600/40 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Create Crossword
        </button>
      </div>
    </div>
  );
}

const patterns = [
  [
    ["x", "", "", "", "x"],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["x", "", "", "", "x"],
  ],
  [
    ["x", "x", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "x", "x"],
  ],
  [
    ["x", "", "", "", "x"],
    ["x", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", "x"],
  ],
  [
    ["x", "", "", "", "x"],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ],
  [
    ["", "", "", "x", "x"],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["x", "x", "", "", ""],
  ],
  [
    ["", "", "", "", "x"],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["x", "", "", "", ""],
  ],
  [
    ["x", "", "", "", "", "x"],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["x", "", "", "", "", "x"],
  ],
];
