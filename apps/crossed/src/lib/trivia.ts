// Bundled trivia bank + quiz selection. Like word search, a quiz is generated
// (selected) on the client and stored inline in gameState.__trivia, so trivia
// needs no content table / RPC and ships over-the-air. The bank is authored here
// and can be expanded over time (categories × easy/medium/hard).

export type Difficulty = "easy" | "medium" | "hard";
export type TriviaQuestion = {
  id: string;
  category: string;
  difficulty: Difficulty;
  q: string;
  choices: string[];
  answer: number; // index into choices
};

// A selected quiz stored on the game (answer index stripped is NOT needed —
// the game is client-finalized; we keep the answer for instant local checking).
export type TriviaQuiz = {
  category: string;
  difficulty: Difficulty;
  questions: TriviaQuestion[];
};

export const TRIVIA_CATEGORIES = [
  "General",
  "Science",
  "History",
  "Geography",
  "Sports",
  "Entertainment",
] as const;

const BANK: TriviaQuestion[] = [
  // ---- General ----
  { id: "g1", category: "General", difficulty: "easy", q: "How many days are in a leap year?", choices: ["365", "366", "364", "360"], answer: 1 },
  { id: "g2", category: "General", difficulty: "easy", q: "What color do you get mixing blue and yellow?", choices: ["Green", "Purple", "Orange", "Brown"], answer: 0 },
  { id: "g3", category: "General", difficulty: "medium", q: "How many sides does a hexagon have?", choices: ["5", "6", "7", "8"], answer: 1 },
  { id: "g4", category: "General", difficulty: "medium", q: "What is the most spoken native language in the world?", choices: ["English", "Hindi", "Mandarin Chinese", "Spanish"], answer: 2 },
  { id: "g5", category: "General", difficulty: "hard", q: "What is the only number spelled with letters in alphabetical order (in English)?", choices: ["Six", "Forty", "Ten", "Two"], answer: 1 },
  { id: "g6", category: "General", difficulty: "hard", q: "Which is the only U.S. state name that ends in three vowels?", choices: ["Hawaii", "Ohio", "Iowa", "Idaho"], answer: 0 },

  // ---- Science ----
  { id: "s1", category: "Science", difficulty: "easy", q: "What gas do plants primarily absorb from the air?", choices: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], answer: 1 },
  { id: "s2", category: "Science", difficulty: "easy", q: "What planet is known as the Red Planet?", choices: ["Venus", "Jupiter", "Mars", "Mercury"], answer: 2 },
  { id: "s3", category: "Science", difficulty: "medium", q: "What is the chemical symbol for gold?", choices: ["Gd", "Au", "Ag", "Go"], answer: 1 },
  { id: "s4", category: "Science", difficulty: "medium", q: "How many bones are in the adult human body?", choices: ["206", "201", "212", "198"], answer: 0 },
  { id: "s5", category: "Science", difficulty: "hard", q: "What is the powerhouse of the cell?", choices: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], answer: 2 },
  { id: "s6", category: "Science", difficulty: "hard", q: "What particle has no electric charge?", choices: ["Proton", "Electron", "Neutron", "Positron"], answer: 2 },

  // ---- History ----
  { id: "h1", category: "History", difficulty: "easy", q: "Who was the first President of the United States?", choices: ["Lincoln", "Jefferson", "Washington", "Adams"], answer: 2 },
  { id: "h2", category: "History", difficulty: "easy", q: "The Great Wall is located in which country?", choices: ["Japan", "China", "India", "Korea"], answer: 1 },
  { id: "h3", category: "History", difficulty: "medium", q: "In what year did World War II end?", choices: ["1943", "1945", "1947", "1950"], answer: 1 },
  { id: "h4", category: "History", difficulty: "medium", q: "Which ancient civilization built the pyramids at Giza?", choices: ["Roman", "Greek", "Egyptian", "Persian"], answer: 2 },
  { id: "h5", category: "History", difficulty: "hard", q: "Who was the first woman to win a Nobel Prize?", choices: ["Marie Curie", "Rosalind Franklin", "Ada Lovelace", "Dorothy Hodgkin"], answer: 0 },
  { id: "h6", category: "History", difficulty: "hard", q: "The Magna Carta was signed in which year?", choices: ["1066", "1215", "1492", "1300"], answer: 1 },

  // ---- Geography ----
  { id: "ge1", category: "Geography", difficulty: "easy", q: "What is the largest ocean on Earth?", choices: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3 },
  { id: "ge2", category: "Geography", difficulty: "easy", q: "What is the capital of France?", choices: ["Lyon", "Paris", "Marseille", "Nice"], answer: 1 },
  { id: "ge3", category: "Geography", difficulty: "medium", q: "Which country has the most natural lakes?", choices: ["USA", "Russia", "Canada", "Finland"], answer: 2 },
  { id: "ge4", category: "Geography", difficulty: "medium", q: "Mount Kilimanjaro is in which country?", choices: ["Kenya", "Tanzania", "Uganda", "Ethiopia"], answer: 1 },
  { id: "ge5", category: "Geography", difficulty: "hard", q: "What is the smallest country in the world by area?", choices: ["Monaco", "Nauru", "Vatican City", "San Marino"], answer: 2 },
  { id: "ge6", category: "Geography", difficulty: "hard", q: "What is the largest hot desert on Earth?", choices: ["Gobi", "Sahara", "Kalahari", "Arabian"], answer: 1 },

  // ---- Sports ----
  { id: "sp1", category: "Sports", difficulty: "easy", q: "How many players are on a soccer team on the field?", choices: ["9", "10", "11", "12"], answer: 2 },
  { id: "sp2", category: "Sports", difficulty: "easy", q: "In which sport would you perform a slam dunk?", choices: ["Tennis", "Basketball", "Golf", "Cricket"], answer: 1 },
  { id: "sp3", category: "Sports", difficulty: "medium", q: "How often are the Summer Olympic Games held?", choices: ["Every 2 years", "Every 3 years", "Every 4 years", "Every 5 years"], answer: 2 },
  { id: "sp4", category: "Sports", difficulty: "medium", q: "What sport is associated with Wimbledon?", choices: ["Golf", "Tennis", "Rowing", "Cricket"], answer: 1 },
  { id: "sp5", category: "Sports", difficulty: "hard", q: "How many points is a touchdown worth in American football (before extra point)?", choices: ["3", "6", "7", "5"], answer: 1 },
  { id: "sp6", category: "Sports", difficulty: "hard", q: "Which country has won the most FIFA World Cups?", choices: ["Germany", "Italy", "Brazil", "Argentina"], answer: 2 },

  // ---- Entertainment ----
  { id: "e1", category: "Entertainment", difficulty: "easy", q: "What is the name of the toy cowboy in 'Toy Story'?", choices: ["Buzz", "Woody", "Rex", "Hamm"], answer: 1 },
  { id: "e2", category: "Entertainment", difficulty: "easy", q: "How many strings does a standard guitar have?", choices: ["4", "5", "6", "7"], answer: 2 },
  { id: "e3", category: "Entertainment", difficulty: "medium", q: "Who painted the Mona Lisa?", choices: ["Michelangelo", "Da Vinci", "Raphael", "Donatello"], answer: 1 },
  { id: "e4", category: "Entertainment", difficulty: "medium", q: "Which band released the album 'Abbey Road'?", choices: ["The Rolling Stones", "The Beatles", "Pink Floyd", "Queen"], answer: 1 },
  { id: "e5", category: "Entertainment", difficulty: "hard", q: "What was Disney's first full-length animated film?", choices: ["Pinocchio", "Bambi", "Snow White and the Seven Dwarfs", "Fantasia"], answer: 2 },
  { id: "e6", category: "Entertainment", difficulty: "hard", q: "Who composed the Four Seasons?", choices: ["Bach", "Mozart", "Vivaldi", "Beethoven"], answer: 2 },
];

