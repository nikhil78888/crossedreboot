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
    // ============================ SCIENCE ============================
    { id: "sci-e1", category: "Science", difficulty: "easy", q: "Which scientist first proposed the theory of continental drift in 1912?", choices: ["Alfred Wegener", "Charles Lyell", "James Hutton", "Harry Hess"], answer: 0 },
    { id: "sci-e2", category: "Science", difficulty: "easy", q: "The pH scale measures the concentration of which ion in a solution?", choices: ["Hydrogen ions", "Hydroxide ions", "Oxygen ions", "Chloride ions"], answer: 0 },
    { id: "sci-e3", category: "Science", difficulty: "easy", q: "Which planet in our solar system has the shortest day?", choices: ["Jupiter", "Saturn", "Neptune", "Mars"], answer: 0 },
    { id: "sci-e4", category: "Science", difficulty: "easy", q: "Which element is the most abundant in the universe by mass?", choices: ["Hydrogen", "Helium", "Oxygen", "Carbon"], answer: 0 },
    { id: "sci-m1", category: "Science", difficulty: "medium", q: "Which enzyme unwinds the DNA double helix during replication?", choices: ["Helicase", "Ligase", "Polymerase", "Primase"], answer: 0 },
    { id: "sci-m2", category: "Science", difficulty: "medium", q: "What is the SI unit of magnetic flux?", choices: ["Weber", "Tesla", "Henry", "Gauss"], answer: 0 },
    { id: "sci-m3", category: "Science", difficulty: "medium", q: "Which subatomic particle did James Chadwick discover in 1932?", choices: ["Neutron", "Proton", "Positron", "Electron"], answer: 0 },
    { id: "sci-m4", category: "Science", difficulty: "medium", q: "In eukaryotic cells, the Krebs cycle takes place in which compartment?", choices: ["Mitochondrial matrix", "Cytoplasm", "Inner mitochondrial membrane", "Nucleus"], answer: 0 },
    { id: "sci-m5", category: "Science", difficulty: "medium", q: "Which mineral defines a hardness of 7 on the Mohs scale?", choices: ["Quartz", "Topaz", "Orthoclase", "Corundum"], answer: 0 },
    { id: "sci-h1", category: "Science", difficulty: "hard", q: "Which quantum number determines the shape of an electron orbital?", choices: ["Azimuthal", "Principal", "Magnetic", "Spin"], answer: 0 },
    { id: "sci-h2", category: "Science", difficulty: "hard", q: "In the Standard Model, which boson mediates the strong nuclear force?", choices: ["Gluon", "W boson", "Photon", "Higgs boson"], answer: 0 },
    { id: "sci-h3", category: "Science", difficulty: "hard", q: "The Chandrasekhar limit for a white dwarf is approximately how many solar masses?", choices: ["1.4", "0.6", "2.9", "3.8"], answer: 0 },
    { id: "sci-h4", category: "Science", difficulty: "hard", q: "Which of the twenty standard amino acids is achiral?", choices: ["Glycine", "Alanine", "Serine", "Proline"], answer: 0 },
    { id: "sci-h5", category: "Science", difficulty: "hard", q: "The oxygen-evolving complex of Photosystem II is a cluster built around which metal?", choices: ["Manganese", "Magnesium", "Iron", "Copper"], answer: 0 },
    // ============================ HISTORY ============================
    { id: "his-e1", category: "History", difficulty: "easy", q: "The 1648 Peace of Westphalia ended which war?", choices: ["The Thirty Years' War", "The Hundred Years' War", "The War of Spanish Succession", "The Seven Years' War"], answer: 0 },
    { id: "his-e2", category: "History", difficulty: "easy", q: "Who is considered the first Roman emperor?", choices: ["Augustus", "Julius Caesar", "Tiberius", "Nero"], answer: 0 },
    { id: "his-e3", category: "History", difficulty: "easy", q: "The famously wealthy Mansa Musa ruled which West African empire?", choices: ["Mali", "Songhai", "Ghana", "Kanem-Bornu"], answer: 0 },
    { id: "his-e4", category: "History", difficulty: "easy", q: "The Rosetta Stone was discovered during whose military campaign in Egypt?", choices: ["Napoleon Bonaparte", "Alexander the Great", "Julius Caesar", "Horatio Nelson"], answer: 0 },
    { id: "his-m1", category: "History", difficulty: "medium", q: "At the 1571 Battle of Lepanto, the Holy League crushed the fleet of which empire?", choices: ["The Ottoman Empire", "The Venetian Republic", "The Mamluk Sultanate", "The Byzantine Empire"], answer: 0 },
    { id: "his-m2", category: "History", difficulty: "medium", q: "Who was the last independent ruler of the Aztec Empire?", choices: ["Cuauhtémoc", "Moctezuma II", "Cuitláhuac", "Ahuitzotl"], answer: 0 },
    { id: "his-m3", category: "History", difficulty: "medium", q: "In what year did Japan's Meiji Restoration end shogunate rule?", choices: ["1868", "1854", "1877", "1889"], answer: 0 },
    { id: "his-m4", category: "History", difficulty: "medium", q: "Which Byzantine emperor ordered the codification of Roman law known as the Corpus Juris Civilis?", choices: ["Justinian I", "Constantine the Great", "Heraclius", "Basil II"], answer: 0 },
    { id: "his-m5", category: "History", difficulty: "medium", q: "The 1494 Treaty of Tordesillas divided the New World between Spain and which power?", choices: ["Portugal", "France", "England", "The Dutch Republic"], answer: 0 },
    { id: "his-h1", category: "History", difficulty: "hard", q: "At the 751 Battle of Talas, the Abbasid Caliphate defeated the army of which Chinese dynasty?", choices: ["Tang", "Song", "Sui", "Han"], answer: 0 },
    { id: "his-h2", category: "History", difficulty: "hard", q: "Who founded the Maurya Empire of ancient India?", choices: ["Chandragupta Maurya", "Ashoka", "Bindusara", "Bimbisara"], answer: 0 },
    { id: "his-h3", category: "History", difficulty: "hard", q: "The 1591 Battle of Tondibi saw a Moroccan army shatter which West African empire?", choices: ["Songhai", "Mali", "Kongo", "Ashanti"], answer: 0 },
    { id: "his-h4", category: "History", difficulty: "hard", q: "Who was the reigning Zulu king during the 1879 Anglo-Zulu War?", choices: ["Cetshwayo kaMpande", "Shaka", "Dingane", "Mpande"], answer: 0 },
    { id: "his-h5", category: "History", difficulty: "hard", q: "The devastating An Lushan Rebellion against Tang China broke out in which year?", choices: ["755", "712", "763", "781"], answer: 0 },
    // ============================ GEOGRAPHY ============================
    { id: "geo-e1", category: "Geography", difficulty: "easy", q: "Which country contains more lakes than the rest of the world's countries combined?", choices: ["Canada", "Russia", "Finland", "Sweden"], answer: 0 },
    { id: "geo-e2", category: "Geography", difficulty: "easy", q: "The Atacama, the driest nonpolar desert on Earth, lies mostly within which country?", choices: ["Chile", "Peru", "Argentina", "Bolivia"], answer: 0 },
    { id: "geo-e3", category: "Geography", difficulty: "easy", q: "Which strait separates the continents of Asia and North America?", choices: ["Bering Strait", "Denmark Strait", "Davis Strait", "Hudson Strait"], answer: 0 },
    { id: "geo-e4", category: "Geography", difficulty: "easy", q: "Mount Kilimanjaro, Africa's highest peak, stands within which country?", choices: ["Tanzania", "Kenya", "Uganda", "Ethiopia"], answer: 0 },
    { id: "geo-m1", category: "Geography", difficulty: "medium", q: "What is the capital of Myanmar?", choices: ["Naypyidaw", "Yangon", "Mandalay", "Bago"], answer: 0 },
    { id: "geo-m2", category: "Geography", difficulty: "medium", q: "Which country is completely surrounded by the territory of South Africa?", choices: ["Lesotho", "Eswatini", "Botswana", "Namibia"], answer: 0 },
    { id: "geo-m3", category: "Geography", difficulty: "medium", q: "Into which sea does the Danube River empty?", choices: ["Black Sea", "Caspian Sea", "Adriatic Sea", "Aegean Sea"], answer: 0 },
    { id: "geo-m4", category: "Geography", difficulty: "medium", q: "The Kiel Canal links the North Sea to which other sea?", choices: ["Baltic Sea", "Barents Sea", "White Sea", "Norwegian Sea"], answer: 0 },
    { id: "geo-m5", category: "Geography", difficulty: "medium", q: "Which country has three official capital cities?", choices: ["South Africa", "Bolivia", "Malaysia", "Netherlands"], answer: 0 },
    { id: "geo-h1", category: "Geography", difficulty: "hard", q: "Counting its overseas territories, which country spans the most time zones?", choices: ["France", "Russia", "United States", "United Kingdom"], answer: 0 },
    { id: "geo-h2", category: "Geography", difficulty: "hard", q: "What is the deepest lake in the world?", choices: ["Lake Baikal", "Lake Tanganyika", "Caspian Sea", "Lake Malawi"], answer: 0 },
    { id: "geo-h3", category: "Geography", difficulty: "hard", q: "The Wakhan Corridor gives Afghanistan a narrow border with which country?", choices: ["China", "Tajikistan", "India", "Turkmenistan"], answer: 0 },
    { id: "geo-h4", category: "Geography", difficulty: "hard", q: "At which city do the Blue Nile and White Nile converge?", choices: ["Khartoum", "Cairo", "Aswan", "Juba"], answer: 0 },
    { id: "geo-h5", category: "Geography", difficulty: "hard", q: "What is the southernmost capital city of any sovereign state?", choices: ["Wellington", "Canberra", "Santiago", "Buenos Aires"], answer: 0 },
    // ============================ SPORTS ============================
    { id: "spo-e1", category: "Sports", difficulty: "easy", q: "Which country has won the most FIFA World Cup titles?", choices: ["Brazil", "Germany", "Italy", "Argentina"], answer: 0 },
    { id: "spo-e2", category: "Sports", difficulty: "easy", q: "The Ashes is a historic Test rivalry between England and which nation?", choices: ["Australia", "South Africa", "India", "New Zealand"], answer: 0 },
    { id: "spo-e3", category: "Sports", difficulty: "easy", q: "In which city were the first modern Olympic Games held in 1896?", choices: ["Athens", "Paris", "London", "Rome"], answer: 0 },
    { id: "spo-e4", category: "Sports", difficulty: "easy", q: "In which sport is the Ryder Cup contested?", choices: ["Golf", "Tennis", "Cycling", "Rowing"], answer: 0 },
    { id: "spo-m1", category: "Sports", difficulty: "medium", q: "Who won the first Formula 1 World Drivers' Championship in 1950?", choices: ["Giuseppe Farina", "Juan Manuel Fangio", "Alberto Ascari", "Stirling Moss"], answer: 0 },
    { id: "spo-m2", category: "Sports", difficulty: "medium", q: "Which team won the inaugural Cricket World Cup in 1975?", choices: ["West Indies", "Australia", "England", "India"], answer: 0 },
    { id: "spo-m3", category: "Sports", difficulty: "medium", q: "In what year did Roger Bannister run the first sub-four-minute mile?", choices: ["1954", "1948", "1952", "1958"], answer: 0 },
    { id: "spo-m4", category: "Sports", difficulty: "medium", q: "Which country hosted the 1936 Summer Olympics?", choices: ["Germany", "Italy", "Austria", "Belgium"], answer: 0 },
    { id: "spo-m5", category: "Sports", difficulty: "medium", q: "Which nation has won the most Olympic gold medals in men's field hockey?", choices: ["India", "Pakistan", "Netherlands", "Germany"], answer: 0 },
    { id: "spo-h1", category: "Sports", difficulty: "hard", q: "Which team won the first Formula 1 World Constructors' Championship in 1958?", choices: ["Vanwall", "Ferrari", "Cooper", "Maserati"], answer: 0 },
    { id: "spo-h2", category: "Sports", difficulty: "hard", q: "Who was the first gymnast to score a perfect 10 at the Olympic Games?", choices: ["Nadia Comaneci", "Olga Korbut", "Vera Caslavska", "Ludmilla Tourischeva"], answer: 0 },
    { id: "spo-h3", category: "Sports", difficulty: "hard", q: "Which team won the inaugural Rugby World Cup in 1987?", choices: ["New Zealand", "Australia", "France", "England"], answer: 0 },
    { id: "spo-h4", category: "Sports", difficulty: "hard", q: "Boxer Jack Dempsey was known by which nickname?", choices: ["The Manassa Mauler", "The Brown Bomber", "The Cinderella Man", "The Galveston Giant"], answer: 0 },
    { id: "spo-h5", category: "Sports", difficulty: "hard", q: "Which racehorse won the U.S. Triple Crown in 1973 in record-setting times?", choices: ["Secretariat", "Seattle Slew", "Affirmed", "Citation"], answer: 0 },
    // ============================ FILM & TV ============================
    { id: "film-e1", category: "Film & TV", difficulty: "easy", q: "Which film won the very first Academy Award for Best Picture?", choices: ["Wings", "Sunrise", "The Jazz Singer", "Metropolis"], answer: 0 },
    { id: "film-e2", category: "Film & TV", difficulty: "easy", q: "Who directed the 1979 science-fiction horror film 'Alien'?", choices: ["Ridley Scott", "James Cameron", "John Carpenter", "David Fincher"], answer: 0 },
    { id: "film-e3", category: "Film & TV", difficulty: "easy", q: "Which actor played Vito Corleone in 'The Godfather' (1972)?", choices: ["Marlon Brando", "Al Pacino", "Robert De Niro", "James Caan"], answer: 0 },
    { id: "film-e4", category: "Film & TV", difficulty: "easy", q: "Which 1939 epic was the first color film to win Best Picture?", choices: ["Gone with the Wind", "The Wizard of Oz", "Stagecoach", "Wuthering Heights"], answer: 0 },
    { id: "film-m1", category: "Film & TV", difficulty: "medium", q: "Who directed the 1954 Japanese classic 'Seven Samurai'?", choices: ["Akira Kurosawa", "Yasujiro Ozu", "Kenji Mizoguchi", "Masaki Kobayashi"], answer: 0 },
    { id: "film-m2", category: "Film & TV", difficulty: "medium", q: "Who directed the 2006 fantasy film 'Pan's Labyrinth'?", choices: ["Guillermo del Toro", "Alfonso Cuaron", "Alejandro Gonzalez Inarritu", "Pedro Almodovar"], answer: 0 },
    { id: "film-m3", category: "Film & TV", difficulty: "medium", q: "For which film did Daniel Day-Lewis win his second Best Actor Oscar?", choices: ["There Will Be Blood", "My Left Foot", "Lincoln", "Gangs of New York"], answer: 0 },
    { id: "film-m4", category: "Film & TV", difficulty: "medium", q: "Which film won the Best Picture Oscar honoring the films of 1993?", choices: ["Schindler's List", "The Piano", "The Fugitive", "In the Name of the Father"], answer: 0 },
    { id: "film-m5", category: "Film & TV", difficulty: "medium", q: "Which South Korean film won the Palme d'Or at Cannes in 2019?", choices: ["Parasite", "Burning", "The Handmaiden", "Oldboy"], answer: 0 },
    { id: "film-h1", category: "Film & TV", difficulty: "hard", q: "Who directed the 1920 German Expressionist landmark 'The Cabinet of Dr. Caligari'?", choices: ["Robert Wiene", "F.W. Murnau", "Fritz Lang", "G.W. Pabst"], answer: 0 },
    { id: "film-h2", category: "Film & TV", difficulty: "hard", q: "Who directed the 1925 Soviet montage classic 'Battleship Potemkin'?", choices: ["Sergei Eisenstein", "Vsevolod Pudovkin", "Dziga Vertov", "Lev Kuleshov"], answer: 0 },
    { id: "film-h3", category: "Film & TV", difficulty: "hard", q: "Who directed the 1939 French masterpiece 'The Rules of the Game'?", choices: ["Jean Renoir", "Marcel Carne", "Rene Clair", "Julien Duvivier"], answer: 0 },
    { id: "film-h4", category: "Film & TV", difficulty: "hard", q: "Who directed the 1957 Swedish film 'Wild Strawberries'?", choices: ["Ingmar Bergman", "Victor Sjostrom", "Bo Widerberg", "Jan Troell"], answer: 0 },
    { id: "film-h5", category: "Film & TV", difficulty: "hard", q: "Which film was the first Latin American winner of the Best Foreign Language Film Oscar?", choices: ["The Official Story", "City of God", "Amores Perros", "Central Station"], answer: 0 },
    // ======================= ART & LITERATURE =======================
    { id: "lit-e1", category: "Art & Literature", difficulty: "easy", q: "Which Russian author wrote the novel 'Crime and Punishment'?", choices: ["Fyodor Dostoevsky", "Leo Tolstoy", "Ivan Turgenev", "Nikolai Gogol"], answer: 0 },
    { id: "lit-e2", category: "Art & Literature", difficulty: "easy", q: "Claude Monet's 'Water Lilies' belongs to which art movement?", choices: ["Impressionism", "Cubism", "Surrealism", "Expressionism"], answer: 0 },
    { id: "lit-e3", category: "Art & Literature", difficulty: "easy", q: "Which author wrote 'One Hundred Years of Solitude'?", choices: ["Gabriel Garcia Marquez", "Jorge Luis Borges", "Mario Vargas Llosa", "Julio Cortazar"], answer: 0 },
    { id: "lit-e4", category: "Art & Literature", difficulty: "easy", q: "Who painted the ceiling of the Sistine Chapel?", choices: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Sandro Botticelli"], answer: 0 },
    { id: "lit-m1", category: "Art & Literature", difficulty: "medium", q: "Which German author wrote the 1959 novel 'The Tin Drum'?", choices: ["Gunter Grass", "Thomas Mann", "Heinrich Boll", "Hermann Hesse"], answer: 0 },
    { id: "lit-m2", category: "Art & Literature", difficulty: "medium", q: "Which Netherlandish painter created 'The Garden of Earthly Delights'?", choices: ["Hieronymus Bosch", "Pieter Bruegel the Elder", "Jan van Eyck", "Johannes Vermeer"], answer: 0 },
    { id: "lit-m3", category: "Art & Literature", difficulty: "medium", q: "Which Nigerian author wrote 'Things Fall Apart'?", choices: ["Chinua Achebe", "Wole Soyinka", "Ngugi wa Thiong'o", "Ben Okri"], answer: 0 },
    { id: "lit-m4", category: "Art & Literature", difficulty: "medium", q: "Which movement did Andre Breton launch with his 1924 manifesto?", choices: ["Surrealism", "Dadaism", "Futurism", "Fauvism"], answer: 0 },
    { id: "lit-m5", category: "Art & Literature", difficulty: "medium", q: "Which Russian author wrote 'The Master and Margarita'?", choices: ["Mikhail Bulgakov", "Vladimir Nabokov", "Boris Pasternak", "Aleksandr Solzhenitsyn"], answer: 0 },
    { id: "lit-h1", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Portuguese epic poem 'The Lusiads'?", choices: ["Luis de Camoes", "Fernando Pessoa", "Eca de Queiros", "Jose Saramago"], answer: 0 },
    { id: "lit-h2", category: "Art & Literature", difficulty: "hard", q: "Which Spanish painter created 'Las Meninas'?", choices: ["Diego Velazquez", "Bartolome Murillo", "Francisco de Zurbaran", "El Greco"], answer: 0 },
    { id: "lit-h3", category: "Art & Literature", difficulty: "hard", q: "Which Heian-era court lady wrote 'The Tale of Genji'?", choices: ["Murasaki Shikibu", "Sei Shonagon", "Yosano Akiko", "Ki no Tsurayuki"], answer: 0 },
    { id: "lit-h4", category: "Art & Literature", difficulty: "hard", q: "Which architect founded the Bauhaus school in Weimar in 1919?", choices: ["Walter Gropius", "Ludwig Mies van der Rohe", "Le Corbusier", "Marcel Breuer"], answer: 0 },
    { id: "lit-h5", category: "Art & Literature", difficulty: "hard", q: "Which Icelandic Nobel laureate wrote 'Independent People'?", choices: ["Halldor Laxness", "Knut Hamsun", "Sigrid Undset", "Selma Lagerlof"], answer: 0 },
    // ============================ MUSIC ============================
    { id: "mus-e1", category: "Music", difficulty: "easy", q: "Which composer wrote the ballet 'The Nutcracker'?", choices: ["Tchaikovsky", "Stravinsky", "Prokofiev", "Rimsky-Korsakov"], answer: 0 },
    { id: "mus-e2", category: "Music", difficulty: "easy", q: "Which instrument is jazz legend Louis Armstrong most associated with?", choices: ["Trumpet", "Saxophone", "Clarinet", "Trombone"], answer: 0 },
    { id: "mus-e3", category: "Music", difficulty: "easy", q: "Which composer wrote 'The Ride of the Valkyries'?", choices: ["Wagner", "Verdi", "Puccini", "Rossini"], answer: 0 },
    { id: "mus-e4", category: "Music", difficulty: "easy", q: "Which jazz vocalist was nicknamed 'Lady Day'?", choices: ["Billie Holiday", "Ella Fitzgerald", "Sarah Vaughan", "Nina Simone"], answer: 0 },
    { id: "mus-m1", category: "Music", difficulty: "medium", q: "Who composed the 1924 jazz-influenced concert work 'Rhapsody in Blue'?", choices: ["George Gershwin", "Aaron Copland", "Leonard Bernstein", "Cole Porter"], answer: 0 },
    { id: "mus-m2", category: "Music", difficulty: "medium", q: "Which saxophonist recorded the 1965 album 'A Love Supreme'?", choices: ["John Coltrane", "Charlie Parker", "Sonny Rollins", "Cannonball Adderley"], answer: 0 },
    { id: "mus-m3", category: "Music", difficulty: "medium", q: "Who composed the opera 'Carmen'?", choices: ["Georges Bizet", "Charles Gounod", "Jules Massenet", "Jacques Offenbach"], answer: 0 },
    { id: "mus-m4", category: "Music", difficulty: "medium", q: "Which composer wrote the tone poem 'Also sprach Zarathustra'?", choices: ["Richard Strauss", "Gustav Mahler", "Anton Bruckner", "Hugo Wolf"], answer: 0 },
    { id: "mus-m5", category: "Music", difficulty: "medium", q: "Which pianist composed the jazz standard 'Round Midnight'?", choices: ["Thelonious Monk", "Bud Powell", "Duke Ellington", "Dizzy Gillespie"], answer: 0 },
    { id: "mus-h1", category: "Music", difficulty: "hard", q: "Who composed the expressionist opera 'Wozzeck', premiered in 1925?", choices: ["Alban Berg", "Arnold Schoenberg", "Anton Webern", "Paul Hindemith"], answer: 0 },
    { id: "mus-h2", category: "Music", difficulty: "hard", q: "Which composer wrote the 'Turangalila-Symphonie', scored for piano and ondes Martenot?", choices: ["Olivier Messiaen", "Pierre Boulez", "Darius Milhaud", "Arthur Honegger"], answer: 0 },
    { id: "mus-h3", category: "Music", difficulty: "hard", q: "Who composed the 1945 opera 'Peter Grimes'?", choices: ["Benjamin Britten", "Michael Tippett", "Ralph Vaughan Williams", "William Walton"], answer: 0 },
    { id: "mus-h4", category: "Music", difficulty: "hard", q: "Which composer wrote the 'Symphonie fantastique' in 1830?", choices: ["Hector Berlioz", "Franz Liszt", "Robert Schumann", "Felix Mendelssohn"], answer: 0 },
    { id: "mus-h5", category: "Music", difficulty: "hard", q: "Which composer pioneered the twelve-tone serial technique?", choices: ["Arnold Schoenberg", "Alban Berg", "Anton Webern", "Igor Stravinsky"], answer: 0 },
    // ============================ NATURE ============================
    { id: "nat-e1", category: "Nature", difficulty: "easy", q: "Which plant tissue carries water and minerals from the roots up to the leaves?", choices: ["Xylem", "Phloem", "Cambium", "Epidermis"], answer: 0 },
    { id: "nat-e2", category: "Nature", difficulty: "easy", q: "What is the loss of water vapor from a plant's leaves through its stomata called?", choices: ["Transpiration", "Guttation", "Respiration", "Condensation"], answer: 0 },
    { id: "nat-e3", category: "Nature", difficulty: "easy", q: "Egg-laying mammals such as the echidna and platypus belong to which group?", choices: ["Monotremes", "Marsupials", "Placentals", "Xenarthrans"], answer: 0 },
    { id: "nat-e4", category: "Nature", difficulty: "easy", q: "What is the name for a young eel that has gained pigment after entering fresh water?", choices: ["Elver", "Fry", "Alevin", "Fingerling"], answer: 0 },
    { id: "nat-m1", category: "Nature", difficulty: "medium", q: "What symbiosis is it called when one species benefits and the other is neither helped nor harmed?", choices: ["Commensalism", "Mutualism", "Parasitism", "Amensalism"], answer: 0 },
    { id: "nat-m2", category: "Nature", difficulty: "medium", q: "What term describes animals that are primarily active during the twilight of both dawn and dusk?", choices: ["Crepuscular", "Vespertine", "Diurnal", "Nocturnal"], answer: 0 },
    { id: "nat-m3", category: "Nature", difficulty: "medium", q: "Which science dates past events by analyzing patterns in tree growth rings?", choices: ["Dendrochronology", "Palynology", "Stratigraphy", "Petrology"], answer: 0 },
    { id: "nat-m4", category: "Nature", difficulty: "medium", q: "In the nitrogen cycle, what is the bacterial oxidation of ammonia into nitrite and then nitrate called?", choices: ["Nitrification", "Denitrification", "Ammonification", "Nitrogen fixation"], answer: 0 },
    { id: "nat-m5", category: "Nature", difficulty: "medium", q: "What is the rigid outer shell of Earth, comprising the crust and uppermost mantle, called?", choices: ["Lithosphere", "Asthenosphere", "Mesosphere", "Hydrosphere"], answer: 0 },
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
