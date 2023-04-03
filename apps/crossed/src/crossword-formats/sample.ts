// numeric cells should match to clues
// empty cells are fillable but have no clues
// # cells represent black squares

const three = {
  version: "http://ipuz.org/v2",
  kind: ["http://ipuz.org/crossword#1"],
  dimensions: { width: 3, height: 3 },
  puzzle: [
    [1, 2, "#"],
    [3, "", 4],
    ["#", 5, ""],
  ],
  solution: [
    ["C", "A", "#"],
    ["B", "O", "T"],
    ["#", "L", "O"],
  ],
  clues: {
    Across: [
      { number: 1, clue: "OR neighbor" },
      { number: 3, clue: "Droid" },
      { number: 5, clue: "Behold!" },
    ],
    Down: [
      { number: 1, clue: "Trucker's radio" },
      { number: 2, clue: "MSN competitor" },
      { number: 4, clue: "A preposition" },
    ],
  },
};

const five = {
  version: "http://ipuz.org/v2",
  kind: ["http://ipuz.org/crossword#1"],
  dimensions: { width: 5, height: 5 },
  puzzle: [
    ["#", 1, 2, 3, "#"],
    ["#", 4, "", "", "#"],
    [5, "", "", "", 6],
    [7, "", "", "", ""],
    [8, "", "", "", ""],
  ],
  solution: [
    ["#", "M", "L", "B", "#"],
    ["#", "O", "I", "L", "#"],
    ["B", "O", "N", "E", "S"],
    ["U", "S", "U", "A", "L"],
    ["T", "E", "S", "T", "Y"],
  ],
  clues: {
    Across: [
      { number: 1, clue: "Org. with an Opening Day on 3/30/23" },
      { number: 4, clue: "It's measured in barrels" },
      { number: 5, clue: "Ribs, e.g." },
      { number: 7, clue: "Standard" },
      { number: 8, clue: "Having a short temper" },
    ],
    Down: [
      { number: 1, clue: "Animal on the state seal of Maine" },
      { number: 2, clue: "Best friend of Charlie Brown" },
      { number: 3, clue: "Sound from a sheep" },
      { number: 5, clue: "However..." },
      { number: 6, clue: "On the ___ (secretively)" },
    ],
  },
};

const seven = {
  version: "http://ipuz.org/v2",
  kind: ["http://ipuz.org/crossword#1"],
  dimensions: { width: 7, height: 7 },
  puzzle: [
    [1, 2, 3, 4, 5, 6, 7],
    [8, "", "", "", "", "", ""],
    [9, "", "", "", "", "", ""],
    [10, "", "", "#", 11, "", ""],
    [12, "", "", 13, "", "", ""],
    ["#", 14, "", "", "", "", "#"],
    ["#", "#", 15, "", "", "", "#"],
  ],
  solution: [
    ["L", "O", "W", "T", "I", "D", "E"],
    ["I", "P", "H", "O", "N", "E", "X"],
    ["S", "E", "A", "S", "A", "L", "T"],
    ["T", "N", "T", "#", "F", "R", "O"],
    ["S", "E", "N", "S", "U", "A", "L"],
    ["#", "D", "O", "N", "N", "Y", "#"],
    ["#", "#", "W", "O", "K", "#", "#"],
  ],
  clues: {
    Across: [
      { number: 1, clue: "Lowtide" },
      { number: 8, clue: "IPhone X" },
      { number: 9, clue: "Sea salt" },
      { number: 10, clue: "TNT" },
      { number: 11, clue: "Fro" },
      { number: 12, clue: "Sensual" },
      { number: 14, clue: "Donny" },
      { number: 15, clue: "Wok" },
    ],
    Down: [
      { number: 1, clue: "Lists" },
      { number: 2, clue: "Opened" },
      { number: 3, clue: "What now" },
      { number: 4, clue: "Tos" },
      { number: 5, clue: "Ina funk?" },
      { number: 6, clue: "Delray" },
      { number: 7, clue: "Extol" },
      { number: 13, clue: "Sno" },
    ],
  },
};

export const crossword = seven;
