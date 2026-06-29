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
  { id: "g2", category: "General", difficulty: "medium", q: "What number does the Roman numeral 'L' represent?", choices: ["10", "50", "100", "500"], answer: 1 },
  { id: "g3", category: "General", difficulty: "easy", q: "How many sides does a hexagon have?", choices: ["5", "6", "7", "8"], answer: 1 },
  { id: "g4", category: "General", difficulty: "medium", q: "What is the most spoken native language in the world?", choices: ["English", "Hindi", "Mandarin Chinese", "Spanish"], answer: 2 },
  { id: "g5", category: "General", difficulty: "hard", q: "What is the only number spelled with letters in alphabetical order (in English)?", choices: ["Six", "Forty", "Ten", "Two"], answer: 1 },
  { id: "g6", category: "General", difficulty: "hard", q: "Which is the only U.S. state name that ends in three vowels?", choices: ["Hawaii", "Ohio", "Iowa", "Idaho"], answer: 0 },

  // ---- Science ----
  { id: "s1", category: "Science", difficulty: "easy", q: "What gas do plants primarily absorb from the air?", choices: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], answer: 1 },
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
  { id: "sp3", category: "Sports", difficulty: "medium", q: "How often are the Summer Olympic Games held?", choices: ["Every 2 years", "Every 3 years", "Every 4 years", "Every 5 years"], answer: 2 },
  { id: "sp4", category: "Sports", difficulty: "medium", q: "What sport is associated with Wimbledon?", choices: ["Golf", "Tennis", "Rowing", "Cricket"], answer: 1 },
  { id: "sp5", category: "Sports", difficulty: "hard", q: "How many points is a touchdown worth in American football (before extra point)?", choices: ["3", "6", "7", "5"], answer: 1 },
  { id: "sp6", category: "Sports", difficulty: "hard", q: "Which country has won the most FIFA World Cups?", choices: ["Germany", "Italy", "Brazil", "Argentina"], answer: 2 },

  // ---- Entertainment ----
  { id: "e3", category: "Entertainment", difficulty: "medium", q: "Who painted the Mona Lisa?", choices: ["Michelangelo", "Da Vinci", "Raphael", "Donatello"], answer: 1 },
  { id: "e4", category: "Entertainment", difficulty: "medium", q: "Which band released the album 'Abbey Road'?", choices: ["The Rolling Stones", "The Beatles", "Pink Floyd", "Queen"], answer: 1 },
  { id: "e5", category: "Entertainment", difficulty: "hard", q: "What was Disney's first full-length animated film?", choices: ["Pinocchio", "Bambi", "Snow White and the Seven Dwarfs", "Fantasia"], answer: 2 },
  { id: "e6", category: "Entertainment", difficulty: "hard", q: "Who composed the Four Seasons?", choices: ["Bach", "Mozart", "Vivaldi", "Beethoven"], answer: 2 },

  // --- Batch 2 (user-evaluated 2026-06-29; tiers per their calibration) ---
  { id: "n1", category: "Science", difficulty: "easy", q: "How many planets are in our solar system?", choices: ["7", "8", "9", "10"], answer: 1 },
  { id: "n2", category: "Science", difficulty: "medium", q: "What is the hardest natural substance on Earth?", choices: ["Diamond", "Quartz", "Titanium", "Granite"], answer: 0 },
  { id: "n3", category: "Science", difficulty: "medium", q: "What is the most abundant gas in Earth's atmosphere?", choices: ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"], answer: 1 },
  { id: "n4", category: "Science", difficulty: "medium", q: "Which part of a plant carries out most photosynthesis?", choices: ["Roots", "Leaves", "Stem", "Flowers"], answer: 1 },
  { id: "n5", category: "Geography", difficulty: "easy", q: "Which continent is the Sahara Desert in?", choices: ["Asia", "Africa", "Australia", "South America"], answer: 1 },
  { id: "n6", category: "Geography", difficulty: "medium", q: "What is the capital of Australia?", choices: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: 2 },
  { id: "n7", category: "Geography", difficulty: "easy", q: "The Great Barrier Reef lies off the coast of which country?", choices: ["Brazil", "Australia", "Mexico", "Thailand"], answer: 1 },
  { id: "n8", category: "Geography", difficulty: "hard", q: "What is the longest international border between two countries?", choices: ["Russia–China", "USA–Canada", "Argentina–Chile", "Kazakhstan–Russia"], answer: 1 },
  { id: "n9", category: "History", difficulty: "easy", q: "In which country did the Olympic Games originate?", choices: ["Italy", "Greece", "Egypt", "China"], answer: 1 },
  { id: "n10", category: "History", difficulty: "medium", q: "Who was the primary author of the U.S. Declaration of Independence?", choices: ["George Washington", "Benjamin Franklin", "Thomas Jefferson", "John Adams"], answer: 2 },
  { id: "n11", category: "History", difficulty: "hard", q: "In what year did the Berlin Wall fall?", choices: ["1987", "1989", "1991", "1985"], answer: 1 },
  { id: "n12", category: "Sports", difficulty: "easy", q: "How many points is a free throw worth in basketball?", choices: ["1", "2", "3", "4"], answer: 0 },
  { id: "n13", category: "Sports", difficulty: "easy", q: "In golf, what is one stroke under par called?", choices: ["Eagle", "Birdie", "Bogey", "Albatross"], answer: 1 },
  { id: "n14", category: "Sports", difficulty: "hard", q: "A marathon is approximately how many miles?", choices: ["24.2", "26.2", "28.2", "30.0"], answer: 1 },
  { id: "n15", category: "Entertainment", difficulty: "easy", q: "What is the name of Harry Potter's pet owl?", choices: ["Hedwig", "Errol", "Crookshanks", "Scabbers"], answer: 0 },
  { id: "n16", category: "Entertainment", difficulty: "medium", q: "Who directed the 1975 film 'Jaws'?", choices: ["Steven Spielberg", "George Lucas", "Martin Scorsese", "Francis Ford Coppola"], answer: 0 },
  { id: "n17", category: "Entertainment", difficulty: "hard", q: "Who composed the opera 'The Magic Flute'?", choices: ["Mozart", "Wagner", "Verdi", "Puccini"], answer: 0 },
  { id: "n18", category: "General", difficulty: "easy", q: "What is the currency of Japan?", choices: ["Yuan", "Won", "Yen", "Ringgit"], answer: 2 },
  { id: "n19", category: "General", difficulty: "easy", q: "How many colors are traditionally in a rainbow?", choices: ["5", "6", "7", "8"], answer: 2 },
  { id: "n20", category: "General", difficulty: "hard", q: "What does \"HTTP\" stand for?", choices: ["HyperText Transmission Process", "HyperText Transfer Protocol", "High Transfer Text Protocol", "Hyperlink Text Transfer Path"], answer: 1 },

  // --- Batch 3 (harder set, user-evaluated 2026-06-29) ---
  { id: "m1", category: "Science", difficulty: "hard", q: "What is the SI unit of electrical resistance?", choices: ["Ohm", "Watt", "Volt", "Joule"], answer: 0 },
  { id: "m2", category: "Science", difficulty: "hard", q: "What is the atomic number of gold?", choices: ["47", "79", "29", "26"], answer: 1 },
  { id: "m3", category: "Science", difficulty: "medium", q: "What is the most abundant element in the universe?", choices: ["Helium", "Hydrogen", "Oxygen", "Carbon"], answer: 1 },
  { id: "m4", category: "Science", difficulty: "hard", q: "A bond formed by sharing electron pairs is called?", choices: ["Ionic", "Covalent", "Metallic", "Hydrogen"], answer: 1 },
  { id: "m5", category: "History", difficulty: "medium", q: "In what year did the French Revolution begin?", choices: ["1776", "1789", "1804", "1715"], answer: 1 },
  { id: "m6", category: "History", difficulty: "hard", q: "Who was the first emperor of Rome?", choices: ["Julius Caesar", "Augustus", "Nero", "Constantine"], answer: 1 },
  { id: "m7", category: "History", difficulty: "medium", q: "Which treaty formally ended World War I?", choices: ["Treaty of Versailles", "Treaty of Paris", "Treaty of Ghent", "Treaty of Tordesillas"], answer: 0 },
  { id: "m8", category: "History", difficulty: "hard", q: "The Hundred Years' War was fought mainly between England and which country?", choices: ["France", "Spain", "Scotland", "Germany"], answer: 0 },
  { id: "m9", category: "Geography", difficulty: "hard", q: "What is the capital of Mongolia?", choices: ["Astana", "Ulaanbaatar", "Bishkek", "Tashkent"], answer: 1 },
  { id: "m10", category: "Geography", difficulty: "medium", q: "What is the capital of Canada?", choices: ["Toronto", "Ottawa", "Vancouver", "Montreal"], answer: 1 },
  { id: "m11", category: "Geography", difficulty: "medium", q: "What is the capital of New Zealand?", choices: ["Auckland", "Wellington", "Christchurch", "Hamilton"], answer: 1 },
  { id: "m12", category: "Geography", difficulty: "hard", q: "The Strait of Gibraltar connects the Atlantic Ocean to which sea?", choices: ["Mediterranean", "Black", "Red", "Caspian"], answer: 0 },
  { id: "m13", category: "Sports", difficulty: "easy", q: "In tennis, what term denotes a score of zero?", choices: ["Love", "Deuce", "Ace", "Fault"], answer: 0 },
  { id: "m14", category: "Sports", difficulty: "easy", q: "How many players per side are on the ice in ice hockey (including the goalie)?", choices: ["5", "6", "7", "11"], answer: 1 },
  { id: "m15", category: "Entertainment", difficulty: "hard", q: "Who painted 'Guernica'?", choices: ["Salvador Dali", "Pablo Picasso", "Francisco Goya", "Joan Miro"], answer: 1 },
  { id: "m16", category: "Entertainment", difficulty: "medium", q: "Who wrote the novel '1984'?", choices: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Kurt Vonnegut"], answer: 1 },
  { id: "m17", category: "General", difficulty: "medium", q: "The Roman numeral 'M' represents what number?", choices: ["100", "1,000", "500", "50"], answer: 1 },
  { id: "m18", category: "General", difficulty: "medium", q: "What is the chemical formula for table salt?", choices: ["NaCl", "KCl", "NaHCO3", "CaCO3"], answer: 0 },
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
