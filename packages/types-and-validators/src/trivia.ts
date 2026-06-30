// Bundled trivia bank + quiz selection. A quiz is generated (selected) on the
// client and stored inline in gameState.__trivia, so trivia needs no content
// table / RPC and ships over-the-air.
//
// AUTHORING RULES (from trivia_evals calibration — keep this bar):
//  - ACCURATE: exactly one defensible answer; no disputed/contested facts.
//  - HARD per tier: easy = solid general knowledge (not kids' level); medium =
//    real recall; hard = precise/specialist.
//  - DISTRACTORS MUST NOT GIVE IT AWAY: all four choices are the same type and
//    individually plausible, so you can't pick by inspection. NEVER use
//    spelling/letter/pattern questions ("which ends in 3 vowels") — the choices
//    expose the answer.
//  - NO REPEATS: keep the bank large so games rarely reuse a question.

export type Difficulty = "easy" | "medium" | "hard";
export type TriviaQuestion = {
  id: string;
  category: string;
  difficulty: Difficulty;
  q: string;
  choices: string[];
  answer: number; // index into choices
};

export type TriviaQuiz = {
  category: string;
  difficulty: Difficulty;
  questions: TriviaQuestion[];
};

export const TRIVIA_CATEGORIES = [
  "Science",
  "History",
  "Geography",
  "Sports",
  "Film & TV",
  "Art & Literature",
  "Music",
  "Nature",
] as const;