const makeRng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
};

export const TRIVIA_COUNT = 6; // questions per quiz

// Select a quiz of the given difficulty (and optional category), shuffled.
export const generateTrivia = (
  difficulty: Difficulty,
  seed: number,
  category?: string
): TriviaQuiz => {
  const rng = makeRng(seed);
  let pool = BANK.filter((q) => q.difficulty === difficulty);
  if (category && category !== "Any")
    pool = pool.filter((q) => q.category === category);
  // Fall back to all difficulties if a narrow filter is too small.
  if (pool.length < TRIVIA_COUNT) {
    pool = category && category !== "Any"
      ? BANK.filter((q) => q.category === category)
      : BANK.filter((q) => q.difficulty === difficulty);
  }
  if (pool.length < TRIVIA_COUNT) pool = [...BANK];
  // Shuffle.
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const questions = arr.slice(0, TRIVIA_COUNT);
  return { category: category ?? "Any", difficulty, questions };
};

// answers: map of questionId -> chosen index (or -1). Progress = % correct.
export const triviaProgress = (
  quiz: TriviaQuiz | null | undefined,
  answers: Record<string, number> | null | undefined
): number => {
  if (!quiz || quiz.questions.length === 0) return 0;
  const a = answers ?? {};
  const correct = quiz.questions.filter((q) => a[q.id] === q.answer).length;
  return Math.round((correct / quiz.questions.length) * 100);
};

export const triviaCorrectCount = (
  quiz: TriviaQuiz | null | undefined,
  answers: Record<string, number> | null | undefined
): number => {
  if (!quiz) return 0;
  const a = answers ?? {};
  return quiz.questions.filter((q) => a[q.id] === q.answer).length;
};
