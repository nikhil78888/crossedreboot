"use strict";
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.triviaCorrectCount = exports.triviaProgress = exports.generateTrivia = exports.TRIVIA_COUNT = exports.TRIVIA_CATEGORIES = void 0;
exports.TRIVIA_CATEGORIES = [
    "Science",
    "History",
    "Geography",
    "Sports",
    "Film & TV",
    "Art & Literature",
    "Music",
    "Nature",
];
var BANK = [
    // =========================== SCIENCE ===========================
    { id: "sci-e1", category: "Science", difficulty: "easy", q: "Which planet is closest to the Sun?", choices: ["Mercury", "Venus", "Earth", "Mars"], answer: 0 },
    { id: "sci-e2", category: "Science", difficulty: "easy", q: "What gas do humans need to breathe to survive?", choices: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], answer: 0 },
    { id: "sci-e3", category: "Science", difficulty: "easy", q: "What is the largest planet in our solar system?", choices: ["Jupiter", "Saturn", "Neptune", "Earth"], answer: 0 },
    { id: "sci-e4", category: "Science", difficulty: "easy", q: "What is the chemical formula for water?", choices: ["H2O", "CO2", "O2", "NaCl"], answer: 0 },
    { id: "sci-m1", category: "Science", difficulty: "medium", q: "What is the chemical symbol for gold?", choices: ["Au", "Ag", "Gd", "Go"], answer: 0 },
    { id: "sci-m2", category: "Science", difficulty: "medium", q: "Which gas is the most abundant in Earth's atmosphere?", choices: ["Nitrogen", "Oxygen", "Carbon dioxide", "Argon"], answer: 0 },
    { id: "sci-m3", category: "Science", difficulty: "medium", q: "Which part of the cell is known as its powerhouse?", choices: ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"], answer: 0 },
    { id: "sci-m4", category: "Science", difficulty: "medium", q: "How many chromosomes are in a typical human body cell?", choices: ["46", "23", "44", "48"], answer: 0 },
    { id: "sci-m5", category: "Science", difficulty: "medium", q: "What is the hardest naturally occurring material?", choices: ["Diamond", "Quartz", "Titanium", "Granite"], answer: 0 },
    { id: "sci-h1", category: "Science", difficulty: "hard", q: "Which quantum number determines the shape of an electron orbital?", choices: ["Azimuthal", "Principal", "Magnetic", "Spin"], answer: 0 },
    { id: "sci-h2", category: "Science", difficulty: "hard", q: "In the Standard Model, which boson mediates the strong nuclear force?", choices: ["Gluon", "W boson", "Photon", "Higgs boson"], answer: 0 },
    { id: "sci-h3", category: "Science", difficulty: "hard", q: "The Chandrasekhar limit for a white dwarf is approximately how many solar masses?", choices: ["1.4", "0.6", "2.9", "3.8"], answer: 0 },
    { id: "sci-h4", category: "Science", difficulty: "hard", q: "Which of the twenty standard amino acids is achiral?", choices: ["Glycine", "Alanine", "Serine", "Proline"], answer: 0 },
    { id: "sci-h5", category: "Science", difficulty: "hard", q: "The oxygen-evolving complex of Photosystem II is a cluster built around which metal?", choices: ["Manganese", "Magnesium", "Iron", "Copper"], answer: 0 },
    // =========================== HISTORY ===========================
    { id: "his-e1", category: "History", difficulty: "easy", q: "Who was the first President of the United States?", choices: ["George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams"], answer: 0 },
    { id: "his-e2", category: "History", difficulty: "easy", q: "The ancient pyramids of Giza are located in which country?", choices: ["Egypt", "Iraq", "Greece", "Mexico"], answer: 0 },
    { id: "his-e3", category: "History", difficulty: "easy", q: "Which passenger ship sank in 1912 after hitting an iceberg?", choices: ["Titanic", "Lusitania", "Britannic", "Mayflower"], answer: 0 },
    { id: "his-e4", category: "History", difficulty: "easy", q: "Who was the first person to walk on the Moon?", choices: ["Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "John Glenn"], answer: 0 },
    { id: "his-m1", category: "History", difficulty: "medium", q: "In which year did World War I begin?", choices: ["1914", "1912", "1918", "1908"], answer: 0 },
    { id: "his-m2", category: "History", difficulty: "medium", q: "Who was the British Prime Minister for most of World War II?", choices: ["Winston Churchill", "Neville Chamberlain", "Clement Attlee", "Anthony Eden"], answer: 0 },
    { id: "his-m3", category: "History", difficulty: "medium", q: "In which year did the French Revolution begin?", choices: ["1789", "1776", "1804", "1750"], answer: 0 },
    { id: "his-m4", category: "History", difficulty: "medium", q: "In which year did Christopher Columbus first reach the Americas?", choices: ["1492", "1620", "1776", "1453"], answer: 0 },
    { id: "his-m5", category: "History", difficulty: "medium", q: "The ancient Hanging Gardens were said to be in which city?", choices: ["Babylon", "Athens", "Rome", "Cairo"], answer: 0 },
    { id: "his-h1", category: "History", difficulty: "hard", q: "At the 751 Battle of Talas, the Abbasid Caliphate defeated the army of which Chinese dynasty?", choices: ["Tang", "Song", "Sui", "Han"], answer: 0 },
    { id: "his-h2", category: "History", difficulty: "hard", q: "Who founded the Maurya Empire of ancient India?", choices: ["Chandragupta Maurya", "Ashoka", "Bindusara", "Bimbisara"], answer: 0 },
    { id: "his-h3", category: "History", difficulty: "hard", q: "The 1591 Battle of Tondibi saw a Moroccan army shatter which West African empire?", choices: ["Songhai", "Mali", "Kongo", "Ashanti"], answer: 0 },
    { id: "his-h4", category: "History", difficulty: "hard", q: "Who was the reigning Zulu king during the 1879 Anglo-Zulu War?", choices: ["Cetshwayo kaMpande", "Shaka", "Dingane", "Mpande"], answer: 0 },
    { id: "his-h5", category: "History", difficulty: "hard", q: "The devastating An Lushan Rebellion against Tang China broke out in which year?", choices: ["755", "712", "763", "781"], answer: 0 },
    // ========================== GEOGRAPHY ==========================
    { id: "geo-e1", category: "Geography", difficulty: "easy", q: "What is the capital of France?", choices: ["Paris", "London", "Rome", "Berlin"], answer: 0 },
    { id: "geo-e2", category: "Geography", difficulty: "easy", q: "Which is the largest ocean on Earth?", choices: ["Pacific", "Atlantic", "Indian", "Arctic"], answer: 0 },
    { id: "geo-e3", category: "Geography", difficulty: "easy", q: "On which continent is the Sahara Desert?", choices: ["Africa", "Asia", "Australia", "South America"], answer: 0 },
    { id: "geo-e4", category: "Geography", difficulty: "easy", q: "Which European country is shaped like a boot?", choices: ["Italy", "Spain", "Greece", "Portugal"], answer: 0 },
    { id: "geo-m1", category: "Geography", difficulty: "medium", q: "What is the capital of Canada?", choices: ["Ottawa", "Toronto", "Vancouver", "Montreal"], answer: 0 },
    { id: "geo-m2", category: "Geography", difficulty: "medium", q: "What is the capital of Australia?", choices: ["Canberra", "Sydney", "Melbourne", "Brisbane"], answer: 0 },
    { id: "geo-m3", category: "Geography", difficulty: "medium", q: "The salt lake bordered by Israel and Jordan is known as the what?", choices: ["Dead Sea", "Red Sea", "Caspian Sea", "Black Sea"], answer: 0 },
    { id: "geo-m4", category: "Geography", difficulty: "medium", q: "Which African country was historically known as Abyssinia?", choices: ["Ethiopia", "Kenya", "Sudan", "Somalia"], answer: 0 },
    { id: "geo-m5", category: "Geography", difficulty: "medium", q: "The Great Barrier Reef lies off the coast of which country?", choices: ["Australia", "Brazil", "Thailand", "Mexico"], answer: 0 },
    { id: "geo-h1", category: "Geography", difficulty: "hard", q: "Counting its overseas territories, which country spans the most time zones?", choices: ["France", "Russia", "United States", "United Kingdom"], answer: 0 },
    { id: "geo-h2", category: "Geography", difficulty: "hard", q: "What is the deepest lake in the world?", choices: ["Lake Baikal", "Lake Tanganyika", "Caspian Sea", "Lake Malawi"], answer: 0 },
    { id: "geo-h3", category: "Geography", difficulty: "hard", q: "The Wakhan Corridor gives Afghanistan a narrow border with which country?", choices: ["China", "Tajikistan", "India", "Turkmenistan"], answer: 0 },
    { id: "geo-h4", category: "Geography", difficulty: "hard", q: "At which city do the Blue Nile and White Nile converge?", choices: ["Khartoum", "Cairo", "Aswan", "Juba"], answer: 0 },
    { id: "geo-h5", category: "Geography", difficulty: "hard", q: "What is the southernmost capital city of any sovereign state?", choices: ["Wellington", "Canberra", "Santiago", "Buenos Aires"], answer: 0 },
    // ============================ SPORTS ============================
    { id: "spo-e1", category: "Sports", difficulty: "easy", q: "How many players from one team are on the field in soccer?", choices: ["11", "9", "10", "12"], answer: 0 },
    { id: "spo-e2", category: "Sports", difficulty: "easy", q: "In which sport would you perform a slam dunk?", choices: ["Basketball", "Tennis", "Golf", "Cricket"], answer: 0 },
    { id: "spo-e3", category: "Sports", difficulty: "easy", q: "In golf, what is a score of one stroke under par on a hole called?", choices: ["Birdie", "Eagle", "Bogey", "Par"], answer: 0 },
    { id: "spo-e4", category: "Sports", difficulty: "easy", q: "What color card does a soccer referee show to send a player off?", choices: ["Red", "Yellow", "Blue", "Green"], answer: 0 },
    { id: "spo-m1", category: "Sports", difficulty: "medium", q: "Which country has won the most FIFA World Cup titles?", choices: ["Brazil", "Germany", "Italy", "Argentina"], answer: 0 },
    { id: "spo-m2", category: "Sports", difficulty: "medium", q: "How many points is a touchdown worth in American football (before the extra point)?", choices: ["6", "7", "3", "5"], answer: 0 },
    { id: "spo-m3", category: "Sports", difficulty: "medium", q: "How many Grand Slam tournaments are played in tennis each year?", choices: ["4", "3", "5", "2"], answer: 0 },
    { id: "spo-m4", category: "Sports", difficulty: "medium", q: "The Ashes is a Test cricket rivalry between England and which country?", choices: ["Australia", "India", "South Africa", "New Zealand"], answer: 0 },
    { id: "spo-m5", category: "Sports", difficulty: "medium", q: "How many players from one team are on a basketball court at once?", choices: ["5", "6", "7", "4"], answer: 0 },
    { id: "spo-h1", category: "Sports", difficulty: "hard", q: "Which team won the first Formula 1 World Constructors' Championship in 1958?", choices: ["Vanwall", "Ferrari", "Cooper", "Maserati"], answer: 0 },
    { id: "spo-h2", category: "Sports", difficulty: "hard", q: "Who was the first gymnast to score a perfect 10 at the Olympic Games?", choices: ["Nadia Comaneci", "Olga Korbut", "Vera Caslavska", "Ludmilla Tourischeva"], answer: 0 },
    { id: "spo-h3", category: "Sports", difficulty: "hard", q: "Which team won the inaugural Rugby World Cup in 1987?", choices: ["New Zealand", "Australia", "France", "England"], answer: 0 },
    { id: "spo-h4", category: "Sports", difficulty: "hard", q: "Boxer Jack Dempsey was known by which nickname?", choices: ["The Manassa Mauler", "The Brown Bomber", "The Cinderella Man", "The Galveston Giant"], answer: 0 },
    { id: "spo-h5", category: "Sports", difficulty: "hard", q: "Which racehorse won the U.S. Triple Crown in 1973 in record-setting times?", choices: ["Secretariat", "Seattle Slew", "Affirmed", "Citation"], answer: 0 },
    // ========================== FILM & TV ==========================
    { id: "film-e1", category: "Film & TV", difficulty: "easy", q: "What is the name of the wizarding school in Harry Potter?", choices: ["Hogwarts", "Narnia", "Neverland", "Camelot"], answer: 0 },
    { id: "film-e2", category: "Film & TV", difficulty: "easy", q: "In Disney's 'The Lion King', what is the name of the young lion hero?", choices: ["Simba", "Mufasa", "Scar", "Nala"], answer: 0 },
    { id: "film-e3", category: "Film & TV", difficulty: "easy", q: "Which sci-fi franchise features the line 'May the Force be with you'?", choices: ["Star Wars", "Star Trek", "Avatar", "Alien"], answer: 0 },
    { id: "film-e4", category: "Film & TV", difficulty: "easy", q: "Which animated film features a snow queen named Elsa?", choices: ["Frozen", "Moana", "Tangled", "Brave"], answer: 0 },
    { id: "film-m1", category: "Film & TV", difficulty: "medium", q: "Who directed 'Jaws', 'E.T.', and 'Jurassic Park'?", choices: ["Steven Spielberg", "George Lucas", "James Cameron", "Ridley Scott"], answer: 0 },
    { id: "film-m2", category: "Film & TV", difficulty: "medium", q: "Which actor played Jack in the 1997 film 'Titanic'?", choices: ["Leonardo DiCaprio", "Brad Pitt", "Tom Cruise", "Johnny Depp"], answer: 0 },
    { id: "film-m3", category: "Film & TV", difficulty: "medium", q: "Which actor played Iron Man in the Marvel films?", choices: ["Robert Downey Jr.", "Chris Evans", "Chris Hemsworth", "Mark Ruffalo"], answer: 0 },
    { id: "film-m4", category: "Film & TV", difficulty: "medium", q: "The sitcom 'Friends' is set in which city?", choices: ["New York", "Los Angeles", "Chicago", "Boston"], answer: 0 },
    { id: "film-m5", category: "Film & TV", difficulty: "medium", q: "Which film features the line 'I'm going to make him an offer he can't refuse'?", choices: ["The Godfather", "Goodfellas", "Scarface", "Casino"], answer: 0 },
    { id: "film-h1", category: "Film & TV", difficulty: "hard", q: "Who directed the 1920 German Expressionist landmark 'The Cabinet of Dr. Caligari'?", choices: ["Robert Wiene", "F.W. Murnau", "Fritz Lang", "G.W. Pabst"], answer: 0 },
    { id: "film-h2", category: "Film & TV", difficulty: "hard", q: "Who directed the 1925 Soviet montage classic 'Battleship Potemkin'?", choices: ["Sergei Eisenstein", "Vsevolod Pudovkin", "Dziga Vertov", "Lev Kuleshov"], answer: 0 },
    { id: "film-h3", category: "Film & TV", difficulty: "hard", q: "Who directed the 1939 French masterpiece 'The Rules of the Game'?", choices: ["Jean Renoir", "Marcel Carne", "Rene Clair", "Julien Duvivier"], answer: 0 },
    { id: "film-h4", category: "Film & TV", difficulty: "hard", q: "Who directed the 1957 Swedish film 'Wild Strawberries'?", choices: ["Ingmar Bergman", "Victor Sjostrom", "Bo Widerberg", "Jan Troell"], answer: 0 },
    { id: "film-h5", category: "Film & TV", difficulty: "hard", q: "Which film was the first Latin American winner of the Best Foreign Language Film Oscar?", choices: ["The Official Story", "City of God", "Amores Perros", "Central Station"], answer: 0 },
    // ======================= ART & LITERATURE =======================
    { id: "lit-e1", category: "Art & Literature", difficulty: "easy", q: "Who wrote the play 'Romeo and Juliet'?", choices: ["William Shakespeare", "Charles Dickens", "Jane Austen", "Mark Twain"], answer: 0 },
    { id: "lit-e2", category: "Art & Literature", difficulty: "easy", q: "Who painted the 'Mona Lisa'?", choices: ["Leonardo da Vinci", "Michelangelo", "Pablo Picasso", "Vincent van Gogh"], answer: 0 },
    { id: "lit-e3", category: "Art & Literature", difficulty: "easy", q: "Which painter famously cut off part of his own ear?", choices: ["Vincent van Gogh", "Claude Monet", "Salvador Dali", "Edvard Munch"], answer: 0 },
    { id: "lit-e4", category: "Art & Literature", difficulty: "easy", q: "Who wrote 'A Christmas Carol'?", choices: ["Charles Dickens", "Leo Tolstoy", "Oscar Wilde", "Mark Twain"], answer: 0 },
    { id: "lit-m1", category: "Art & Literature", difficulty: "medium", q: "Who wrote the novel 'War and Peace'?", choices: ["Leo Tolstoy", "Fyodor Dostoevsky", "Anton Chekhov", "Boris Pasternak"], answer: 0 },
    { id: "lit-m2", category: "Art & Literature", difficulty: "medium", q: "Who painted the anti-war mural 'Guernica'?", choices: ["Pablo Picasso", "Salvador Dali", "Joan Miro", "Diego Rivera"], answer: 0 },
    { id: "lit-m3", category: "Art & Literature", difficulty: "medium", q: "Who wrote 'Pride and Prejudice'?", choices: ["Jane Austen", "Emily Bronte", "George Eliot", "Virginia Woolf"], answer: 0 },
    { id: "lit-m4", category: "Art & Literature", difficulty: "medium", q: "Which Renaissance artist sculpted the marble statue 'David'?", choices: ["Michelangelo", "Donatello", "Bernini", "Auguste Rodin"], answer: 0 },
    { id: "lit-m5", category: "Art & Literature", difficulty: "medium", q: "Which ancient Greek poet is credited with the 'Iliad' and the 'Odyssey'?", choices: ["Homer", "Virgil", "Sophocles", "Plato"], answer: 0 },
    { id: "lit-h1", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Portuguese epic poem 'The Lusiads'?", choices: ["Luis de Camoes", "Fernando Pessoa", "Eca de Queiros", "Jose Saramago"], answer: 0 },
    { id: "lit-h2", category: "Art & Literature", difficulty: "hard", q: "Which Spanish painter created 'Las Meninas'?", choices: ["Diego Velazquez", "Bartolome Murillo", "Francisco de Zurbaran", "El Greco"], answer: 0 },
    { id: "lit-h3", category: "Art & Literature", difficulty: "hard", q: "Which Heian-era court lady wrote 'The Tale of Genji'?", choices: ["Murasaki Shikibu", "Sei Shonagon", "Yosano Akiko", "Ki no Tsurayuki"], answer: 0 },
    { id: "lit-h4", category: "Art & Literature", difficulty: "hard", q: "Which architect founded the Bauhaus school in Weimar in 1919?", choices: ["Walter Gropius", "Ludwig Mies van der Rohe", "Le Corbusier", "Marcel Breuer"], answer: 0 },
    { id: "lit-h5", category: "Art & Literature", difficulty: "hard", q: "Which Icelandic Nobel laureate wrote 'Independent People'?", choices: ["Halldor Laxness", "Knut Hamsun", "Sigrid Undset", "Selma Lagerlof"], answer: 0 },
    // ============================ MUSIC ============================
    { id: "mus-e1", category: "Music", difficulty: "easy", q: "Which instrument has 88 keys?", choices: ["Piano", "Guitar", "Violin", "Flute"], answer: 0 },
    { id: "mus-e2", category: "Music", difficulty: "easy", q: "Which band recorded the song 'Hey Jude'?", choices: ["The Beatles", "The Rolling Stones", "Queen", "The Who"], answer: 0 },
    { id: "mus-e3", category: "Music", difficulty: "easy", q: "Michael Jackson is widely known as the 'King of' which genre?", choices: ["Pop", "Rock", "Soul", "Jazz"], answer: 0 },
    { id: "mus-e4", category: "Music", difficulty: "easy", q: "How many strings does a standard guitar have?", choices: ["6", "4", "5", "7"], answer: 0 },
    { id: "mus-m1", category: "Music", difficulty: "medium", q: "Which composer wrote the ballet 'The Nutcracker'?", choices: ["Tchaikovsky", "Beethoven", "Mozart", "Bach"], answer: 0 },
    { id: "mus-m2", category: "Music", difficulty: "medium", q: "'Bohemian Rhapsody' was a hit for which band?", choices: ["Queen", "Led Zeppelin", "Pink Floyd", "The Eagles"], answer: 0 },
    { id: "mus-m3", category: "Music", difficulty: "medium", q: "Which famous composer continued writing music after becoming deaf?", choices: ["Beethoven", "Mozart", "Chopin", "Handel"], answer: 0 },
    { id: "mus-m4", category: "Music", difficulty: "medium", q: "In music, the term 'forte' instructs a player to do what?", choices: ["Play loudly", "Play softly", "Play faster", "Play slower"], answer: 0 },
    { id: "mus-m5", category: "Music", difficulty: "medium", q: "How many strings does a standard violin have?", choices: ["4", "5", "6", "3"], answer: 0 },
    { id: "mus-h1", category: "Music", difficulty: "hard", q: "Who composed the expressionist opera 'Wozzeck', premiered in 1925?", choices: ["Alban Berg", "Arnold Schoenberg", "Anton Webern", "Paul Hindemith"], answer: 0 },
    { id: "mus-h2", category: "Music", difficulty: "hard", q: "Which composer wrote the 'Turangalila-Symphonie', scored for piano and ondes Martenot?", choices: ["Olivier Messiaen", "Pierre Boulez", "Darius Milhaud", "Arthur Honegger"], answer: 0 },
    { id: "mus-h3", category: "Music", difficulty: "hard", q: "Who composed the 1945 opera 'Peter Grimes'?", choices: ["Benjamin Britten", "Michael Tippett", "Ralph Vaughan Williams", "William Walton"], answer: 0 },
    { id: "mus-h4", category: "Music", difficulty: "hard", q: "Which composer wrote the 'Symphonie fantastique' in 1830?", choices: ["Hector Berlioz", "Franz Liszt", "Robert Schumann", "Felix Mendelssohn"], answer: 0 },
    { id: "mus-h5", category: "Music", difficulty: "hard", q: "Which composer pioneered the twelve-tone serial technique?", choices: ["Arnold Schoenberg", "Alban Berg", "Anton Webern", "Igor Stravinsky"], answer: 0 },
    // ============================ NATURE ============================
    { id: "nat-e1", category: "Nature", difficulty: "easy", q: "What is the largest land animal?", choices: ["African elephant", "Giraffe", "Rhinoceros", "Hippopotamus"], answer: 0 },
    { id: "nat-e2", category: "Nature", difficulty: "easy", q: "How many legs does an insect have?", choices: ["6", "8", "4", "10"], answer: 0 },
    { id: "nat-e3", category: "Nature", difficulty: "easy", q: "Which big cat is known as the 'King of the Jungle'?", choices: ["Lion", "Tiger", "Leopard", "Cheetah"], answer: 0 },
    { id: "nat-e4", category: "Nature", difficulty: "easy", q: "What do bees collect from flowers to make honey?", choices: ["Nectar", "Pollen", "Sap", "Water"], answer: 0 },
    { id: "nat-m1", category: "Nature", difficulty: "medium", q: "What is the fastest land animal over a short sprint?", choices: ["Cheetah", "Lion", "Pronghorn", "Gazelle"], answer: 0 },
    { id: "nat-m2", category: "Nature", difficulty: "medium", q: "A group of lions is called a what?", choices: ["Pride", "Pack", "Herd", "Flock"], answer: 0 },
    { id: "nat-m3", category: "Nature", difficulty: "medium", q: "Which is the only mammal capable of true sustained flight?", choices: ["Bat", "Flying squirrel", "Sugar glider", "Colugo"], answer: 0 },
    { id: "nat-m4", category: "Nature", difficulty: "medium", q: "What is a baby kangaroo called?", choices: ["Joey", "Cub", "Calf", "Kit"], answer: 0 },
    { id: "nat-m5", category: "Nature", difficulty: "medium", q: "What is the largest living species of fish?", choices: ["Whale shark", "Great white shark", "Tiger shark", "Manta ray"], answer: 0 },
    { id: "nat-h1", category: "Nature", difficulty: "hard", q: "Starfish are classified in which class of echinoderms?", choices: ["Asteroidea", "Ophiuroidea", "Echinoidea", "Crinoidea"], answer: 0 },
    { id: "nat-h2", category: "Nature", difficulty: "hard", q: "Tardigrades, or water bears, make up their own phylum with which name?", choices: ["Tardigrada", "Onychophora", "Arthropoda", "Nematoda"], answer: 0 },
    { id: "nat-h3", category: "Nature", difficulty: "hard", q: "What is the main body cavity of an arthropod, through which hemolymph circulates, called?", choices: ["Hemocoel", "Coelom", "Pseudocoel", "Blastocoel"], answer: 0 },
    { id: "nat-h4", category: "Nature", difficulty: "hard", q: "Which supercontinent existed roughly 1.1 billion years ago, assembled during the Grenville orogeny?", choices: ["Rodinia", "Columbia", "Pannotia", "Gondwana"], answer: 0 },
    { id: "nat-h5", category: "Nature", difficulty: "hard", q: "Which carbon-fixation pathway lets desert plants open their stomata only at night to conserve water?", choices: ["CAM", "C4", "C3", "Photorespiration"], answer: 0 },
];
var makeRng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        s >>>= 0;
        return s / 0xffffffff;
    };
};
exports.TRIVIA_COUNT = 6; // questions per quiz
var generateTrivia = function (difficulty, seed, category, 
// Question ids the player has already seen — excluded so quizzes don't repeat
// until the relevant pool is exhausted (then it resets to the full pool).
excludeIds) {
    var _a;
    var rng = makeRng(seed);
    var pool = BANK.filter(function (q) { return q.difficulty === difficulty; });
    if (category && category !== "Any")
        pool = pool.filter(function (q) { return q.category === category; });
    if (pool.length < exports.TRIVIA_COUNT) {
        pool =
            category && category !== "Any"
                ? BANK.filter(function (q) { return q.category === category; })
                : BANK.filter(function (q) { return q.difficulty === difficulty; });
    }
    if (pool.length < exports.TRIVIA_COUNT)
        pool = __spreadArray([], BANK, true);
    // Prefer questions the player hasn't seen. Only honor the exclusion if it
    // still leaves a full quiz's worth; otherwise keep the full pool so the
    // player replays old questions rather than getting a short quiz.
    if (excludeIds && excludeIds.length) {
        var seen_1 = new Set(excludeIds);
        var unseen = pool.filter(function (q) { return !seen_1.has(q.id); });
        if (unseen.length >= exports.TRIVIA_COUNT)
            pool = unseen;
    }
    var arr = __spreadArray([], pool, true);
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        _a = [arr[j], arr[i]], arr[i] = _a[0], arr[j] = _a[1];
    }
    // Shuffle each question's choices too, so the correct answer isn't always in
    // the same slot (the bank authors the answer first for readability).
    var questions = arr.slice(0, exports.TRIVIA_COUNT).map(function (qn) {
        var _a;
        var order = qn.choices.map(function (_, i) { return i; });
        for (var i = order.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            _a = [order[j], order[i]], order[i] = _a[0], order[j] = _a[1];
        }
        return __assign(__assign({}, qn), { choices: order.map(function (i) { return qn.choices[i]; }), answer: order.indexOf(qn.answer) });
    });
    return { category: category !== null && category !== void 0 ? category : "Any", difficulty: difficulty, questions: questions };
};
exports.generateTrivia = generateTrivia;
var triviaProgress = function (quiz, answers) {
    if (!quiz || quiz.questions.length === 0)
        return 0;
    var a = answers !== null && answers !== void 0 ? answers : {};
    var correct = quiz.questions.filter(function (q) { return a[q.id] === q.answer; }).length;
    return Math.round((correct / quiz.questions.length) * 100);
};
exports.triviaProgress = triviaProgress;
var triviaCorrectCount = function (quiz, answers) {
    if (!quiz)
        return 0;
    var a = answers !== null && answers !== void 0 ? answers : {};
    return quiz.questions.filter(function (q) { return a[q.id] === q.answer; }).length;
};
exports.triviaCorrectCount = triviaCorrectCount;