const BANK: TriviaQuestion[] = [
  // ============================ SCIENCE ============================
  { id: "sci-e1", category: "Science", difficulty: "easy", q: "Which planet is closest to the Sun?", choices: ["Mercury", "Venus", "Earth", "Mars"], answer: 0 },
  { id: "sci-e2", category: "Science", difficulty: "easy", q: "What is the largest organ in the human body?", choices: ["Skin", "Liver", "Brain", "Lungs"], answer: 0 },
  { id: "sci-e3", category: "Science", difficulty: "easy", q: "What type of animal is a dolphin?", choices: ["Mammal", "Fish", "Amphibian", "Reptile"], answer: 0 },
  { id: "sci-e4", category: "Science", difficulty: "easy", q: "Which gas makes up most of the air we breathe?", choices: ["Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen"], answer: 0 },
  { id: "sci-m1", category: "Science", difficulty: "medium", q: "What is the chemical symbol for iron?", choices: ["Fe", "Ir", "In", "Fr"], answer: 0 },
  { id: "sci-m2", category: "Science", difficulty: "medium", q: "What is the pH value of a neutral solution?", choices: ["7", "0", "14", "1"], answer: 0 },
  { id: "sci-m3", category: "Science", difficulty: "medium", q: "Which blood cells primarily fight infection?", choices: ["White blood cells", "Red blood cells", "Platelets", "Plasma cells"], answer: 0 },
  { id: "sci-m4", category: "Science", difficulty: "medium", q: "What is the atomic number of carbon?", choices: ["6", "12", "8", "14"], answer: 0 },
  { id: "sci-m5", category: "Science", difficulty: "medium", q: "What is the lightest element on the periodic table?", choices: ["Hydrogen", "Helium", "Lithium", "Carbon"], answer: 0 },
  { id: "sci-h1", category: "Science", difficulty: "hard", q: "What is the SI unit of force?", choices: ["Newton", "Joule", "Pascal", "Watt"], answer: 0 },
  { id: "sci-h2", category: "Science", difficulty: "hard", q: "Who formulated the three laws of planetary motion?", choices: ["Johannes Kepler", "Nicolaus Copernicus", "Galileo Galilei", "Tycho Brahe"], answer: 0 },
  { id: "sci-h3", category: "Science", difficulty: "hard", q: "What is the most abundant metal in the Earth's crust?", choices: ["Aluminum", "Iron", "Calcium", "Sodium"], answer: 0 },
  { id: "sci-h4", category: "Science", difficulty: "hard", q: "Which element has the chemical symbol 'K'?", choices: ["Potassium", "Krypton", "Calcium", "Carbon"], answer: 0 },
  { id: "sci-h5", category: "Science", difficulty: "hard", q: "In cellular biology, where does the citric acid cycle take place?", choices: ["Mitochondria", "Nucleus", "Ribosome", "Cytoplasm"], answer: 0 },

  // ============================ HISTORY ============================
  { id: "his-e1", category: "History", difficulty: "easy", q: "On which continent was ancient Egypt located?", choices: ["Africa", "Asia", "Europe", "South America"], answer: 0 },
  { id: "his-e2", category: "History", difficulty: "easy", q: "Who was the first President of the United States?", choices: ["George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams"], answer: 0 },
  { id: "his-e3", category: "History", difficulty: "easy", q: "The Roman Colosseum is located in which modern city?", choices: ["Rome", "Athens", "Cairo", "Istanbul"], answer: 0 },
  { id: "his-m1", category: "History", difficulty: "medium", q: "In what year did World War II end?", choices: ["1945", "1943", "1947", "1939"], answer: 0 },
  { id: "his-m2", category: "History", difficulty: "medium", q: "Which empire built Machu Picchu?", choices: ["Inca", "Aztec", "Maya", "Olmec"], answer: 0 },
  { id: "his-m3", category: "History", difficulty: "medium", q: "Who was the British Prime Minister for most of World War II?", choices: ["Winston Churchill", "Neville Chamberlain", "Clement Attlee", "Anthony Eden"], answer: 0 },
  { id: "his-m4", category: "History", difficulty: "medium", q: "The ancient city of Babylon was located in modern-day which country?", choices: ["Iraq", "Egypt", "Iran", "Syria"], answer: 0 },
  { id: "his-h1", category: "History", difficulty: "hard", q: "Who was the first emperor of Rome?", choices: ["Augustus", "Julius Caesar", "Nero", "Constantine"], answer: 0 },
  { id: "his-h2", category: "History", difficulty: "hard", q: "In what year did the French Revolution begin?", choices: ["1789", "1776", "1804", "1715"], answer: 0 },
  { id: "his-h3", category: "History", difficulty: "hard", q: "Which treaty formally ended World War I?", choices: ["Treaty of Versailles", "Treaty of Paris", "Treaty of Ghent", "Treaty of Trianon"], answer: 0 },
  { id: "his-h4", category: "History", difficulty: "hard", q: "Who was the last active ruler of the Ptolemaic Kingdom of Egypt?", choices: ["Cleopatra VII", "Nefertiti", "Hatshepsut", "Berenice IV"], answer: 0 },
  { id: "his-h5", category: "History", difficulty: "hard", q: "The Magna Carta was sealed during the reign of which English king?", choices: ["King John", "Henry VIII", "Richard I", "Edward I"], answer: 0 },

  // ============================ GEOGRAPHY ============================
  { id: "geo-e1", category: "Geography", difficulty: "easy", q: "What is the largest ocean on Earth?", choices: ["Pacific", "Atlantic", "Indian", "Arctic"], answer: 0 },
  { id: "geo-e2", category: "Geography", difficulty: "easy", q: "Which country is shaped like a boot?", choices: ["Italy", "Spain", "Greece", "Portugal"], answer: 0 },
  { id: "geo-e3", category: "Geography", difficulty: "easy", q: "The Great Barrier Reef is off the coast of which country?", choices: ["Australia", "Brazil", "Mexico", "Indonesia"], answer: 0 },
  { id: "geo-m1", category: "Geography", difficulty: "medium", q: "What is the capital of Canada?", choices: ["Ottawa", "Toronto", "Vancouver", "Montreal"], answer: 0 },
  { id: "geo-m2", category: "Geography", difficulty: "medium", q: "Mount Kilimanjaro is located in which country?", choices: ["Tanzania", "Kenya", "Uganda", "Ethiopia"], answer: 0 },
  { id: "geo-m3", category: "Geography", difficulty: "medium", q: "Which country has the largest population in Africa?", choices: ["Nigeria", "Egypt", "Ethiopia", "South Africa"], answer: 0 },
  { id: "geo-m4", category: "Geography", difficulty: "medium", q: "The Danube River flows through more countries than any other in the world. On which continent is it?", choices: ["Europe", "Asia", "Africa", "South America"], answer: 0 },
  { id: "geo-h1", category: "Geography", difficulty: "hard", q: "What is the capital of Mongolia?", choices: ["Ulaanbaatar", "Astana", "Bishkek", "Tashkent"], answer: 0 },
  { id: "geo-h2", category: "Geography", difficulty: "hard", q: "What is the capital of New Zealand?", choices: ["Wellington", "Auckland", "Christchurch", "Hamilton"], answer: 0 },
  { id: "geo-h3", category: "Geography", difficulty: "hard", q: "The Strait of Gibraltar connects the Atlantic Ocean to which sea?", choices: ["Mediterranean Sea", "Black Sea", "Red Sea", "Caspian Sea"], answer: 0 },
  { id: "geo-h4", category: "Geography", difficulty: "hard", q: "Which is the smallest country in the world by area?", choices: ["Vatican City", "Monaco", "Nauru", "San Marino"], answer: 0 },
  { id: "geo-h5", category: "Geography", difficulty: "hard", q: "What is the capital of Australia?", choices: ["Canberra", "Sydney", "Melbourne", "Perth"], answer: 0 },

  // ============================ SPORTS ============================
  { id: "sp-e1", category: "Sports", difficulty: "easy", q: "In which sport is the Ryder Cup contested?", choices: ["Golf", "Tennis", "Rowing", "Cycling"], answer: 0 },
  { id: "sp-e2", category: "Sports", difficulty: "easy", q: "Which sport uses a shuttlecock?", choices: ["Badminton", "Squash", "Table tennis", "Volleyball"], answer: 0 },
  { id: "sp-e3", category: "Sports", difficulty: "easy", q: "How many players from one team are on a basketball court at once?", choices: ["5", "6", "7", "11"], answer: 0 },
  { id: "sp-e4", category: "Sports", difficulty: "easy", q: "In tennis, what term denotes a score of zero?", choices: ["Love", "Deuce", "Ace", "Fault"], answer: 0 },
  { id: "sp-e5", category: "Sports", difficulty: "easy", q: "How many players per side are on the ice in ice hockey (including the goalie)?", choices: ["6", "5", "7", "11"], answer: 0 },
  { id: "sp-m1", category: "Sports", difficulty: "medium", q: "How often are the Summer Olympic Games held?", choices: ["Every 4 years", "Every 2 years", "Every 3 years", "Every 5 years"], answer: 0 },
  { id: "sp-m2", category: "Sports", difficulty: "medium", q: "In which country did the martial art judo originate?", choices: ["Japan", "China", "South Korea", "Thailand"], answer: 0 },
  { id: "sp-m3", category: "Sports", difficulty: "medium", q: "How many players are on a cricket team?", choices: ["11", "9", "10", "13"], answer: 0 },
  { id: "sp-m4", category: "Sports", difficulty: "medium", q: "Which country has won the most FIFA World Cups?", choices: ["Brazil", "Germany", "Italy", "Argentina"], answer: 0 },
  { id: "sp-m5", category: "Sports", difficulty: "medium", q: "How many points is a touchdown worth in American football (before the extra point)?", choices: ["6", "7", "3", "5"], answer: 0 },
  { id: "sp-h1", category: "Sports", difficulty: "hard", q: "Which boxer defeated George Foreman in the 1974 'Rumble in the Jungle'?", choices: ["Muhammad Ali", "Joe Frazier", "Sonny Liston", "Ken Norton"], answer: 0 },
  { id: "sp-h2", category: "Sports", difficulty: "hard", q: "In which year were the first modern Olympic Games held?", choices: ["1896", "1900", "1888", "1924"], answer: 0 },
  { id: "sp-h3", category: "Sports", difficulty: "hard", q: "In golf, what is two strokes under par on a single hole called?", choices: ["Eagle", "Birdie", "Albatross", "Bogey"], answer: 0 },
  { id: "sp-h4", category: "Sports", difficulty: "hard", q: "A marathon is approximately how many miles long?", choices: ["26.2", "24.2", "28.2", "30.0"], answer: 0 },

  // ============================ FILM & TV ============================
  { id: "film-e1", category: "Film & TV", difficulty: "easy", q: "In Disney's 'The Lion King', what kind of animal is Simba?", choices: ["Lion", "Tiger", "Leopard", "Cheetah"], answer: 0 },
  { id: "film-e2", category: "Film & TV", difficulty: "easy", q: "The line 'May the Force be with you' is from which franchise?", choices: ["Star Wars", "Star Trek", "Dune", "Avatar"], answer: 0 },
  { id: "film-e3", category: "Film & TV", difficulty: "easy", q: "What is the name of the wizarding school in the Harry Potter series?", choices: ["Hogwarts", "Durmstrang", "Beauxbatons", "Ilvermorny"], answer: 0 },
  { id: "film-m1", category: "Film & TV", difficulty: "medium", q: "Who directed the 1975 film 'Jaws'?", choices: ["Steven Spielberg", "George Lucas", "Ridley Scott", "Brian De Palma"], answer: 0 },
  { id: "film-m2", category: "Film & TV", difficulty: "medium", q: "In Star Wars, what is the name of Han Solo's ship?", choices: ["Millennium Falcon", "Slave I", "Tantive IV", "The Ghost"], answer: 0 },
  { id: "film-m3", category: "Film & TV", difficulty: "medium", q: "Which actor played the title role in 'Forrest Gump'?", choices: ["Tom Hanks", "Kevin Costner", "Bill Murray", "Tom Cruise"], answer: 0 },
  { id: "film-m4", category: "Film & TV", difficulty: "medium", q: "The TV series 'Breaking Bad' is primarily set in which U.S. city?", choices: ["Albuquerque", "Phoenix", "Denver", "El Paso"], answer: 0 },
  { id: "film-h1", category: "Film & TV", difficulty: "hard", q: "Which film won the very first Academy Award for Best Picture (1929)?", choices: ["Wings", "Sunrise", "The Jazz Singer", "Metropolis"], answer: 0 },
  { id: "film-h2", category: "Film & TV", difficulty: "hard", q: "In 'Blade Runner', what are the bioengineered artificial humans called?", choices: ["Replicants", "Synths", "Cylons", "Androids"], answer: 0 },
  { id: "film-h3", category: "Film & TV", difficulty: "hard", q: "Who composed the score for the original 1977 'Star Wars' film?", choices: ["John Williams", "Hans Zimmer", "Ennio Morricone", "Jerry Goldsmith"], answer: 0 },
  { id: "film-h4", category: "Film & TV", difficulty: "hard", q: "Who directed 'Pulp Fiction'?", choices: ["Quentin Tarantino", "Martin Scorsese", "Paul Thomas Anderson", "David Fincher"], answer: 0 },

  // ======================= ART & LITERATURE =======================
  { id: "art-e1", category: "Art & Literature", difficulty: "easy", q: "Who wrote the play 'Romeo and Juliet'?", choices: ["William Shakespeare", "Charles Dickens", "Jane Austen", "Mark Twain"], answer: 0 },
  { id: "art-e2", category: "Art & Literature", difficulty: "easy", q: "Which artist painted the 'Mona Lisa'?", choices: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Caravaggio"], answer: 0 },
  { id: "art-e3", category: "Art & Literature", difficulty: "easy", q: "'The Starry Night' was painted by which artist?", choices: ["Vincent van Gogh", "Claude Monet", "Paul Cezanne", "Edvard Munch"], answer: 0 },
  { id: "art-m1", category: "Art & Literature", difficulty: "medium", q: "Who painted the ceiling of the Sistine Chapel?", choices: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Botticelli"], answer: 0 },
  { id: "art-m2", category: "Art & Literature", difficulty: "medium", q: "Who wrote the dystopian novel '1984'?", choices: ["George Orwell", "Aldous Huxley", "Ray Bradbury", "H.G. Wells"], answer: 0 },
  { id: "art-m3", category: "Art & Literature", difficulty: "medium", q: "Salvador Dali is most associated with which art movement?", choices: ["Surrealism", "Cubism", "Impressionism", "Fauvism"], answer: 0 },
  { id: "art-h1", category: "Art & Literature", difficulty: "hard", q: "Who painted 'Guernica'?", choices: ["Pablo Picasso", "Salvador Dali", "Joan Miro", "Francisco Goya"], answer: 0 },
  { id: "art-h2", category: "Art & Literature", difficulty: "hard", q: "Which novel famously opens with the line 'Call me Ishmael'?", choices: ["Moby-Dick", "Treasure Island", "The Old Man and the Sea", "Robinson Crusoe"], answer: 0 },
  { id: "art-h3", category: "Art & Literature", difficulty: "hard", q: "Who wrote the epic novel 'War and Peace'?", choices: ["Leo Tolstoy", "Fyodor Dostoevsky", "Anton Chekhov", "Maxim Gorky"], answer: 0 },
  { id: "art-h4", category: "Art & Literature", difficulty: "hard", q: "Who wrote 'The Divine Comedy'?", choices: ["Dante Alighieri", "Petrarch", "Giovanni Boccaccio", "Virgil"], answer: 0 },
  { id: "art-h5", category: "Art & Literature", difficulty: "hard", q: "Who sculpted the marble statue of 'David' in Florence?", choices: ["Michelangelo", "Donatello", "Gian Lorenzo Bernini", "Benvenuto Cellini"], answer: 0 },

  // ============================ MUSIC ============================
  { id: "mus-e1", category: "Music", difficulty: "easy", q: "Which instrument has 88 keys?", choices: ["Piano", "Organ", "Harpsichord", "Accordion"], answer: 0 },
  { id: "mus-e2", category: "Music", difficulty: "easy", q: "The Beatles formed in which English city?", choices: ["Liverpool", "London", "Manchester", "Birmingham"], answer: 0 },
  { id: "mus-e3", category: "Music", difficulty: "easy", q: "Which artist is widely known as the 'King of Pop'?", choices: ["Michael Jackson", "Elvis Presley", "Prince", "James Brown"], answer: 0 },
  { id: "mus-m1", category: "Music", difficulty: "medium", q: "Which composer wrote 'The Four Seasons'?", choices: ["Antonio Vivaldi", "Johann Sebastian Bach", "Wolfgang Mozart", "George Handel"], answer: 0 },
  { id: "mus-m2", category: "Music", difficulty: "medium", q: "'Bohemian Rhapsody' was a hit single for which band?", choices: ["Queen", "Led Zeppelin", "The Who", "Pink Floyd"], answer: 0 },
  { id: "mus-m3", category: "Music", difficulty: "medium", q: "How many strings does a standard violin have?", choices: ["4", "5", "6", "7"], answer: 0 },
  { id: "mus-m4", category: "Music", difficulty: "medium", q: "In music, what does the term 'forte' instruct a player to do?", choices: ["Play loudly", "Play softly", "Play faster", "Play slower"], answer: 0 },
  { id: "mus-h1", category: "Music", difficulty: "hard", q: "Who composed the opera 'The Magic Flute'?", choices: ["Wolfgang Amadeus Mozart", "Richard Wagner", "Giuseppe Verdi", "Giacomo Puccini"], answer: 0 },
  { id: "mus-h2", category: "Music", difficulty: "hard", q: "How many completed symphonies did Ludwig van Beethoven write?", choices: ["9", "7", "12", "5"], answer: 0 },
  { id: "mus-h3", category: "Music", difficulty: "hard", q: "In 4/4 time, how many beats does a whole note receive?", choices: ["4", "2", "1", "8"], answer: 0 },
  { id: "mus-h4", category: "Music", difficulty: "hard", q: "Which composer wrote the 'Brandenburg Concertos'?", choices: ["Johann Sebastian Bach", "Antonio Vivaldi", "George Handel", "Georg Telemann"], answer: 0 },

  // ============================ NATURE ============================
  { id: "nat-e1", category: "Nature", difficulty: "easy", q: "What is the largest land animal?", choices: ["African elephant", "Hippopotamus", "Rhinoceros", "Giraffe"], answer: 0 },
  { id: "nat-e2", category: "Nature", difficulty: "easy", q: "How many legs does an insect have?", choices: ["6", "8", "4", "10"], answer: 0 },
  { id: "nat-e3", category: "Nature", difficulty: "easy", q: "What do bees gather from flowers to make honey?", choices: ["Nectar", "Pollen", "Sap", "Dew"], answer: 0 },
  { id: "nat-m1", category: "Nature", difficulty: "medium", q: "What is the fastest land animal over a short sprint?", choices: ["Cheetah", "Pronghorn", "Lion", "Gazelle"], answer: 0 },
  { id: "nat-m2", category: "Nature", difficulty: "medium", q: "A group of lions is called a what?", choices: ["Pride", "Pack", "Herd", "Troop"], answer: 0 },
  { id: "nat-m3", category: "Nature", difficulty: "medium", q: "What is the largest living species of fish?", choices: ["Whale shark", "Great white shark", "Manta ray", "Sturgeon"], answer: 0 },
  { id: "nat-m4", category: "Nature", difficulty: "medium", q: "What is a baby kangaroo called?", choices: ["Joey", "Cub", "Calf", "Kit"], answer: 0 },
  { id: "nat-m5", category: "Nature", difficulty: "medium", q: "What is the largest living species of bird?", choices: ["Ostrich", "Emu", "Cassowary", "Andean condor"], answer: 0 },
  { id: "nat-h1", category: "Nature", difficulty: "hard", q: "What is the only mammal capable of true sustained flight?", choices: ["Bat", "Flying squirrel", "Colugo", "Sugar glider"], answer: 0 },
  { id: "nat-h2", category: "Nature", difficulty: "hard", q: "How many hearts does an octopus have?", choices: ["3", "1", "2", "4"], answer: 0 },
  { id: "nat-h3", category: "Nature", difficulty: "hard", q: "The axolotl, a salamander that stays aquatic for life, is native to which country?", choices: ["Mexico", "Brazil", "Japan", "Australia"], answer: 0 },
  { id: "nat-h4", category: "Nature", difficulty: "hard", q: "What is the largest animal known to have ever lived?", choices: ["Blue whale", "Argentinosaurus", "Sperm whale", "African elephant"], answer: 0 },
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

export const generateTrivia = (
  difficulty: Difficulty,
  seed: number,
  category?: string,
  // Question ids the player has already seen — excluded so quizzes don't repeat
  // until the relevant pool is exhausted (then it resets to the full pool).
  excludeIds?: string[]
): TriviaQuiz => {
  const rng = makeRng(seed);
  let pool = BANK.filter((q) => q.difficulty === difficulty);
  if (category && category !== "Any")
    pool = pool.filter((q) => q.category === category);
  if (pool.length < TRIVIA_COUNT) {
    pool =
      category && category !== "Any"
        ? BANK.filter((q) => q.category === category)
        : BANK.filter((q) => q.difficulty === difficulty);
  }
  if (pool.length < TRIVIA_COUNT) pool = [...BANK];
  // Prefer questions the player hasn't seen. Only honor the exclusion if it
  // still leaves a full quiz's worth; otherwise keep the full pool so the
  // player replays old questions rather than getting a short quiz.
  if (excludeIds && excludeIds.length) {
    const seen = new Set(excludeIds);
    const unseen = pool.filter((q) => !seen.has(q.id));
    if (unseen.length >= TRIVIA_COUNT) pool = unseen;
  }
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Shuffle each question's choices too, so the correct answer isn't always in
  // the same slot (the bank authors the answer first for readability).
  const questions = arr.slice(0, TRIVIA_COUNT).map((qn) => {
    const order = qn.choices.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      ...qn,
      choices: order.map((i) => qn.choices[i]),
      answer: order.indexOf(qn.answer),
    };
  });
  return { category: category ?? "Any", difficulty, questions };
};

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
