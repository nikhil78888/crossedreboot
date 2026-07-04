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
    // ========================= SCIENCE =========================
    { id: "sci-e1", category: "Science", difficulty: "easy", q: "What gas do plants release into the air during photosynthesis?", choices: ["Oxygen", "Nitrogen", "Hydrogen", "Helium"], answer: 0 },
    { id: "sci-e2", category: "Science", difficulty: "easy", q: "Which planet is commonly known as the Red Planet?", choices: ["Mars", "Venus", "Jupiter", "Mercury"], answer: 0 },
    { id: "sci-e3", category: "Science", difficulty: "easy", q: "What is the chemical symbol for gold?", choices: ["Au", "Ag", "Gd", "Go"], answer: 0 },
    { id: "sci-e4", category: "Science", difficulty: "easy", q: "What is the hardest known natural material on Earth?", choices: ["Diamond", "Granite", "Quartz", "Steel"], answer: 0 },
    { id: "sci-e5", category: "Science", difficulty: "easy", q: "Which gas makes up the largest share of Earth's atmosphere?", choices: ["Nitrogen", "Oxygen", "Carbon dioxide", "Argon"], answer: 0 },
    { id: "sci-e6", category: "Science", difficulty: "easy", q: "Which organ is chiefly responsible for pumping blood around the body?", choices: ["Heart", "Liver", "Lungs", "Kidneys"], answer: 0 },
    { id: "sci-e7", category: "Science", difficulty: "easy", q: "What is the nearest star to Earth?", choices: ["The Sun", "Sirius", "Proxima Centauri", "Polaris"], answer: 0 },
    { id: "sci-e8", category: "Science", difficulty: "easy", q: "What do we call an animal that eats both plants and other animals?", choices: ["Omnivore", "Herbivore", "Carnivore", "Insectivore"], answer: 0 },
    { id: "sci-e9", category: "Science", difficulty: "easy", q: "Roughly how many bones are in the adult human body?", choices: ["206", "150", "300", "412"], answer: 0 },
    { id: "sci-e10", category: "Science", difficulty: "easy", q: "Which force causes objects to fall toward the ground?", choices: ["Gravity", "Friction", "Magnetism", "Inertia"], answer: 0 },
    { id: "sci-e11", category: "Science", difficulty: "easy", q: "What is the most abundant gas in Earth's atmosphere?", choices: ["Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen"], answer: 0 },
    { id: "sci-e12", category: "Science", difficulty: "easy", q: "Which organelle is often called the powerhouse of the cell?", choices: ["Mitochondria", "Nucleus", "Ribosome", "Vacuole"], answer: 0 },
    { id: "sci-e13", category: "Science", difficulty: "easy", q: "Sunlight on the skin helps the body produce which vitamin?", choices: ["Vitamin D", "Vitamin C", "Vitamin A", "Vitamin K"], answer: 0 },
    { id: "sci-e14", category: "Science", difficulty: "easy", q: "Which metal is a liquid at room temperature?", choices: ["Mercury", "Iron", "Aluminum", "Copper"], answer: 0 },
    { id: "sci-e15", category: "Science", difficulty: "easy", q: "Which layer of the atmosphere shields us from most ultraviolet radiation?", choices: ["Ozone layer", "Cloud layer", "Magnetic layer", "Dust layer"], answer: 0 },
    { id: "sci-e16", category: "Science", difficulty: "easy", q: "Which planet is famous for its Great Red Spot?", choices: ["Jupiter", "Saturn", "Neptune", "Venus"], answer: 0 },
    { id: "sci-e17", category: "Science", difficulty: "easy", q: "What is the central core of an atom called?", choices: ["Nucleus", "Electron", "Proton shell", "Orbit"], answer: 0 },
    { id: "sci-e18", category: "Science", difficulty: "easy", q: "What is the scientific study of weather called?", choices: ["Meteorology", "Geology", "Astronomy", "Ecology"], answer: 0 },
    { id: "sci-e19", category: "Science", difficulty: "easy", q: "Which scale is traditionally used to measure earthquake magnitude?", choices: ["Richter scale", "Kelvin scale", "Beaufort scale", "Mohs scale"], answer: 0 },
    { id: "sci-e20", category: "Science", difficulty: "easy", q: "In computing, what does CPU stand for?", choices: ["Central Processing Unit", "Computer Power Unit", "Core Program Utility", "Central Program Unit"], answer: 0 },
    { id: "sci-m1", category: "Science", difficulty: "medium", q: "Which subatomic particle carries a negative electric charge?", choices: ["Electron", "Proton", "Neutron", "Positron"], answer: 0 },
    { id: "sci-m2", category: "Science", difficulty: "medium", q: "What is the pH value of a perfectly neutral solution at room temperature?", choices: ["7", "0", "10", "14"], answer: 0 },
    { id: "sci-m3", category: "Science", difficulty: "medium", q: "Which element has an atomic number of 1?", choices: ["Hydrogen", "Helium", "Oxygen", "Carbon"], answer: 0 },
    { id: "sci-m4", category: "Science", difficulty: "medium", q: "What is the largest organ of the human body?", choices: ["Skin", "Liver", "Brain", "Lungs"], answer: 0 },
    { id: "sci-m5", category: "Science", difficulty: "medium", q: "Which scientist developed the theory of general relativity?", choices: ["Albert Einstein", "Isaac Newton", "Niels Bohr", "Galileo Galilei"], answer: 0 },
    { id: "sci-m6", category: "Science", difficulty: "medium", q: "What is often called the fourth state of matter?", choices: ["Plasma", "Vapor", "Crystal", "Colloid"], answer: 0 },
    { id: "sci-m7", category: "Science", difficulty: "medium", q: "Which blood type is considered the universal donor?", choices: ["O negative", "AB positive", "A positive", "B negative"], answer: 0 },
    { id: "sci-m8", category: "Science", difficulty: "medium", q: "Which vitamin does the skin produce when exposed to sunlight?", choices: ["Vitamin D", "Vitamin C", "Vitamin A", "Vitamin K"], answer: 0 },
    { id: "sci-m9", category: "Science", difficulty: "medium", q: "What is the scientific study of fungi called?", choices: ["Mycology", "Botany", "Virology", "Entomology"], answer: 0 },
    { id: "sci-m10", category: "Science", difficulty: "medium", q: "Which organelle assembles proteins inside the cell?", choices: ["Ribosome", "Lysosome", "Golgi apparatus", "Vacuole"], answer: 0 },
    { id: "sci-m11", category: "Science", difficulty: "medium", q: "Which planet has the hottest surface in the solar system?", choices: ["Venus", "Mercury", "Mars", "Jupiter"], answer: 0 },
    { id: "sci-m12", category: "Science", difficulty: "medium", q: "Which subatomic particle carries no electric charge?", choices: ["Neutron", "Proton", "Electron", "Positron"], answer: 0 },
    { id: "sci-m13", category: "Science", difficulty: "medium", q: "How many bones are in the adult human body?", choices: ["206", "180", "250", "300"], answer: 0 },
    { id: "sci-m14", category: "Science", difficulty: "medium", q: "Which metal sits at the center of a hemoglobin molecule?", choices: ["Iron", "Copper", "Zinc", "Magnesium"], answer: 0 },
    { id: "sci-m15", category: "Science", difficulty: "medium", q: "Which rock type forms when magma or lava cools and solidifies?", choices: ["Igneous", "Sedimentary", "Metamorphic", "Fossilized"], answer: 0 },
    { id: "sci-m16", category: "Science", difficulty: "medium", q: "Which part of the brain mainly controls balance and coordination?", choices: ["Cerebellum", "Cerebrum", "Hippocampus", "Medulla"], answer: 0 },
    { id: "sci-m17", category: "Science", difficulty: "medium", q: "Which planet rotates on its side, tilted nearly 90 degrees?", choices: ["Uranus", "Saturn", "Neptune", "Mars"], answer: 0 },
    { id: "sci-m18", category: "Science", difficulty: "medium", q: "Which noble gas glows orange-red in bright advertising signs?", choices: ["Neon", "Argon", "Helium", "Krypton"], answer: 0 },
    { id: "sci-m19", category: "Science", difficulty: "medium", q: "A deficiency of which vitamin causes scurvy?", choices: ["Vitamin C", "Vitamin D", "Vitamin B12", "Vitamin A"], answer: 0 },
    { id: "sci-m20", category: "Science", difficulty: "medium", q: "What is the nearest large galaxy to the Milky Way?", choices: ["Andromeda", "Triangulum", "Whirlpool", "Sombrero"], answer: 0 },
    { id: "sci-m21", category: "Science", difficulty: "medium", q: "What is the chemical formula for common table salt?", choices: ["NaCl", "KCl", "CaCO3", "NaHCO3"], answer: 0 },
    { id: "sci-m22", category: "Science", difficulty: "medium", q: "Approximately what is absolute zero in degrees Celsius?", choices: ["-273", "-100", "0", "-459"], answer: 0 },
    { id: "sci-m23", category: "Science", difficulty: "medium", q: "In mobile networks, what does the 'G' in 5G stand for?", choices: ["Generation", "Gigahertz", "Global", "Gateway"], answer: 0 },
    { id: "sci-h1", category: "Science", difficulty: "hard", q: "Which particle mediates the electromagnetic force?", choices: ["Photon", "Gluon", "Graviton", "W boson"], answer: 0 },
    { id: "sci-h2", category: "Science", difficulty: "hard", q: "Which physicist discovered the neutron in 1932?", choices: ["James Chadwick", "Ernest Rutherford", "Enrico Fermi", "J.J. Thomson"], answer: 0 },
    { id: "sci-h3", category: "Science", difficulty: "hard", q: "Which enzyme unwinds the DNA double helix during replication?", choices: ["Helicase", "Ligase", "Polymerase", "Primase"], answer: 0 },
    { id: "sci-h4", category: "Science", difficulty: "hard", q: "What is the temperature above which a material loses its ferromagnetism called?", choices: ["Curie point", "Triple point", "Debye temperature", "Neel point"], answer: 0 },
    { id: "sci-h5", category: "Science", difficulty: "hard", q: "Which protein is the most abundant in the human body by mass?", choices: ["Collagen", "Hemoglobin", "Keratin", "Albumin"], answer: 0 },
    { id: "sci-h6", category: "Science", difficulty: "hard", q: "What is the SI unit of electric charge?", choices: ["Coulomb", "Ampere", "Volt", "Farad"], answer: 0 },
    { id: "sci-h7", category: "Science", difficulty: "hard", q: "What is the pressure required to stop solvent flow across a semipermeable membrane called?", choices: ["Osmotic pressure", "Vapor pressure", "Partial pressure", "Turgor pressure"], answer: 0 },
    { id: "sci-h8", category: "Science", difficulty: "hard", q: "What is the process by which certain bacteria convert atmospheric nitrogen into ammonia?", choices: ["Nitrogen fixation", "Nitrification", "Denitrification", "Ammonification"], answer: 0 },
    { id: "sci-h9", category: "Science", difficulty: "hard", q: "Which gas law states that pressure and volume are inversely proportional at constant temperature?", choices: ["Boyle's law", "Charles's law", "Avogadro's law", "Gay-Lussac's law"], answer: 0 },
    { id: "sci-h10", category: "Science", difficulty: "hard", q: "What is the bending of light waves around the edges of an obstacle called?", choices: ["Diffraction", "Refraction", "Dispersion", "Polarization"], answer: 0 },
    { id: "sci-h11", category: "Science", difficulty: "hard", q: "Which metal has the highest melting point of any metal?", choices: ["Tungsten", "Titanium", "Platinum", "Osmium"], answer: 0 },
    { id: "sci-h12", category: "Science", difficulty: "hard", q: "Which organelle packages and ships proteins within a cell?", choices: ["Golgi apparatus", "Lysosome", "Nucleolus", "Peroxisome"], answer: 0 },
    { id: "sci-h13", category: "Science", difficulty: "hard", q: "What is the largest moon in the solar system?", choices: ["Ganymede", "Titan", "Callisto", "Europa"], answer: 0 },
    { id: "sci-h14", category: "Science", difficulty: "hard", q: "Which element is the most electronegative?", choices: ["Fluorine", "Oxygen", "Chlorine", "Nitrogen"], answer: 0 },
    { id: "sci-h15", category: "Science", difficulty: "hard", q: "What is the approximate half-life of carbon-14?", choices: ["5,730 years", "1,600 years", "24,000 years", "710 years"], answer: 0 },
    { id: "sci-h16", category: "Science", difficulty: "hard", q: "What is the smallest bone in the human body?", choices: ["Stapes", "Malleus", "Incus", "Hyoid"], answer: 0 },
    { id: "sci-h17", category: "Science", difficulty: "hard", q: "Which blood vessel carries oxygenated blood from the lungs to the heart?", choices: ["Pulmonary vein", "Pulmonary artery", "Aorta", "Vena cava"], answer: 0 },
    { id: "sci-h18", category: "Science", difficulty: "hard", q: "What spectral class is our Sun?", choices: ["G-type", "M-type", "O-type", "B-type"], answer: 0 },
    { id: "sci-h19", category: "Science", difficulty: "hard", q: "The unit tesla measures which physical quantity?", choices: ["Magnetic flux density", "Electric current", "Radioactivity", "Luminous intensity"], answer: 0 },
    { id: "sci-h20", category: "Science", difficulty: "hard", q: "Which is the rarest naturally occurring element on Earth?", choices: ["Astatine", "Francium", "Promethium", "Technetium"], answer: 0 },
    { id: "sci-h21", category: "Science", difficulty: "hard", q: "The Chandrasekhar limit defines the maximum mass of what kind of star?", choices: ["White dwarf", "Neutron star", "Red giant", "Brown dwarf"], answer: 0 },
    // ========================= HISTORY =========================
    { id: "his-e1", category: "History", difficulty: "easy", q: "Who was the first president of the United States?", choices: ["George Washington", "Thomas Jefferson", "John Adams", "Abraham Lincoln"], answer: 0 },
    { id: "his-e2", category: "History", difficulty: "easy", q: "Which ancient civilization built the pyramids of Giza?", choices: ["Ancient Egyptians", "Ancient Greeks", "Ancient Romans", "Babylonians"], answer: 0 },
    { id: "his-e3", category: "History", difficulty: "easy", q: "In what year did Columbus first reach the Americas?", choices: ["1492", "1476", "1503", "1520"], answer: 0 },
    { id: "his-e4", category: "History", difficulty: "easy", q: "Who led Nazi Germany during World War II?", choices: ["Adolf Hitler", "Joseph Stalin", "Benito Mussolini", "Otto von Bismarck"], answer: 0 },
    { id: "his-e5", category: "History", difficulty: "easy", q: "In which country is the Great Wall located?", choices: ["China", "India", "Japan", "Mongolia"], answer: 0 },
    { id: "his-e6", category: "History", difficulty: "easy", q: "In what year did World War II end?", choices: ["1945", "1939", "1918", "1950"], answer: 0 },
    { id: "his-e7", category: "History", difficulty: "easy", q: "Which ocean liner famously sank in 1912?", choices: ["Titanic", "Lusitania", "Britannic", "Bismarck"], answer: 0 },
    { id: "his-e8", category: "History", difficulty: "easy", q: "Who led India's nonviolent independence movement?", choices: ["Mahatma Gandhi", "Jawaharlal Nehru", "Nelson Mandela", "Ho Chi Minh"], answer: 0 },
    { id: "his-e9", category: "History", difficulty: "easy", q: "In what year did humans first land on the Moon?", choices: ["1969", "1961", "1965", "1972"], answer: 0 },
    { id: "his-e10", category: "History", difficulty: "easy", q: "In what year did the Berlin Wall fall?", choices: ["1989", "1979", "1991", "1985"], answer: 0 },
    { id: "his-e11", category: "History", difficulty: "easy", q: "Which civilization built the mountaintop site of Machu Picchu?", choices: ["Inca", "Maya", "Aztec", "Olmec"], answer: 0 },
    { id: "his-e12", category: "History", difficulty: "easy", q: "Which US president was assassinated in Dallas in 1963?", choices: ["John F. Kennedy", "Abraham Lincoln", "Martin Luther King", "Robert Kennedy"], answer: 0 },
    { id: "his-e13", category: "History", difficulty: "easy", q: "The ancient Olympic Games originated in which country?", choices: ["Greece", "Rome", "Egypt", "Persia"], answer: 0 },
    { id: "his-e14", category: "History", difficulty: "easy", q: "The Cold War was chiefly a rivalry between the US and which nation?", choices: ["Soviet Union", "China", "Germany", "Cuba"], answer: 0 },
    { id: "his-m1", category: "History", difficulty: "medium", q: "In what year did World War I begin?", choices: ["1914", "1912", "1916", "1918"], answer: 0 },
    { id: "his-m2", category: "History", difficulty: "medium", q: "Who was British prime minister for most of World War II?", choices: ["Winston Churchill", "Neville Chamberlain", "Clement Attlee", "Anthony Eden"], answer: 0 },
    { id: "his-m3", category: "History", difficulty: "medium", q: "In what year did the French Revolution begin?", choices: ["1789", "1776", "1799", "1804"], answer: 0 },
    { id: "his-m4", category: "History", difficulty: "medium", q: "Who was the first emperor of Rome?", choices: ["Augustus", "Julius Caesar", "Nero", "Constantine"], answer: 0 },
    { id: "his-m5", category: "History", difficulty: "medium", q: "Which city was buried by Mount Vesuvius in 79 AD?", choices: ["Pompeii", "Carthage", "Ephesus", "Alexandria"], answer: 0 },
    { id: "his-m6", category: "History", difficulty: "medium", q: "In what year was the Magna Carta sealed?", choices: ["1215", "1066", "1189", "1348"], answer: 0 },
    { id: "his-m7", category: "History", difficulty: "medium", q: "Which explorer opened a sea route from Europe to India in 1498?", choices: ["Vasco da Gama", "Ferdinand Magellan", "Bartolomeu Dias", "John Cabot"], answer: 0 },
    { id: "his-m8", category: "History", difficulty: "medium", q: "In what year did the Bolsheviks seize power in Russia?", choices: ["1917", "1905", "1911", "1923"], answer: 0 },
    { id: "his-m9", category: "History", difficulty: "medium", q: "In what year did the American Civil War end?", choices: ["1865", "1861", "1877", "1848"], answer: 0 },
    { id: "his-m10", category: "History", difficulty: "medium", q: "Who was the last active pharaoh of ancient Egypt?", choices: ["Cleopatra VII", "Nefertiti", "Hatshepsut", "Ramesses II"], answer: 0 },
    { id: "his-m11", category: "History", difficulty: "medium", q: "Who became the first emperor of a unified China?", choices: ["Qin Shi Huang", "Kublai Khan", "Sun Yat-sen", "Wu Zetian"], answer: 0 },
    { id: "his-m12", category: "History", difficulty: "medium", q: "In which year did the Ottomans capture Constantinople?", choices: ["1453", "1204", "1492", "1517"], answer: 0 },
    { id: "his-m13", category: "History", difficulty: "medium", q: "Who founded the Mongol Empire in the early 13th century?", choices: ["Genghis Khan", "Kublai Khan", "Timur", "Attila"], answer: 0 },
    { id: "his-m14", category: "History", difficulty: "medium", q: "Which 1919 treaty formally ended World War I with Germany?", choices: ["Treaty of Versailles", "Treaty of Trianon", "Treaty of Brest-Litovsk", "Treaty of Tordesillas"], answer: 0 },
    { id: "his-m15", category: "History", difficulty: "medium", q: "Simon Bolivar led South American nations to independence from which empire?", choices: ["Spanish", "Portuguese", "British", "French"], answer: 0 },
    { id: "his-m16", category: "History", difficulty: "medium", q: "The Black Death devastated Europe during which century?", choices: ["14th century", "12th century", "16th century", "11th century"], answer: 0 },
    { id: "his-m17", category: "History", difficulty: "medium", q: "Who was the last tsar of Russia?", choices: ["Nicholas II", "Alexander III", "Peter III", "Ivan IV"], answer: 0 },
    { id: "his-m18", category: "History", difficulty: "medium", q: "In which year was the Battle of Hastings fought?", choices: ["1066", "1215", "1348", "911"], answer: 0 },
    { id: "his-m19", category: "History", difficulty: "medium", q: "The Rosetta Stone helped scholars decode which ancient script?", choices: ["Egyptian hieroglyphs", "Sumerian cuneiform", "Mayan glyphs", "Linear B"], answer: 0 },
    { id: "his-m20", category: "History", difficulty: "medium", q: "The 1492 fall of Granada completed the Reconquista in which region?", choices: ["Spain", "Sicily", "Balkans", "Anatolia"], answer: 0 },
    { id: "his-h1", category: "History", difficulty: "hard", q: "At the Battle of Talas in 751, the Abbasids defeated which empire?", choices: ["Tang China", "Byzantine Empire", "Sasanian Persia", "Mongol Empire"], answer: 0 },
    { id: "his-h2", category: "History", difficulty: "hard", q: "Who founded the Maurya Empire of ancient India?", choices: ["Chandragupta Maurya", "Ashoka", "Bindusara", "Samudragupta"], answer: 0 },
    { id: "his-h3", category: "History", difficulty: "hard", q: "The 1494 Treaty of Tordesillas divided new lands between Spain and which power?", choices: ["Portugal", "France", "England", "Netherlands"], answer: 0 },
    { id: "his-h4", category: "History", difficulty: "hard", q: "Mansa Musa, famed for his wealth, ruled which West African empire?", choices: ["Mali Empire", "Songhai Empire", "Ghana Empire", "Kingdom of Aksum"], answer: 0 },
    { id: "his-h5", category: "History", difficulty: "hard", q: "The 1648 Peace of Westphalia ended which war?", choices: ["Thirty Years' War", "Hundred Years' War", "Seven Years' War", "War of the Spanish Succession"], answer: 0 },
    { id: "his-h6", category: "History", difficulty: "hard", q: "In what year did Japan's Meiji Restoration begin?", choices: ["1868", "1854", "1889", "1912"], answer: 0 },
    { id: "his-h7", category: "History", difficulty: "hard", q: "The 1071 Battle of Manzikert was a crushing defeat for which empire?", choices: ["Byzantine Empire", "Abbasid Caliphate", "Kievan Rus", "Fatimid Caliphate"], answer: 0 },
    { id: "his-h8", category: "History", difficulty: "hard", q: "Who was the last independent ruler of the Aztec Empire?", choices: ["Cuauhtemoc", "Moctezuma II", "Cuitlahuac", "Itzcoatl"], answer: 0 },
    { id: "his-h9", category: "History", difficulty: "hard", q: "Which general reconquered North Africa from the Vandals for Emperor Justinian I?", choices: ["Belisarius", "Narses", "Heraclius", "John Tzimiskes"], answer: 0 },
    { id: "his-h10", category: "History", difficulty: "hard", q: "Who founded the Safavid dynasty of Iran in 1501?", choices: ["Shah Ismail I", "Nader Shah", "Abbas the Great", "Tamerlane"], answer: 0 },
    { id: "his-h11", category: "History", difficulty: "hard", q: "The 1713 Treaty of Utrecht helped end which conflict?", choices: ["War of the Spanish Succession", "Thirty Years War", "Seven Years War", "Napoleonic Wars"], answer: 0 },
    { id: "his-h12", category: "History", difficulty: "hard", q: "Which Byzantine emperor codified Roman law in the 6th century?", choices: ["Justinian I", "Constantine I", "Heraclius", "Basil II"], answer: 0 },
    { id: "his-h13", category: "History", difficulty: "hard", q: "Who led the Taiping Rebellion against the Qing dynasty?", choices: ["Hong Xiuquan", "Sun Yat-sen", "Zeng Guofan", "Li Zicheng"], answer: 0 },
    { id: "his-h14", category: "History", difficulty: "hard", q: "Which African nation defeated Italy at the Battle of Adwa in 1896?", choices: ["Ethiopia", "Sudan", "Egypt", "Somalia"], answer: 0 },
    { id: "his-h15", category: "History", difficulty: "hard", q: "Cyrus the Great founded which Persian dynasty?", choices: ["Achaemenid", "Sassanid", "Parthian", "Seleucid"], answer: 0 },
    { id: "his-h16", category: "History", difficulty: "hard", q: "The Edict of Milan in 313 AD granted tolerance to which religion?", choices: ["Christianity", "Judaism", "Mithraism", "Manichaeism"], answer: 0 },
    { id: "his-h17", category: "History", difficulty: "hard", q: "The 1857 Sepoy Mutiny was a revolt against which company's rule?", choices: ["British East India Company", "Dutch East India Company", "French East India Company", "Hudsons Bay Company"], answer: 0 },
    { id: "his-h18", category: "History", difficulty: "hard", q: "Who founded the Mughal Empire in India in 1526?", choices: ["Babur", "Akbar", "Humayun", "Shah Jahan"], answer: 0 },
    { id: "his-h19", category: "History", difficulty: "hard", q: "The 1571 Battle of Lepanto was a naval defeat for which empire?", choices: ["Ottoman Empire", "Venetian Republic", "Spanish Empire", "Byzantine Empire"], answer: 0 },
    { id: "his-h20", category: "History", difficulty: "hard", q: "Which Chinese dynasty first issued government-backed paper money?", choices: ["Song", "Tang", "Han", "Ming"], answer: 0 },
    { id: "his-h21", category: "History", difficulty: "hard", q: "In which year did Hannibal crush Rome at the Battle of Cannae?", choices: ["216 BC", "202 BC", "146 BC", "218 BC"], answer: 0 },
    { id: "his-h22", category: "History", difficulty: "hard", q: "Which Austrian statesman presided over the 1815 Congress of Vienna?", choices: ["Klemens von Metternich", "Talleyrand", "Viscount Castlereagh", "Karl von Hardenberg"], answer: 0 },
    // ======================== GEOGRAPHY ========================
    { id: "geo-e1", category: "Geography", difficulty: "easy", q: "What is the capital of France?", choices: ["Paris", "London", "Berlin", "Madrid"], answer: 0 },
    { id: "geo-e2", category: "Geography", difficulty: "easy", q: "What is the largest ocean on Earth?", choices: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], answer: 0 },
    { id: "geo-e3", category: "Geography", difficulty: "easy", q: "On which continent is the Sahara Desert located?", choices: ["Africa", "Asia", "Australia", "South America"], answer: 0 },
    { id: "geo-e4", category: "Geography", difficulty: "easy", q: "What is the capital of Japan?", choices: ["Tokyo", "Beijing", "Seoul", "Bangkok"], answer: 0 },
    { id: "geo-e5", category: "Geography", difficulty: "easy", q: "What is the capital of Italy?", choices: ["Rome", "Milan", "Venice", "Naples"], answer: 0 },
    { id: "geo-e6", category: "Geography", difficulty: "easy", q: "What is the capital of Egypt?", choices: ["Cairo", "Alexandria", "Nairobi", "Casablanca"], answer: 0 },
    { id: "geo-e7", category: "Geography", difficulty: "easy", q: "In which U.S. state is the Grand Canyon located?", choices: ["Arizona", "Nevada", "Utah", "Colorado"], answer: 0 },
    { id: "geo-e8", category: "Geography", difficulty: "easy", q: "On which continent is Brazil located?", choices: ["South America", "North America", "Africa", "Europe"], answer: 0 },
    { id: "geo-e9", category: "Geography", difficulty: "easy", q: "What is the capital of Russia?", choices: ["Moscow", "Saint Petersburg", "Kyiv", "Warsaw"], answer: 0 },
    { id: "geo-e10", category: "Geography", difficulty: "easy", q: "On which continent is Mount Everest located?", choices: ["Asia", "Africa", "Europe", "South America"], answer: 0 },
    { id: "geo-e11", category: "Geography", difficulty: "easy", q: "Which country is famously shaped like a boot?", choices: ["Italy", "Spain", "Greece", "Portugal"], answer: 0 },
    { id: "geo-e12", category: "Geography", difficulty: "easy", q: "The Great Barrier Reef lies off the coast of which country?", choices: ["Australia", "Mexico", "Thailand", "Egypt"], answer: 0 },
    { id: "geo-e13", category: "Geography", difficulty: "easy", q: "Which US state is the largest by land area?", choices: ["Alaska", "Texas", "California", "Montana"], answer: 0 },
    { id: "geo-e14", category: "Geography", difficulty: "easy", q: "The Amazon rainforest is mostly found in which country?", choices: ["Brazil", "Peru", "Colombia", "Venezuela"], answer: 0 },
    { id: "geo-e15", category: "Geography", difficulty: "easy", q: "Which country has a red maple leaf on its flag?", choices: ["Canada", "Norway", "Denmark", "Switzerland"], answer: 0 },
    { id: "geo-e16", category: "Geography", difficulty: "easy", q: "Which is the largest country in the world by area?", choices: ["Russia", "Canada", "China", "Brazil"], answer: 0 },
    { id: "geo-e17", category: "Geography", difficulty: "easy", q: "Which country is also an entire continent?", choices: ["Australia", "India", "Greenland", "Madagascar"], answer: 0 },
    { id: "geo-e18", category: "Geography", difficulty: "easy", q: "On which continent would you find the Andes Mountains?", choices: ["South America", "Africa", "Asia", "Europe"], answer: 0 },
    { id: "geo-m1", category: "Geography", difficulty: "medium", q: "What is the capital of Canada?", choices: ["Ottawa", "Toronto", "Vancouver", "Montreal"], answer: 0 },
    { id: "geo-m2", category: "Geography", difficulty: "medium", q: "What is the capital of Australia?", choices: ["Canberra", "Sydney", "Melbourne", "Perth"], answer: 0 },
    { id: "geo-m3", category: "Geography", difficulty: "medium", q: "The historic land of Abyssinia is known today as which country?", choices: ["Ethiopia", "Somalia", "Eritrea", "Sudan"], answer: 0 },
    { id: "geo-m4", category: "Geography", difficulty: "medium", q: "Into which sea does the Danube River empty?", choices: ["Black Sea", "Mediterranean Sea", "Caspian Sea", "Adriatic Sea"], answer: 0 },
    { id: "geo-m5", category: "Geography", difficulty: "medium", q: "What is the capital of Turkey?", choices: ["Ankara", "Istanbul", "Izmir", "Bursa"], answer: 0 },
    { id: "geo-m6", category: "Geography", difficulty: "medium", q: "What is the capital of Brazil?", choices: ["Brasilia", "Rio de Janeiro", "Sao Paulo", "Salvador"], answer: 0 },
    { id: "geo-m7", category: "Geography", difficulty: "medium", q: "In which country is Mount Kilimanjaro located?", choices: ["Tanzania", "Kenya", "Uganda", "Ethiopia"], answer: 0 },
    { id: "geo-m8", category: "Geography", difficulty: "medium", q: "The historic empire of Persia is known today as which country?", choices: ["Iran", "Iraq", "Turkey", "Syria"], answer: 0 },
    { id: "geo-m9", category: "Geography", difficulty: "medium", q: "Which strait separates Europe from Africa?", choices: ["Strait of Gibraltar", "Bosporus", "Strait of Hormuz", "Strait of Dover"], answer: 0 },
    { id: "geo-m10", category: "Geography", difficulty: "medium", q: "The historic kingdom of Siam is known today as which country?", choices: ["Thailand", "Cambodia", "Vietnam", "Myanmar"], answer: 0 },
    { id: "geo-m11", category: "Geography", difficulty: "medium", q: "Which river flows through the city of Baghdad?", choices: ["Tigris", "Euphrates", "Nile", "Jordan"], answer: 0 },
    { id: "geo-m12", category: "Geography", difficulty: "medium", q: "Which mountain range forms much of the border between Europe and Asia?", choices: ["Ural Mountains", "Alps", "Carpathians", "Caucasus"], answer: 0 },
    { id: "geo-m13", category: "Geography", difficulty: "medium", q: "What is the capital of New Zealand?", choices: ["Wellington", "Auckland", "Christchurch", "Hamilton"], answer: 0 },
    { id: "geo-m14", category: "Geography", difficulty: "medium", q: "Besides China, the Gobi Desert stretches into which country?", choices: ["Mongolia", "Kazakhstan", "Nepal", "Pakistan"], answer: 0 },
    { id: "geo-m15", category: "Geography", difficulty: "medium", q: "What is the capital of Vietnam?", choices: ["Hanoi", "Ho Chi Minh City", "Hue", "Da Nang"], answer: 0 },
    { id: "geo-m16", category: "Geography", difficulty: "medium", q: "What is the capital of Morocco?", choices: ["Rabat", "Casablanca", "Marrakesh", "Fez"], answer: 0 },
    { id: "geo-m17", category: "Geography", difficulty: "medium", q: "Which South American country has coastlines on both the Pacific Ocean and the Caribbean Sea?", choices: ["Colombia", "Ecuador", "Peru", "Chile"], answer: 0 },
    { id: "geo-m18", category: "Geography", difficulty: "medium", q: "The holiday island of Bali belongs to which country?", choices: ["Indonesia", "Malaysia", "Philippines", "Thailand"], answer: 0 },
    { id: "geo-h1", category: "Geography", difficulty: "hard", q: "What is the deepest lake in the world?", choices: ["Lake Baikal", "Lake Tanganyika", "Caspian Sea", "Lake Superior"], answer: 0 },
    { id: "geo-h2", category: "Geography", difficulty: "hard", q: "The Wakhan Corridor connects Afghanistan to which country?", choices: ["China", "India", "Russia", "Mongolia"], answer: 0 },
    { id: "geo-h3", category: "Geography", difficulty: "hard", q: "Which is the southernmost capital city of a sovereign state?", choices: ["Wellington", "Canberra", "Santiago", "Buenos Aires"], answer: 0 },
    { id: "geo-h4", category: "Geography", difficulty: "hard", q: "In which country is Angel Falls, the world's highest waterfall, located?", choices: ["Venezuela", "Brazil", "Colombia", "Peru"], answer: 0 },
    { id: "geo-h5", category: "Geography", difficulty: "hard", q: "The Atacama Desert lies mostly within which country?", choices: ["Chile", "Peru", "Bolivia", "Argentina"], answer: 0 },
    { id: "geo-h6", category: "Geography", difficulty: "hard", q: "Which country completely surrounds the nation of Lesotho?", choices: ["South Africa", "Namibia", "Botswana", "Zimbabwe"], answer: 0 },
    { id: "geo-h7", category: "Geography", difficulty: "hard", q: "Which country has the most ancient pyramids?", choices: ["Sudan", "Egypt", "Mexico", "Ethiopia"], answer: 0 },
    { id: "geo-h8", category: "Geography", difficulty: "hard", q: "The shore of which body of water is the lowest exposed land on Earth?", choices: ["Dead Sea", "Death Valley", "Caspian Sea", "Lake Assal"], answer: 0 },
    { id: "geo-h9", category: "Geography", difficulty: "hard", q: "Lake Titicaca lies between Peru and which other country?", choices: ["Bolivia", "Chile", "Ecuador", "Argentina"], answer: 0 },
    { id: "geo-h10", category: "Geography", difficulty: "hard", q: "Which strait separates Russia from Alaska?", choices: ["Bering Strait", "Torres Strait", "Bass Strait", "Cook Strait"], answer: 0 },
    { id: "geo-h11", category: "Geography", difficulty: "hard", q: "What is the capital of Bhutan?", choices: ["Thimphu", "Kathmandu", "Dhaka", "Vientiane"], answer: 0 },
    { id: "geo-h12", category: "Geography", difficulty: "hard", q: "What is the capital of Kyrgyzstan?", choices: ["Bishkek", "Dushanbe", "Tashkent", "Ashgabat"], answer: 0 },
    { id: "geo-h13", category: "Geography", difficulty: "hard", q: "What is the capital of Mongolia?", choices: ["Ulaanbaatar", "Astana", "Bishkek", "Almaty"], answer: 0 },
    { id: "geo-h14", category: "Geography", difficulty: "hard", q: "Which country administers three official capital cities?", choices: ["South Africa", "Bolivia", "Sri Lanka", "Malaysia"], answer: 0 },
    { id: "geo-h15", category: "Geography", difficulty: "hard", q: "What is the capital of Slovenia?", choices: ["Ljubljana", "Zagreb", "Bratislava", "Sarajevo"], answer: 0 },
    { id: "geo-h16", category: "Geography", difficulty: "hard", q: "Which country has the longest total coastline in the world?", choices: ["Canada", "Russia", "Indonesia", "Australia"], answer: 0 },
    { id: "geo-h17", category: "Geography", difficulty: "hard", q: "The Faroe Islands are an autonomous territory of which country?", choices: ["Denmark", "Norway", "Iceland", "Scotland"], answer: 0 },
    { id: "geo-h18", category: "Geography", difficulty: "hard", q: "What is the capital of Suriname?", choices: ["Paramaribo", "Georgetown", "Cayenne", "Bridgetown"], answer: 0 },
    { id: "geo-h19", category: "Geography", difficulty: "hard", q: "What is the capital of Eritrea?", choices: ["Asmara", "Djibouti", "Khartoum", "Addis Ababa"], answer: 0 },
    { id: "geo-h20", category: "Geography", difficulty: "hard", q: "Iguazu Falls lies on the border between Brazil and which country?", choices: ["Argentina", "Paraguay", "Uruguay", "Bolivia"], answer: 0 },
    // ========================== SPORTS ==========================
    { id: "spo-e1", category: "Sports", difficulty: "easy", q: "How many players from one team are on the field in soccer?", choices: ["11", "9", "7", "13"], answer: 0 },
    { id: "spo-e2", category: "Sports", difficulty: "easy", q: "In which sport would you perform a slam dunk?", choices: ["Basketball", "Volleyball", "Tennis", "Baseball"], answer: 0 },
    { id: "spo-e3", category: "Sports", difficulty: "easy", q: "In golf, what is the term for one stroke under par on a hole?", choices: ["Birdie", "Bogey", "Eagle", "Par"], answer: 0 },
    { id: "spo-e4", category: "Sports", difficulty: "easy", q: "Which sport is played at Wimbledon?", choices: ["Tennis", "Golf", "Cricket", "Rugby"], answer: 0 },
    { id: "spo-e5", category: "Sports", difficulty: "easy", q: "How many rings are on the Olympic flag?", choices: ["5", "4", "6", "3"], answer: 0 },
    { id: "spo-e6", category: "Sports", difficulty: "easy", q: "In ice hockey, what object do players hit into the goal?", choices: ["Puck", "Ball", "Shuttlecock", "Disc"], answer: 0 },
    { id: "spo-e7", category: "Sports", difficulty: "easy", q: "How many holes are on a standard full-size golf course?", choices: ["18", "9", "12", "24"], answer: 0 },
    { id: "spo-e8", category: "Sports", difficulty: "easy", q: "What color card sends a player off in soccer?", choices: ["Red", "Yellow", "Blue", "Green"], answer: 0 },
    { id: "spo-e9", category: "Sports", difficulty: "easy", q: "Usain Bolt is famous for which sport?", choices: ["Sprinting", "Swimming", "Boxing", "Cycling"], answer: 0 },
    { id: "spo-e10", category: "Sports", difficulty: "easy", q: "How many players from one team are on a basketball court?", choices: ["5", "6", "7", "4"], answer: 0 },
    { id: "spo-e11", category: "Sports", difficulty: "easy", q: "What color jersey is worn by the overall leader of the Tour de France?", choices: ["Yellow", "Green", "Red", "Blue"], answer: 0 },
    { id: "spo-e12", category: "Sports", difficulty: "easy", q: "How many strikes make an out in baseball?", choices: ["Three", "Two", "Four", "Five"], answer: 0 },
    { id: "spo-e13", category: "Sports", difficulty: "easy", q: "Which sport features scrums, rucks, and tries?", choices: ["Rugby", "Hockey", "Baseball", "Golf"], answer: 0 },
    { id: "spo-e14", category: "Sports", difficulty: "easy", q: "In boxing, what do the letters KO stand for?", choices: ["Knockout", "Keep Open", "Knock Over", "Key Opponent"], answer: 0 },
    { id: "spo-e15", category: "Sports", difficulty: "easy", q: "Which sport is played with a shuttlecock?", choices: ["Badminton", "Squash", "Table tennis", "Lacrosse"], answer: 0 },
    { id: "spo-e16", category: "Sports", difficulty: "easy", q: "Which swimming stroke is named after an insect?", choices: ["Butterfly", "Backstroke", "Freestyle", "Breaststroke"], answer: 0 },
    { id: "spo-e17", category: "Sports", difficulty: "easy", q: "In which sport is the Ryder Cup contested?", choices: ["Golf", "Sailing", "Cricket", "Rowing"], answer: 0 },
    { id: "spo-m1", category: "Sports", difficulty: "medium", q: "Which country has won the most FIFA World Cup titles?", choices: ["Brazil", "Germany", "Italy", "Argentina"], answer: 0 },
    { id: "spo-m2", category: "Sports", difficulty: "medium", q: "The Ashes is a cricket rivalry between England and which country?", choices: ["Australia", "India", "South Africa", "New Zealand"], answer: 0 },
    { id: "spo-m3", category: "Sports", difficulty: "medium", q: "How many points is a touchdown worth in American football?", choices: ["6", "7", "3", "5"], answer: 0 },
    { id: "spo-m4", category: "Sports", difficulty: "medium", q: "In tennis scoring, what word means a score of zero?", choices: ["Love", "Deuce", "Ace", "Fault"], answer: 0 },
    { id: "spo-m5", category: "Sports", difficulty: "medium", q: "The Tour de France is a competition in which sport?", choices: ["Cycling", "Running", "Sailing", "Horse racing"], answer: 0 },
    { id: "spo-m6", category: "Sports", difficulty: "medium", q: "Which Grand Slam tennis tournament is played on clay courts?", choices: ["French Open", "Wimbledon", "US Open", "Australian Open"], answer: 0 },
    { id: "spo-m7", category: "Sports", difficulty: "medium", q: "What is the maximum break a player can score in a single frame of snooker?", choices: ["147", "180", "100", "155"], answer: 0 },
    { id: "spo-m8", category: "Sports", difficulty: "medium", q: "In which country did the martial art judo originate?", choices: ["Japan", "China", "Korea", "Thailand"], answer: 0 },
    { id: "spo-m9", category: "Sports", difficulty: "medium", q: "How many players from one team are on the field in cricket?", choices: ["11", "9", "13", "10"], answer: 0 },
    { id: "spo-m10", category: "Sports", difficulty: "medium", q: "How often are the modern Summer Olympic Games held?", choices: ["Every 4 years", "Every 2 years", "Every 3 years", "Every 5 years"], answer: 0 },
    { id: "spo-m11", category: "Sports", difficulty: "medium", q: "How many runs are scored when a cricket ball is hit over the boundary on the full?", choices: ["Six", "Four", "Five", "Eight"], answer: 0 },
    { id: "spo-m12", category: "Sports", difficulty: "medium", q: "What is the highest possible break in a single frame of snooker?", choices: ["147", "155", "180", "100"], answer: 0 },
    { id: "spo-m13", category: "Sports", difficulty: "medium", q: "Which sport awards the Stanley Cup to its champion?", choices: ["Ice hockey", "Basketball", "Baseball", "American football"], answer: 0 },
    { id: "spo-m14", category: "Sports", difficulty: "medium", q: "In athletics, how many separate events make up the decathlon?", choices: ["Ten", "Seven", "Five", "Twelve"], answer: 0 },
    { id: "spo-m15", category: "Sports", difficulty: "medium", q: "How many points is a try worth in rugby union?", choices: ["Five", "Four", "Three", "Six"], answer: 0 },
    { id: "spo-m16", category: "Sports", difficulty: "medium", q: "In cycling, what is a solo race against the clock called?", choices: ["Time trial", "Criterium", "Sprint", "Pursuit"], answer: 0 },
    { id: "spo-m17", category: "Sports", difficulty: "medium", q: "In baseball, what is a home run hit with all bases occupied called?", choices: ["Grand slam", "Triple play", "Double header", "Full count"], answer: 0 },
    { id: "spo-m18", category: "Sports", difficulty: "medium", q: "Which flag is waved to signal the end of a Formula One race?", choices: ["Chequered flag", "Yellow flag", "Red flag", "Green flag"], answer: 0 },
    { id: "spo-m19", category: "Sports", difficulty: "medium", q: "The Korean martial art meaning the way of the foot and fist is called what?", choices: ["Taekwondo", "Karate", "Kung fu", "Aikido"], answer: 0 },
    { id: "spo-m20", category: "Sports", difficulty: "medium", q: "How many players from one team are on the court in indoor volleyball?", choices: ["Six", "Five", "Seven", "Eleven"], answer: 0 },
    { id: "spo-m21", category: "Sports", difficulty: "medium", q: "In tennis, what is the term for a tied score of 40-40?", choices: ["Deuce", "Advantage", "Break", "Rally"], answer: 0 },
    { id: "spo-m22", category: "Sports", difficulty: "medium", q: "Which Italian race is one of cycling's three Grand Tours alongside the Tour de France?", choices: ["Giro d'Italia", "Milan-Sanremo", "Paris-Roubaix", "Il Lombardia"], answer: 0 },
    { id: "spo-h1", category: "Sports", difficulty: "hard", q: "Who became the first Formula One World Champion in 1950?", choices: ["Giuseppe Farina", "Juan Manuel Fangio", "Alberto Ascari", "Stirling Moss"], answer: 0 },
    { id: "spo-h2", category: "Sports", difficulty: "hard", q: "Which country won the first Rugby World Cup in 1987?", choices: ["New Zealand", "Australia", "France", "England"], answer: 0 },
    { id: "spo-h3", category: "Sports", difficulty: "hard", q: "Who was the first gymnast to score a perfect 10 at the Olympics?", choices: ["Nadia Comaneci", "Olga Korbut", "Vera Caslavska", "Larisa Latynina"], answer: 0 },
    { id: "spo-h4", category: "Sports", difficulty: "hard", q: "Which country won the first FIFA World Cup in 1930?", choices: ["Uruguay", "Argentina", "Brazil", "Italy"], answer: 0 },
    { id: "spo-h5", category: "Sports", difficulty: "hard", q: "Who was the first person to run a mile in under four minutes?", choices: ["Roger Bannister", "John Landy", "Herb Elliott", "Emil Zatopek"], answer: 0 },
    { id: "spo-h6", category: "Sports", difficulty: "hard", q: "Which city hosted the first modern Olympic Games in 1896?", choices: ["Athens", "Paris", "London", "Rome"], answer: 0 },
    { id: "spo-h7", category: "Sports", difficulty: "hard", q: "Which country won the first Cricket World Cup in 1975?", choices: ["West Indies", "Australia", "England", "India"], answer: 0 },
    { id: "spo-h8", category: "Sports", difficulty: "hard", q: "Who won the first Tour de France in 1903?", choices: ["Maurice Garin", "Henri Cornet", "Lucien Petit-Breton", "Octave Lapize"], answer: 0 },
    { id: "spo-h9", category: "Sports", difficulty: "hard", q: "Which team won the first Super Bowl, held in 1967?", choices: ["Green Bay Packers", "Kansas City Chiefs", "New York Jets", "Miami Dolphins"], answer: 0 },
    { id: "spo-h10", category: "Sports", difficulty: "hard", q: "Which country hosted and won the first FIFA World Cup on European soil in 1934?", choices: ["Italy", "France", "Germany", "Spain"], answer: 0 },
    { id: "spo-h11", category: "Sports", difficulty: "hard", q: "Who scored the highest individual innings in Test cricket with 400 not out?", choices: ["Brian Lara", "Sachin Tendulkar", "Matthew Hayden", "Garry Sobers"], answer: 0 },
    { id: "spo-h12", category: "Sports", difficulty: "hard", q: "Who was the first boxer to win the world heavyweight title three separate times?", choices: ["Muhammad Ali", "Joe Frazier", "Floyd Patterson", "Evander Holyfield"], answer: 0 },
    { id: "spo-h13", category: "Sports", difficulty: "hard", q: "In which year did Roger Bannister run the first sub-four-minute mile?", choices: ["1954", "1948", "1960", "1952"], answer: 0 },
    { id: "spo-h14", category: "Sports", difficulty: "hard", q: "Which golfer was nicknamed the Golden Bear?", choices: ["Jack Nicklaus", "Arnold Palmer", "Gary Player", "Ben Hogan"], answer: 0 },
    { id: "spo-h15", category: "Sports", difficulty: "hard", q: "Who holds the NBA record for the most points scored in a single game?", choices: ["Wilt Chamberlain", "Kobe Bryant", "Michael Jordan", "Elgin Baylor"], answer: 0 },
    { id: "spo-h16", category: "Sports", difficulty: "hard", q: "Who was the first player to win all four tennis majors in one calendar year?", choices: ["Don Budge", "Rod Laver", "Fred Perry", "Bill Tilden"], answer: 0 },
    { id: "spo-h17", category: "Sports", difficulty: "hard", q: "Which swimmer won eight gold medals at a single Olympic Games?", choices: ["Michael Phelps", "Mark Spitz", "Ian Thorpe", "Matt Biondi"], answer: 0 },
    { id: "spo-h18", category: "Sports", difficulty: "hard", q: "Which cyclist won five consecutive Tours de France from 1991 to 1995?", choices: ["Miguel Indurain", "Bernard Hinault", "Eddy Merckx", "Greg LeMond"], answer: 0 },
    { id: "spo-h19", category: "Sports", difficulty: "hard", q: "Who was the first cricketer to score 100 international centuries?", choices: ["Sachin Tendulkar", "Ricky Ponting", "Jacques Kallis", "Kumar Sangakkara"], answer: 0 },
    { id: "spo-h20", category: "Sports", difficulty: "hard", q: "Who holds the Major League Baseball record for most career home runs?", choices: ["Barry Bonds", "Hank Aaron", "Babe Ruth", "Willie Mays"], answer: 0 },
    { id: "spo-h21", category: "Sports", difficulty: "hard", q: "Which country hosted the first modern Winter Olympic Games in 1924?", choices: ["France", "Switzerland", "Norway", "Austria"], answer: 0 },
    // ======================== FILM & TV ========================
    { id: "film-e1", category: "Film & TV", difficulty: "easy", q: "Which actor played Jack in the 1997 film Titanic?", choices: ["Leonardo DiCaprio", "Brad Pitt", "Tom Cruise", "Matt Damon"], answer: 0 },
    { id: "film-e2", category: "Film & TV", difficulty: "easy", q: "In Disney's The Lion King, what kind of animal is Simba?", choices: ["Lion", "Tiger", "Leopard", "Cheetah"], answer: 0 },
    { id: "film-e3", category: "Film & TV", difficulty: "easy", q: "The villain Darth Vader appears in which film franchise?", choices: ["Star Wars", "Star Trek", "Dune", "Guardians of the Galaxy"], answer: 0 },
    { id: "film-e4", category: "Film & TV", difficulty: "easy", q: "Who directed the 1997 blockbuster Titanic?", choices: ["James Cameron", "Steven Spielberg", "Ridley Scott", "Martin Scorsese"], answer: 0 },
    { id: "film-e5", category: "Film & TV", difficulty: "easy", q: "Which superhero is the alter ego of billionaire Tony Stark?", choices: ["Iron Man", "Batman", "Superman", "Spider-Man"], answer: 0 },
    { id: "film-e6", category: "Film & TV", difficulty: "easy", q: "Which sitcom follows characters named Ross, Rachel, and Monica?", choices: ["Friends", "Seinfeld", "The Office", "How I Met Your Mother"], answer: 0 },
    { id: "film-e7", category: "Film & TV", difficulty: "easy", q: "What is the name of the cowboy toy in Pixar's Toy Story?", choices: ["Woody", "Buzz", "Rex", "Hamm"], answer: 0 },
    { id: "film-e8", category: "Film & TV", difficulty: "easy", q: "Which animated Disney film features a snowman named Olaf?", choices: ["Frozen", "Moana", "Tangled", "Encanto"], answer: 0 },
    { id: "film-e9", category: "Film & TV", difficulty: "easy", q: "Which actor plays Neo in the 1999 film The Matrix?", choices: ["Keanu Reeves", "Tom Hanks", "Will Smith", "Nicolas Cage"], answer: 0 },
    { id: "film-e10", category: "Film & TV", difficulty: "easy", q: "The line about phoning home comes from which Spielberg film?", choices: ["E.T. the Extra-Terrestrial", "Close Encounters of the Third Kind", "WALL-E", "Flight of the Navigator"], answer: 0 },
    { id: "film-e11", category: "Film & TV", difficulty: "easy", q: "What kind of fish is Nemo in Finding Nemo?", choices: ["Clownfish", "Goldfish", "Angelfish", "Pufferfish"], answer: 0 },
    { id: "film-e12", category: "Film & TV", difficulty: "easy", q: "Which actor plays Captain Jack Sparrow in Pirates of the Caribbean?", choices: ["Johnny Depp", "Orlando Bloom", "Brad Pitt", "Russell Crowe"], answer: 0 },
    { id: "film-e13", category: "Film & TV", difficulty: "easy", q: "What is the name of the wizarding school in Harry Potter?", choices: ["Hogwarts", "Durmstrang", "Ilvermorny", "Beauxbatons"], answer: 0 },
    { id: "film-e14", category: "Film & TV", difficulty: "easy", q: "Which TV series features dragons and a fight for the Iron Throne?", choices: ["Game of Thrones", "The Witcher", "Vikings", "The Last Kingdom"], answer: 0 },
    { id: "film-e15", category: "Film & TV", difficulty: "easy", q: "Which film series centers on a boxer named Rocky Balboa?", choices: ["Rocky", "Raging Bull", "The Fighter", "Creed II"], answer: 0 },
    { id: "film-e16", category: "Film & TV", difficulty: "easy", q: "What color is the ogre Shrek?", choices: ["Green", "Blue", "Purple", "Orange"], answer: 0 },
    { id: "film-e17", category: "Film & TV", difficulty: "easy", q: "Which sitcom is set in a Boston bar where everybody knows your name?", choices: ["Cheers", "Frasier", "How I Met Your Mother", "It's Always Sunny in Philadelphia"], answer: 0 },
    { id: "film-e18", category: "Film & TV", difficulty: "easy", q: "Which Pixar film features a family of superheroes called the Parrs?", choices: ["The Incredibles", "Big Hero 6", "Megamind", "Despicable Me"], answer: 0 },
    { id: "film-m1", category: "Film & TV", difficulty: "medium", q: "Who directed the 1994 crime film Pulp Fiction?", choices: ["Quentin Tarantino", "Martin Scorsese", "David Fincher", "Guy Ritchie"], answer: 0 },
    { id: "film-m2", category: "Film & TV", difficulty: "medium", q: "Which film won the Academy Award for Best Picture for 1994?", choices: ["Forrest Gump", "Pulp Fiction", "The Shawshank Redemption", "Four Weddings and a Funeral"], answer: 0 },
    { id: "film-m3", category: "Film & TV", difficulty: "medium", q: "Who played the Joker in the 2008 film The Dark Knight?", choices: ["Heath Ledger", "Jack Nicholson", "Joaquin Phoenix", "Jared Leto"], answer: 0 },
    { id: "film-m4", category: "Film & TV", difficulty: "medium", q: "Who directed Jaws, E.T., and Jurassic Park?", choices: ["Steven Spielberg", "George Lucas", "Robert Zemeckis", "Ridley Scott"], answer: 0 },
    { id: "film-m5", category: "Film & TV", difficulty: "medium", q: "Which TV series is set in the fictional town of Hawkins, Indiana?", choices: ["Stranger Things", "Riverdale", "Twin Peaks", "Dark"], answer: 0 },
    { id: "film-m6", category: "Film & TV", difficulty: "medium", q: "Who directed the 2010 sci-fi film Inception?", choices: ["Christopher Nolan", "Denis Villeneuve", "Darren Aronofsky", "Ridley Scott"], answer: 0 },
    { id: "film-m7", category: "Film & TV", difficulty: "medium", q: "Which actress won the Best Actress Oscar for La La Land?", choices: ["Emma Stone", "Natalie Portman", "Jennifer Lawrence", "Amy Adams"], answer: 0 },
    { id: "film-m8", category: "Film & TV", difficulty: "medium", q: "Who directed the 2019 South Korean film Parasite?", choices: ["Bong Joon-ho", "Park Chan-wook", "Hirokazu Kore-eda", "Wong Kar-wai"], answer: 0 },
    { id: "film-m9", category: "Film & TV", difficulty: "medium", q: "The line about an offer he cannot refuse comes from which 1972 film?", choices: ["The Godfather", "Goodfellas", "Scarface", "The Untouchables"], answer: 0 },
    { id: "film-m10", category: "Film & TV", difficulty: "medium", q: "Who composed the iconic orchestral score for Star Wars?", choices: ["John Williams", "Hans Zimmer", "Ennio Morricone", "Danny Elfman"], answer: 0 },
    { id: "film-m11", category: "Film & TV", difficulty: "medium", q: "Which actress won an Oscar for playing Margaret Thatcher in The Iron Lady?", choices: ["Meryl Streep", "Judi Dench", "Helen Mirren", "Glenn Close"], answer: 0 },
    { id: "film-m12", category: "Film & TV", difficulty: "medium", q: "Which 1999 film features the character Tyler Durden?", choices: ["Fight Club", "American Psycho", "Se7en", "Memento"], answer: 0 },
    { id: "film-m13", category: "Film & TV", difficulty: "medium", q: "In Breaking Bad, what alias does Walter White use?", choices: ["Heisenberg", "Gus", "Saul", "Mike"], answer: 0 },
    { id: "film-m14", category: "Film & TV", difficulty: "medium", q: "Which 1994 prison drama is set in Shawshank State Penitentiary?", choices: ["The Shawshank Redemption", "The Green Mile", "Cool Hand Luke", "Escape from Alcatraz"], answer: 0 },
    { id: "film-m15", category: "Film & TV", difficulty: "medium", q: "Who directed the Studio Ghibli film Spirited Away?", choices: ["Hayao Miyazaki", "Isao Takahata", "Mamoru Hosoda", "Makoto Shinkai"], answer: 0 },
    { id: "film-m16", category: "Film & TV", difficulty: "medium", q: "Which Italian director made the 1960 film La Dolce Vita?", choices: ["Federico Fellini", "Michelangelo Antonioni", "Luchino Visconti", "Vittorio De Sica"], answer: 0 },
    { id: "film-m17", category: "Film & TV", difficulty: "medium", q: "Which actress played Clarice Starling in The Silence of the Lambs?", choices: ["Jodie Foster", "Sigourney Weaver", "Susan Sarandon", "Michelle Pfeiffer"], answer: 0 },
    { id: "film-m18", category: "Film & TV", difficulty: "medium", q: "Which actor played mob boss Tony Soprano in The Sopranos?", choices: ["James Gandolfini", "Ray Liotta", "Michael Imperioli", "Steve Buscemi"], answer: 0 },
    { id: "film-m19", category: "Film & TV", difficulty: "medium", q: "Which director made the classic thrillers Vertigo and Psycho?", choices: ["Alfred Hitchcock", "Orson Welles", "Billy Wilder", "Fritz Lang"], answer: 0 },
    { id: "film-m20", category: "Film & TV", difficulty: "medium", q: "Which 2016 musical stars Emma Stone and Ryan Gosling in Los Angeles?", choices: ["La La Land", "The Greatest Showman", "A Star Is Born", "Chicago"], answer: 0 },
    { id: "film-h1", category: "Film & TV", difficulty: "hard", q: "Who directed the 1925 Soviet silent film Battleship Potemkin?", choices: ["Sergei Eisenstein", "Dziga Vertov", "Vsevolod Pudovkin", "Lev Kuleshov"], answer: 0 },
    { id: "film-h2", category: "Film & TV", difficulty: "hard", q: "Who directed the 1927 German science-fiction film Metropolis?", choices: ["Fritz Lang", "F.W. Murnau", "G.W. Pabst", "Robert Wiene"], answer: 0 },
    { id: "film-h3", category: "Film & TV", difficulty: "hard", q: "Which Argentine film was the first Latin American winner of the Best Foreign Language Film Oscar?", choices: ["The Official Story", "Amores Perros", "City of God", "Central Station"], answer: 0 },
    { id: "film-h4", category: "Film & TV", difficulty: "hard", q: "Who directed the 1966 war film The Battle of Algiers?", choices: ["Gillo Pontecorvo", "Roberto Rossellini", "Vittorio De Sica", "Michelangelo Antonioni"], answer: 0 },
    { id: "film-h5", category: "Film & TV", difficulty: "hard", q: "Which Japanese director made the 1953 film Tokyo Story?", choices: ["Yasujiro Ozu", "Akira Kurosawa", "Kenji Mizoguchi", "Mikio Naruse"], answer: 0 },
    { id: "film-h6", category: "Film & TV", difficulty: "hard", q: "Who directed the 1960 French New Wave film Breathless?", choices: ["Jean-Luc Godard", "Francois Truffaut", "Claude Chabrol", "Eric Rohmer"], answer: 0 },
    { id: "film-h7", category: "Film & TV", difficulty: "hard", q: "Who directed the 1928 silent film The Passion of Joan of Arc?", choices: ["Carl Theodor Dreyer", "Abel Gance", "Jean Epstein", "Marcel L'Herbier"], answer: 0 },
    { id: "film-h8", category: "Film & TV", difficulty: "hard", q: "Which film won the very first Academy Award for Best Picture?", choices: ["Wings", "Sunrise", "The Jazz Singer", "The Broadway Melody"], answer: 0 },
    { id: "film-h9", category: "Film & TV", difficulty: "hard", q: "Who directed the 1957 Swedish film The Seventh Seal?", choices: ["Ingmar Bergman", "Victor Sjostrom", "Bo Widerberg", "Jan Troell"], answer: 0 },
    { id: "film-h10", category: "Film & TV", difficulty: "hard", q: "Which Indian filmmaker directed the 1955 film Pather Panchali?", choices: ["Satyajit Ray", "Ritwik Ghatak", "Mrinal Sen", "Bimal Roy"], answer: 0 },
    { id: "film-h11", category: "Film & TV", difficulty: "hard", q: "Who directed the 1966 spaghetti western The Good, the Bad and the Ugly?", choices: ["Sergio Leone", "Sergio Corbucci", "Sergio Sollima", "Damiano Damiani"], answer: 0 },
    { id: "film-h12", category: "Film & TV", difficulty: "hard", q: "Which 1962 French short film is told almost entirely through still photographs?", choices: ["La Jetee", "Last Year at Marienbad", "Hiroshima Mon Amour", "Zazie dans le Metro"], answer: 0 },
    { id: "film-h13", category: "Film & TV", difficulty: "hard", q: "Who composed the electronic score for the 1982 film Blade Runner?", choices: ["Vangelis", "Jerry Goldsmith", "Giorgio Moroder", "Tangerine Dream"], answer: 0 },
    { id: "film-h14", category: "Film & TV", difficulty: "hard", q: "Who was the first winner of the Academy Award for Best Actress?", choices: ["Janet Gaynor", "Clara Bow", "Gloria Swanson", "Mary Pickford"], answer: 0 },
    { id: "film-h15", category: "Film & TV", difficulty: "hard", q: "Which Kurosawa film was remade as the western The Magnificent Seven?", choices: ["Seven Samurai", "Yojimbo", "Rashomon", "Ran"], answer: 0 },
    { id: "film-h16", category: "Film & TV", difficulty: "hard", q: "Which cinematographer won three consecutive Oscars for Gravity, Birdman and The Revenant?", choices: ["Emmanuel Lubezki", "Roger Deakins", "Robert Richardson", "Janusz Kaminski"], answer: 0 },
    { id: "film-h17", category: "Film & TV", difficulty: "hard", q: "Who directed the 1975 film Jeanne Dielman, once voted the greatest film ever?", choices: ["Chantal Akerman", "Agnes Varda", "Vera Chytilova", "Marguerite Duras"], answer: 0 },
    { id: "film-h18", category: "Film & TV", difficulty: "hard", q: "Which 1948 Italian neorealist film follows a man searching for his stolen bicycle?", choices: ["Bicycle Thieves", "Rome, Open City", "Umberto D.", "La Terra Trema"], answer: 0 },
    { id: "film-h19", category: "Film & TV", difficulty: "hard", q: "Who directed the 2000 Hong Kong romance In the Mood for Love?", choices: ["Wong Kar-wai", "Zhang Yimou", "Ang Lee", "Edward Yang"], answer: 0 },
    { id: "film-h20", category: "Film & TV", difficulty: "hard", q: "Which film was the first to win the Big Five Academy Awards?", choices: ["It Happened One Night", "Gone with the Wind", "Mrs. Miniver", "You Can't Take It with You"], answer: 0 },
    { id: "film-h21", category: "Film & TV", difficulty: "hard", q: "Who directed the 2011 Iranian drama A Separation?", choices: ["Asghar Farhadi", "Abbas Kiarostami", "Jafar Panahi", "Majid Majidi"], answer: 0 },
    { id: "film-h22", category: "Film & TV", difficulty: "hard", q: "Which performer holds the record with four competitive acting Oscars?", choices: ["Katharine Hepburn", "Bette Davis", "Ingrid Bergman", "Meryl Streep"], answer: 0 },
    { id: "film-h23", category: "Film & TV", difficulty: "hard", q: "Who directed the 1966 Soviet historical epic Andrei Rublev?", choices: ["Andrei Tarkovsky", "Sergei Parajanov", "Elem Klimov", "Sergei Bondarchuk"], answer: 0 },
    { id: "film-h24", category: "Film & TV", difficulty: "hard", q: "Which film won the first Academy Award for Best Animated Feature in 2002?", choices: ["Shrek", "Monsters, Inc.", "Spirited Away", "Ice Age"], answer: 0 },
    // ===================== ART & LITERATURE =====================
    { id: "lit-e1", category: "Art & Literature", difficulty: "easy", q: "Who wrote the play 'Romeo and Juliet'?", choices: ["William Shakespeare", "Charles Dickens", "Mark Twain", "Jane Austen"], answer: 0 },
    { id: "lit-e2", category: "Art & Literature", difficulty: "easy", q: "Who painted the 'Mona Lisa'?", choices: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Rembrandt"], answer: 0 },
    { id: "lit-e3", category: "Art & Literature", difficulty: "easy", q: "Which painter famously cut off part of his own ear?", choices: ["Vincent van Gogh", "Pablo Picasso", "Claude Monet", "Henri Matisse"], answer: 0 },
    { id: "lit-e4", category: "Art & Literature", difficulty: "easy", q: "Who painted the ceiling of the Sistine Chapel?", choices: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], answer: 0 },
    { id: "lit-e5", category: "Art & Literature", difficulty: "easy", q: "Who wrote 'The Adventures of Tom Sawyer'?", choices: ["Mark Twain", "Ernest Hemingway", "Herman Melville", "Nathaniel Hawthorne"], answer: 0 },
    { id: "lit-e6", category: "Art & Literature", difficulty: "easy", q: "Who wrote 'A Christmas Carol'?", choices: ["Charles Dickens", "Jane Austen", "Leo Tolstoy", "Victor Hugo"], answer: 0 },
    { id: "lit-e7", category: "Art & Literature", difficulty: "easy", q: "Who wrote the 'Harry Potter' book series?", choices: ["J.K. Rowling", "Roald Dahl", "C.S. Lewis", "Philip Pullman"], answer: 0 },
    { id: "lit-e8", category: "Art & Literature", difficulty: "easy", q: "Who is credited with writing the ancient Greek epic 'The Odyssey'?", choices: ["Homer", "Virgil", "Ovid", "Sophocles"], answer: 0 },
    { id: "lit-e9", category: "Art & Literature", difficulty: "easy", q: "Who wrote 'Alice's Adventures in Wonderland'?", choices: ["Lewis Carroll", "J.M. Barrie", "Kenneth Grahame", "A.A. Milne"], answer: 0 },
    { id: "lit-e10", category: "Art & Literature", difficulty: "easy", q: "Who wrote the children's book 'The Cat in the Hat'?", choices: ["Dr. Seuss", "Roald Dahl", "Maurice Sendak", "Shel Silverstein"], answer: 0 },
    { id: "lit-e11", category: "Art & Literature", difficulty: "easy", q: "Which Italian city is the main setting of Shakespeare's 'Romeo and Juliet'?", choices: ["Verona", "Venice", "Florence", "Rome"], answer: 0 },
    { id: "lit-e12", category: "Art & Literature", difficulty: "easy", q: "Who created the detective 'Sherlock Holmes'?", choices: ["Arthur Conan Doyle", "Agatha Christie", "Edgar Allan Poe", "Wilkie Collins"], answer: 0 },
    { id: "lit-e13", category: "Art & Literature", difficulty: "easy", q: "Who wrote 'The Old Man and the Sea'?", choices: ["Ernest Hemingway", "William Faulkner", "John Steinbeck", "F. Scott Fitzgerald"], answer: 0 },
    { id: "lit-e14", category: "Art & Literature", difficulty: "easy", q: "Which Spanish artist helped pioneer the Cubism movement?", choices: ["Pablo Picasso", "Salvador Dali", "Francisco Goya", "Joan Miro"], answer: 0 },
    { id: "lit-e15", category: "Art & Literature", difficulty: "easy", q: "Who wrote 'Charlie and the Chocolate Factory'?", choices: ["Roald Dahl", "C.S. Lewis", "A.A. Milne", "Dr. Seuss"], answer: 0 },
    { id: "lit-e16", category: "Art & Literature", difficulty: "easy", q: "Who wrote the tragedy 'Macbeth'?", choices: ["William Shakespeare", "Christopher Marlowe", "Ben Jonson", "John Webster"], answer: 0 },
    { id: "lit-e17", category: "Art & Literature", difficulty: "easy", q: "Who wrote the fantasy novel 'The Hobbit'?", choices: ["J.R.R. Tolkien", "C.S. Lewis", "George R.R. Martin", "Philip Pullman"], answer: 0 },
    { id: "lit-m1", category: "Art & Literature", difficulty: "medium", q: "Who wrote the novel 'War and Peace'?", choices: ["Leo Tolstoy", "Fyodor Dostoevsky", "Anton Chekhov", "Ivan Turgenev"], answer: 0 },
    { id: "lit-m2", category: "Art & Literature", difficulty: "medium", q: "Who painted the anti-war mural 'Guernica'?", choices: ["Pablo Picasso", "Salvador Dali", "Joan Miro", "Henri Matisse"], answer: 0 },
    { id: "lit-m3", category: "Art & Literature", difficulty: "medium", q: "Who wrote the novel 'Pride and Prejudice'?", choices: ["Jane Austen", "Charlotte Bronte", "Emily Bronte", "George Eliot"], answer: 0 },
    { id: "lit-m4", category: "Art & Literature", difficulty: "medium", q: "Who painted 'The Scream'?", choices: ["Edvard Munch", "Gustav Klimt", "Egon Schiele", "Wassily Kandinsky"], answer: 0 },
    { id: "lit-m5", category: "Art & Literature", difficulty: "medium", q: "Who wrote the Spanish novel 'Don Quixote'?", choices: ["Miguel de Cervantes", "Lope de Vega", "Federico Garcia Lorca", "Jorge Luis Borges"], answer: 0 },
    { id: "lit-m6", category: "Art & Literature", difficulty: "medium", q: "Who wrote the novel 'Crime and Punishment'?", choices: ["Fyodor Dostoevsky", "Leo Tolstoy", "Nikolai Gogol", "Alexander Pushkin"], answer: 0 },
    { id: "lit-m7", category: "Art & Literature", difficulty: "medium", q: "Who painted the melting-clocks work 'The Persistence of Memory'?", choices: ["Salvador Dali", "Rene Magritte", "Max Ernst", "Giorgio de Chirico"], answer: 0 },
    { id: "lit-m8", category: "Art & Literature", difficulty: "medium", q: "Who wrote 'One Hundred Years of Solitude'?", choices: ["Gabriel Garcia Marquez", "Mario Vargas Llosa", "Jorge Luis Borges", "Pablo Neruda"], answer: 0 },
    { id: "lit-m9", category: "Art & Literature", difficulty: "medium", q: "Who sculpted the famous bronze 'The Thinker'?", choices: ["Auguste Rodin", "Constantin Brancusi", "Alberto Giacometti", "Antonio Canova"], answer: 0 },
    { id: "lit-m10", category: "Art & Literature", difficulty: "medium", q: "Who painted 'Girl with a Pearl Earring'?", choices: ["Johannes Vermeer", "Rembrandt van Rijn", "Frans Hals", "Jan van Eyck"], answer: 0 },
    { id: "lit-m11", category: "Art & Literature", difficulty: "medium", q: "Which art movement is Claude Monet most associated with?", choices: ["Impressionism", "Cubism", "Surrealism", "Expressionism"], answer: 0 },
    { id: "lit-m12", category: "Art & Literature", difficulty: "medium", q: "Who wrote the play 'A Doll's House'?", choices: ["Henrik Ibsen", "Anton Chekhov", "August Strindberg", "George Bernard Shaw"], answer: 0 },
    { id: "lit-m13", category: "Art & Literature", difficulty: "medium", q: "Who wrote the dystopian novel 'Brave New World'?", choices: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"], answer: 0 },
    { id: "lit-m14", category: "Art & Literature", difficulty: "medium", q: "Which Mexican artist painted 'The Two Fridas'?", choices: ["Frida Kahlo", "Diego Rivera", "Remedios Varo", "Leonora Carrington"], answer: 0 },
    { id: "lit-m15", category: "Art & Literature", difficulty: "medium", q: "Which Austrian painter created 'The Kiss', shimmering with gold leaf?", choices: ["Gustav Klimt", "Egon Schiele", "Oskar Kokoschka", "Franz Marc"], answer: 0 },
    { id: "lit-m16", category: "Art & Literature", difficulty: "medium", q: "Who wrote the Russian novel 'Anna Karenina'?", choices: ["Leo Tolstoy", "Fyodor Dostoevsky", "Boris Pasternak", "Nikolai Gogol"], answer: 0 },
    { id: "lit-m17", category: "Art & Literature", difficulty: "medium", q: "Who wrote the play 'Death of a Salesman'?", choices: ["Arthur Miller", "Tennessee Williams", "Eugene O'Neill", "Edward Albee"], answer: 0 },
    { id: "lit-m18", category: "Art & Literature", difficulty: "medium", q: "Who wrote the poem 'The Raven'?", choices: ["Edgar Allan Poe", "Walt Whitman", "Emily Dickinson", "Robert Frost"], answer: 0 },
    { id: "lit-h1", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Portuguese epic 'The Lusiads'?", choices: ["Luis de Camoes", "Fernando Pessoa", "Jose Saramago", "Eca de Queiros"], answer: 0 },
    { id: "lit-h2", category: "Art & Literature", difficulty: "hard", q: "Who painted the Spanish court masterpiece 'Las Meninas'?", choices: ["Diego Velazquez", "Francisco Goya", "El Greco", "Bartolome Murillo"], answer: 0 },
    { id: "lit-h3", category: "Art & Literature", difficulty: "hard", q: "Who wrote the 11th-century Japanese classic 'The Tale of Genji'?", choices: ["Murasaki Shikibu", "Sei Shonagon", "Matsuo Basho", "Yukio Mishima"], answer: 0 },
    { id: "lit-h4", category: "Art & Literature", difficulty: "hard", q: "Who painted the triptych 'The Garden of Earthly Delights'?", choices: ["Hieronymus Bosch", "Pieter Bruegel the Elder", "Jan van Eyck", "Albrecht Durer"], answer: 0 },
    { id: "lit-h5", category: "Art & Literature", difficulty: "hard", q: "Who painted the gilded 1908 work 'The Kiss'?", choices: ["Gustav Klimt", "Egon Schiele", "Oskar Kokoschka", "Gustave Moreau"], answer: 0 },
    { id: "lit-h6", category: "Art & Literature", difficulty: "hard", q: "Who wrote the French novel 'Madame Bovary'?", choices: ["Gustave Flaubert", "Emile Zola", "Honore de Balzac", "Stendhal"], answer: 0 },
    { id: "lit-h7", category: "Art & Literature", difficulty: "hard", q: "Who wrote the play 'Waiting for Godot'?", choices: ["Samuel Beckett", "Eugene Ionesco", "Harold Pinter", "Bertolt Brecht"], answer: 0 },
    { id: "lit-h8", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Nigerian novel 'Things Fall Apart'?", choices: ["Chinua Achebe", "Wole Soyinka", "Ngugi wa Thiong'o", "Ben Okri"], answer: 0 },
    { id: "lit-h9", category: "Art & Literature", difficulty: "hard", q: "Who painted 'Impression, Sunrise', the work that gave Impressionism its name?", choices: ["Claude Monet", "Camille Pissarro", "Alfred Sisley", "Pierre-Auguste Renoir"], answer: 0 },
    { id: "lit-h10", category: "Art & Literature", difficulty: "hard", q: "Who painted the American work 'American Gothic'?", choices: ["Grant Wood", "Edward Hopper", "Thomas Hart Benton", "Andrew Wyeth"], answer: 0 },
    { id: "lit-h11", category: "Art & Literature", difficulty: "hard", q: "Which Baroque master painted 'The Calling of Saint Matthew'?", choices: ["Caravaggio", "Artemisia Gentileschi", "Guido Reni", "Annibale Carracci"], answer: 0 },
    { id: "lit-h12", category: "Art & Literature", difficulty: "hard", q: "Who is traditionally credited with composing the Indian epic 'Mahabharata'?", choices: ["Vyasa", "Valmiki", "Kalidasa", "Tulsidas"], answer: 0 },
    { id: "lit-h13", category: "Art & Literature", difficulty: "hard", q: "Who wrote the novel 'The Leopard' ('Il Gattopardo')?", choices: ["Giuseppe Tomasi di Lampedusa", "Italo Calvino", "Umberto Eco", "Cesare Pavese"], answer: 0 },
    { id: "lit-h14", category: "Art & Literature", difficulty: "hard", q: "Which German Renaissance artist created the engraving 'Melencolia I'?", choices: ["Albrecht Durer", "Lucas Cranach", "Hans Holbein", "Matthias Grunewald"], answer: 0 },
    { id: "lit-h15", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Persian epic 'Shahnameh'?", choices: ["Ferdowsi", "Rumi", "Hafez", "Omar Khayyam"], answer: 0 },
    { id: "lit-h16", category: "Art & Literature", difficulty: "hard", q: "Who wrote the unfinished modernist novel 'The Man Without Qualities'?", choices: ["Robert Musil", "Hermann Broch", "Thomas Mann", "Joseph Roth"], answer: 0 },
    { id: "lit-h17", category: "Art & Literature", difficulty: "hard", q: "Which Russian-born painter wrote 'Concerning the Spiritual in Art' and pioneered abstraction?", choices: ["Wassily Kandinsky", "Kazimir Malevich", "Marc Chagall", "Natalia Goncharova"], answer: 0 },
    { id: "lit-h18", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Japanese novel 'Snow Country'?", choices: ["Yasunari Kawabata", "Yukio Mishima", "Junichiro Tanizaki", "Kenzaburo Oe"], answer: 0 },
    { id: "lit-h19", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Roman narrative poem 'Metamorphoses'?", choices: ["Ovid", "Virgil", "Horace", "Lucretius"], answer: 0 },
    { id: "lit-h20", category: "Art & Literature", difficulty: "hard", q: "Which Impressionist is best known for his many paintings of ballet dancers?", choices: ["Edgar Degas", "Pierre-Auguste Renoir", "Camille Pissarro", "Alfred Sisley"], answer: 0 },
    { id: "lit-h21", category: "Art & Literature", difficulty: "hard", q: "Who wrote the Argentine short-story collection 'Ficciones'?", choices: ["Jorge Luis Borges", "Julio Cortazar", "Adolfo Bioy Casares", "Ernesto Sabato"], answer: 0 },
    { id: "lit-h22", category: "Art & Literature", difficulty: "hard", q: "Which Dutch artist painted 'Composition with Red, Blue and Yellow'?", choices: ["Piet Mondrian", "Theo van Doesburg", "Kazimir Malevich", "Wassily Kandinsky"], answer: 0 },
    // ========================== MUSIC ==========================
    { id: "mus-e1", category: "Music", difficulty: "easy", q: "Which keyboard instrument has 88 keys?", choices: ["Piano", "Harp", "Organ", "Accordion"], answer: 0 },
    { id: "mus-e2", category: "Music", difficulty: "easy", q: "Which band recorded the song 'Hey Jude'?", choices: ["The Beatles", "The Rolling Stones", "The Who", "The Kinks"], answer: 0 },
    { id: "mus-e3", category: "Music", difficulty: "easy", q: "How many strings does a standard guitar have?", choices: ["Six", "Four", "Eight", "Twelve"], answer: 0 },
    { id: "mus-e4", category: "Music", difficulty: "easy", q: "Who was the best-known performer of the 1982 album 'Thriller'?", choices: ["Michael Jackson", "Prince", "Lionel Richie", "Stevie Wonder"], answer: 0 },
    { id: "mus-e5", category: "Music", difficulty: "easy", q: "Which stringed instrument is held under the chin and played with a bow?", choices: ["Violin", "Flute", "Trumpet", "Clarinet"], answer: 0 },
    { id: "mus-e6", category: "Music", difficulty: "easy", q: "Which singer is widely known as the King of Rock and Roll?", choices: ["Elvis Presley", "Chuck Berry", "Little Richard", "Buddy Holly"], answer: 0 },
    { id: "mus-e7", category: "Music", difficulty: "easy", q: "Which band recorded the song 'Stairway to Heaven'?", choices: ["Led Zeppelin", "Deep Purple", "Black Sabbath", "Pink Floyd"], answer: 0 },
    { id: "mus-e8", category: "Music", difficulty: "easy", q: "Which brass instrument produces the lowest pitch?", choices: ["Tuba", "Trumpet", "Trombone", "French horn"], answer: 0 },
    { id: "mus-e9", category: "Music", difficulty: "easy", q: "Which pop star is often called the Queen of Pop?", choices: ["Madonna", "Whitney Houston", "Cher", "Janet Jackson"], answer: 0 },
    { id: "mus-e10", category: "Music", difficulty: "easy", q: "A group of four musicians performing together is called a what?", choices: ["Quartet", "Trio", "Duet", "Solo"], answer: 0 },
    { id: "mus-e11", category: "Music", difficulty: "easy", q: "Which singer released the hit album '21'?", choices: ["Adele", "Beyonce", "Taylor Swift", "Rihanna"], answer: 0 },
    { id: "mus-e12", category: "Music", difficulty: "easy", q: "The Beatles formed in which English city?", choices: ["Liverpool", "London", "Manchester", "Birmingham"], answer: 0 },
    { id: "mus-e13", category: "Music", difficulty: "easy", q: "Which composer wrote the 'Ode to Joy' melody in his Ninth Symphony?", choices: ["Beethoven", "Mozart", "Bach", "Chopin"], answer: 0 },
    { id: "mus-e14", category: "Music", difficulty: "easy", q: "Bob Marley is the most famous artist of which genre?", choices: ["Reggae", "Ska", "Blues", "Soul"], answer: 0 },
    { id: "mus-e15", category: "Music", difficulty: "easy", q: "Hip-hop originated in which US city in the 1970s?", choices: ["New York City", "Los Angeles", "Atlanta", "Detroit"], answer: 0 },
    { id: "mus-e16", category: "Music", difficulty: "easy", q: "Which artist recorded the hit 'Single Ladies'?", choices: ["Beyonce", "Rihanna", "Lady Gaga", "Katy Perry"], answer: 0 },
    { id: "mus-e17", category: "Music", difficulty: "easy", q: "A conductor with a baton typically leads which ensemble?", choices: ["Orchestra", "String quartet", "Jazz trio", "Rock band"], answer: 0 },
    { id: "mus-e18", category: "Music", difficulty: "easy", q: "'Smells Like Teen Spirit' was a hit for which grunge band?", choices: ["Nirvana", "Pearl Jam", "Soundgarden", "Green Day"], answer: 0 },
    { id: "mus-m1", category: "Music", difficulty: "medium", q: "Who composed the ballet 'The Nutcracker'?", choices: ["Pyotr Tchaikovsky", "Igor Stravinsky", "Sergei Prokofiev", "Sergei Rachmaninoff"], answer: 0 },
    { id: "mus-m2", category: "Music", difficulty: "medium", q: "Which band recorded the song 'Bohemian Rhapsody'?", choices: ["Queen", "The Eagles", "Fleetwood Mac", "Genesis"], answer: 0 },
    { id: "mus-m3", category: "Music", difficulty: "medium", q: "Which composer kept writing major works after going deaf?", choices: ["Ludwig van Beethoven", "Wolfgang Mozart", "Johann Sebastian Bach", "George Handel"], answer: 0 },
    { id: "mus-m4", category: "Music", difficulty: "medium", q: "Who invented the saxophone?", choices: ["Adolphe Sax", "Theobald Boehm", "Antonio Stradivari", "Bartolomeo Cristofori"], answer: 0 },
    { id: "mus-m5", category: "Music", difficulty: "medium", q: "Which instrument was jazz legend Miles Davis famous for playing?", choices: ["Trumpet", "Saxophone", "Piano", "Double bass"], answer: 0 },
    { id: "mus-m6", category: "Music", difficulty: "medium", q: "Who composed 'Rhapsody in Blue'?", choices: ["George Gershwin", "Aaron Copland", "Leonard Bernstein", "Cole Porter"], answer: 0 },
    { id: "mus-m7", category: "Music", difficulty: "medium", q: "Who was the lead singer of the band Nirvana?", choices: ["Kurt Cobain", "Eddie Vedder", "Chris Cornell", "Layne Staley"], answer: 0 },
    { id: "mus-m8", category: "Music", difficulty: "medium", q: "Who composed the set of violin concertos known as 'The Four Seasons'?", choices: ["Antonio Vivaldi", "Arcangelo Corelli", "George Handel", "Johann Sebastian Bach"], answer: 0 },
    { id: "mus-m9", category: "Music", difficulty: "medium", q: "The jazz standard 'Take Five' was recorded by the quartet led by whom?", choices: ["Dave Brubeck", "Miles Davis", "John Coltrane", "Duke Ellington"], answer: 0 },
    { id: "mus-m10", category: "Music", difficulty: "medium", q: "Who composed the opera 'The Magic Flute'?", choices: ["Wolfgang Mozart", "Giuseppe Verdi", "Richard Wagner", "Giacomo Puccini"], answer: 0 },
    { id: "mus-m11", category: "Music", difficulty: "medium", q: "Which composer wrote the opera 'The Marriage of Figaro'?", choices: ["Mozart", "Verdi", "Wagner", "Puccini"], answer: 0 },
    { id: "mus-m12", category: "Music", difficulty: "medium", q: "How many semitones are there in an octave?", choices: ["Twelve", "Eight", "Seven", "Ten"], answer: 0 },
    { id: "mus-m13", category: "Music", difficulty: "medium", q: "Which trumpeter recorded the 1959 jazz album 'Kind of Blue'?", choices: ["Miles Davis", "Dizzy Gillespie", "Chet Baker", "Louis Armstrong"], answer: 0 },
    { id: "mus-m14", category: "Music", difficulty: "medium", q: "Which singer's signature song is 'My Way'?", choices: ["Frank Sinatra", "Dean Martin", "Tony Bennett", "Nat King Cole"], answer: 0 },
    { id: "mus-m15", category: "Music", difficulty: "medium", q: "Which Italian term means to play very softly?", choices: ["Pianissimo", "Fortissimo", "Allegro", "Staccato"], answer: 0 },
    { id: "mus-m16", category: "Music", difficulty: "medium", q: "Which rapper released 'The Marshall Mathers LP'?", choices: ["Eminem", "Jay-Z", "Dr. Dre", "Snoop Dogg"], answer: 0 },
    { id: "mus-m17", category: "Music", difficulty: "medium", q: "Who composed the 'Brandenburg Concertos'?", choices: ["Johann Sebastian Bach", "George Frideric Handel", "Antonio Vivaldi", "Georg Philipp Telemann"], answer: 0 },
    { id: "mus-m18", category: "Music", difficulty: "medium", q: "Which double-reed woodwind traditionally sounds the note used to tune an orchestra?", choices: ["Oboe", "Clarinet", "Flute", "Bassoon"], answer: 0 },
    { id: "mus-m19", category: "Music", difficulty: "medium", q: "Which US city is widely regarded as the birthplace of jazz?", choices: ["New Orleans", "Chicago", "Memphis", "Kansas City"], answer: 0 },
    { id: "mus-m20", category: "Music", difficulty: "medium", q: "What is the title of Fleetwood Mac's best-selling 1977 album?", choices: ["'Rumours'", "'Tusk'", "'Mirage'", "'Tango in the Night'"], answer: 0 },
    { id: "mus-m21", category: "Music", difficulty: "medium", q: "In 4/4 time, how many beats does a half note receive?", choices: ["Two", "One", "Four", "Three"], answer: 0 },
    { id: "mus-m22", category: "Music", difficulty: "medium", q: "Which Romantic composer is famous for his solo-piano nocturnes?", choices: ["Chopin", "Liszt", "Brahms", "Schumann"], answer: 0 },
    { id: "mus-m23", category: "Music", difficulty: "medium", q: "The pop group ABBA came from which country?", choices: ["Sweden", "Norway", "Netherlands", "Germany"], answer: 0 },
    { id: "mus-m24", category: "Music", difficulty: "medium", q: "The timpani belong to which instrument family?", choices: ["Percussion", "Brass", "String", "Woodwind"], answer: 0 },
    { id: "mus-m25", category: "Music", difficulty: "medium", q: "Which artist released the 1984 album 'Purple Rain'?", choices: ["Prince", "David Bowie", "Michael Jackson", "Stevie Wonder"], answer: 0 },
    { id: "mus-h1", category: "Music", difficulty: "hard", q: "Who composed the 1925 opera 'Wozzeck'?", choices: ["Alban Berg", "Arnold Schoenberg", "Anton Webern", "Richard Strauss"], answer: 0 },
    { id: "mus-h2", category: "Music", difficulty: "hard", q: "Who composed the 'Symphonie fantastique'?", choices: ["Hector Berlioz", "Franz Liszt", "Camille Saint-Saens", "Cesar Franck"], answer: 0 },
    { id: "mus-h3", category: "Music", difficulty: "hard", q: "Who pioneered the twelve-tone technique of composition?", choices: ["Arnold Schoenberg", "Igor Stravinsky", "Bela Bartok", "Paul Hindemith"], answer: 0 },
    { id: "mus-h4", category: "Music", difficulty: "hard", q: "Who composed the 1913 ballet 'The Rite of Spring'?", choices: ["Igor Stravinsky", "Claude Debussy", "Maurice Ravel", "Sergei Prokofiev"], answer: 0 },
    { id: "mus-h5", category: "Music", difficulty: "hard", q: "Which saxophonist recorded the 1965 album 'A Love Supreme'?", choices: ["John Coltrane", "Charlie Parker", "Sonny Rollins", "Ornette Coleman"], answer: 0 },
    { id: "mus-h6", category: "Music", difficulty: "hard", q: "Which composer is credited with developing the prepared piano?", choices: ["John Cage", "Philip Glass", "Steve Reich", "Karlheinz Stockhausen"], answer: 0 },
    { id: "mus-h7", category: "Music", difficulty: "hard", q: "Which bebop alto saxophonist was nicknamed 'Bird'?", choices: ["Charlie Parker", "Dizzy Gillespie", "Thelonious Monk", "Bud Powell"], answer: 0 },
    { id: "mus-h8", category: "Music", difficulty: "hard", q: "Which jazz pianist composed the standard 'Round Midnight'?", choices: ["Thelonious Monk", "Bill Evans", "Art Tatum", "Herbie Hancock"], answer: 0 },
    { id: "mus-h9", category: "Music", difficulty: "hard", q: "Who composed the orchestral work 'Bolero'?", choices: ["Maurice Ravel", "Claude Debussy", "Erik Satie", "Gabriel Faure"], answer: 0 },
    { id: "mus-h10", category: "Music", difficulty: "hard", q: "Which minimalist composer wrote the 1976 opera 'Einstein on the Beach'?", choices: ["Philip Glass", "Steve Reich", "John Adams", "Terry Riley"], answer: 0 },
    { id: "mus-h11", category: "Music", difficulty: "hard", q: "Which Russian composer wrote the opera 'Boris Godunov'?", choices: ["Modest Mussorgsky", "Pyotr Tchaikovsky", "Nikolai Rimsky-Korsakov", "Alexander Borodin"], answer: 0 },
    { id: "mus-h12", category: "Music", difficulty: "hard", q: "A standard 12-bar blues uses which three chords by scale degree?", choices: ["I, IV, V", "I, ii, V", "I, iii, vi", "ii, V, I"], answer: 0 },
    { id: "mus-h13", category: "Music", difficulty: "hard", q: "In sonata form, what is the central section that develops the themes called?", choices: ["Development", "Exposition", "Recapitulation", "Coda"], answer: 0 },
    { id: "mus-h14", category: "Music", difficulty: "hard", q: "Which character sings 'Signore, ascolta' in Puccini's 'Turandot'?", choices: ["Liu", "Turandot", "Mimi", "Tosca"], answer: 0 },
    { id: "mus-h15", category: "Music", difficulty: "hard", q: "Who composed the Duke Ellington orchestra's signature tune 'Take the A Train'?", choices: ["Billy Strayhorn", "Duke Ellington", "Count Basie", "Thelonious Monk"], answer: 0 },
    { id: "mus-h16", category: "Music", difficulty: "hard", q: "What is the interval between the first and fifth notes of a major scale?", choices: ["Perfect fifth", "Major third", "Perfect fourth", "Minor sixth"], answer: 0 },
    { id: "mus-h17", category: "Music", difficulty: "hard", q: "Which composer wrote the tone poem 'Also sprach Zarathustra'?", choices: ["Richard Strauss", "Johann Strauss II", "Gustav Mahler", "Anton Bruckner"], answer: 0 },
    { id: "mus-h18", category: "Music", difficulty: "hard", q: "In which key is Beethoven's Symphony No. 5 primarily written?", choices: ["C minor", "C major", "E-flat major", "A minor"], answer: 0 },
    { id: "mus-h19", category: "Music", difficulty: "hard", q: "Which Italian composer wrote 'Rigoletto', 'La traviata', and 'Aida'?", choices: ["Giuseppe Verdi", "Gioachino Rossini", "Vincenzo Bellini", "Gaetano Donizetti"], answer: 0 },
    { id: "mus-h20", category: "Music", difficulty: "hard", q: "Bluesman Robert Johnson, of crossroads legend, is a foundational figure in which style?", choices: ["Delta blues", "Bluegrass", "Ragtime", "Dixieland"], answer: 0 },
    // ========================== NATURE ==========================
    { id: "nat-e1", category: "Nature", difficulty: "easy", q: "What is the largest land animal alive today?", choices: ["African elephant", "Hippopotamus", "White rhinoceros", "Giraffe"], answer: 0 },
    { id: "nat-e2", category: "Nature", difficulty: "easy", q: "How many legs does an adult insect have?", choices: ["Six", "Four", "Eight", "Ten"], answer: 0 },
    { id: "nat-e3", category: "Nature", difficulty: "easy", q: "What do bees collect from flowers to make honey?", choices: ["Nectar", "Pollen", "Sap", "Water"], answer: 0 },
    { id: "nat-e4", category: "Nature", difficulty: "easy", q: "Which gas do plants take in from the air for photosynthesis?", choices: ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"], answer: 0 },
    { id: "nat-e5", category: "Nature", difficulty: "easy", q: "Which animal is the tallest in the world?", choices: ["Giraffe", "Elephant", "Ostrich", "Horse"], answer: 0 },
    { id: "nat-e6", category: "Nature", difficulty: "easy", q: "What is the largest ocean on Earth?", choices: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], answer: 0 },
    { id: "nat-e7", category: "Nature", difficulty: "easy", q: "A caterpillar transforms into which of these?", choices: ["Butterfly", "Spider", "Beetle", "Dragonfly"], answer: 0 },
    { id: "nat-e8", category: "Nature", difficulty: "easy", q: "What gas do plants release into the air during photosynthesis?", choices: ["Oxygen", "Carbon dioxide", "Methane", "Helium"], answer: 0 },
    { id: "nat-e9", category: "Nature", difficulty: "easy", q: "What do we call an animal that eats only plants?", choices: ["Herbivore", "Carnivore", "Omnivore", "Predator"], answer: 0 },
    { id: "nat-e10", category: "Nature", difficulty: "easy", q: "Which flightless bird lives in Antarctica?", choices: ["Penguin", "Ostrich", "Emu", "Kiwi"], answer: 0 },
    { id: "nat-e11", category: "Nature", difficulty: "easy", q: "Which animal is famous for changing its skin color to blend in?", choices: ["Chameleon", "Zebra", "Elephant", "Kangaroo"], answer: 0 },
    { id: "nat-e12", category: "Nature", difficulty: "easy", q: "What is the main source of energy driving Earth's weather and climate?", choices: ["The Sun", "The Moon", "Volcanoes", "Ocean tides"], answer: 0 },
    { id: "nat-e13", category: "Nature", difficulty: "easy", q: "Which mammal is unusual because it lays eggs?", choices: ["Platypus", "Dolphin", "Bat", "Otter"], answer: 0 },
    { id: "nat-e14", category: "Nature", difficulty: "easy", q: "Which of these animals is a reptile?", choices: ["Crocodile", "Frog", "Salmon", "Penguin"], answer: 0 },
    { id: "nat-e15", category: "Nature", difficulty: "easy", q: "What is it called when liquid water turns into water vapor?", choices: ["Evaporation", "Condensation", "Erosion", "Precipitation"], answer: 0 },
    { id: "nat-e16", category: "Nature", difficulty: "easy", q: "What do we call a young frog that lives in water?", choices: ["Tadpole", "Cub", "Calf", "Fawn"], answer: 0 },
    { id: "nat-e17", category: "Nature", difficulty: "easy", q: "What hard substance forms the outer surface of your teeth?", choices: ["Enamel", "Cartilage", "Keratin", "Marrow"], answer: 0 },
    { id: "nat-e18", category: "Nature", difficulty: "easy", q: "What do we call a group of wolves living together?", choices: ["A pack", "A herd", "A flock", "A school"], answer: 0 },
    { id: "nat-e19", category: "Nature", difficulty: "easy", q: "Which animal is known for hibernating through the winter?", choices: ["Bear", "Lion", "Giraffe", "Camel"], answer: 0 },
    { id: "nat-e20", category: "Nature", difficulty: "easy", q: "What is the transformation of a caterpillar into a butterfly called?", choices: ["Metamorphosis", "Germination", "Pollination", "Hibernation"], answer: 0 },
    { id: "nat-e21", category: "Nature", difficulty: "easy", q: "What word describes animals that are active mainly at night?", choices: ["Nocturnal", "Diurnal", "Aquatic", "Migratory"], answer: 0 },
    { id: "nat-m1", category: "Nature", difficulty: "medium", q: "Which animal is the fastest runner on land over a short sprint?", choices: ["Cheetah", "Pronghorn", "Lion", "Greyhound"], answer: 0 },
    { id: "nat-m2", category: "Nature", difficulty: "medium", q: "What is a group of lions called?", choices: ["Pride", "Pack", "Herd", "Flock"], answer: 0 },
    { id: "nat-m3", category: "Nature", difficulty: "medium", q: "Which is the only mammal capable of true, powered flight?", choices: ["Bat", "Flying squirrel", "Sugar glider", "Colugo"], answer: 0 },
    { id: "nat-m4", category: "Nature", difficulty: "medium", q: "Which gas makes up the largest share of Earth's atmosphere?", choices: ["Nitrogen", "Oxygen", "Carbon dioxide", "Argon"], answer: 0 },
    { id: "nat-m5", category: "Nature", difficulty: "medium", q: "What is the largest desert on Earth by area?", choices: ["Antarctic Desert", "Sahara Desert", "Arabian Desert", "Gobi Desert"], answer: 0 },
    { id: "nat-m6", category: "Nature", difficulty: "medium", q: "Which is the largest fish species living today?", choices: ["Whale shark", "Great white shark", "Basking shark", "Tiger shark"], answer: 0 },
    { id: "nat-m7", category: "Nature", difficulty: "medium", q: "What is the largest organ of the human body?", choices: ["Skin", "Liver", "Lungs", "Brain"], answer: 0 },
    { id: "nat-m8", category: "Nature", difficulty: "medium", q: "What is the hardest known naturally occurring material?", choices: ["Diamond", "Quartz", "Topaz", "Corundum"], answer: 0 },
    { id: "nat-m9", category: "Nature", difficulty: "medium", q: "What is a group of crows called?", choices: ["Murder", "Gaggle", "Pod", "Colony"], answer: 0 },
    { id: "nat-m10", category: "Nature", difficulty: "medium", q: "Which bird reaches the highest speed while diving?", choices: ["Peregrine falcon", "Golden eagle", "Common swift", "Frigatebird"], answer: 0 },
    { id: "nat-m11", category: "Nature", difficulty: "medium", q: "Which type of rock forms when magma or lava cools and hardens?", choices: ["Igneous", "Sedimentary", "Metamorphic", "Mineral"], answer: 0 },
    { id: "nat-m12", category: "Nature", difficulty: "medium", q: "What is the process by which plants release water vapor through their leaves?", choices: ["Transpiration", "Respiration", "Condensation", "Fermentation"], answer: 0 },
    { id: "nat-m13", category: "Nature", difficulty: "medium", q: "To which group of animals do spiders belong?", choices: ["Arachnids", "Insects", "Crustaceans", "Myriapods"], answer: 0 },
    { id: "nat-m14", category: "Nature", difficulty: "medium", q: "What is the largest artery in the human body?", choices: ["Aorta", "Vena cava", "Carotid artery", "Pulmonary vein"], answer: 0 },
    { id: "nat-m15", category: "Nature", difficulty: "medium", q: "What term describes all the members of one species living in a given area?", choices: ["Population", "Community", "Ecosystem", "Biome"], answer: 0 },
    { id: "nat-m16", category: "Nature", difficulty: "medium", q: "Which layer of the Earth is the hottest?", choices: ["Inner core", "Crust", "Mantle", "Outer core"], answer: 0 },
    { id: "nat-m17", category: "Nature", difficulty: "medium", q: "Which human organ produces the hormone insulin?", choices: ["Pancreas", "Liver", "Kidney", "Spleen"], answer: 0 },
    { id: "nat-m18", category: "Nature", difficulty: "medium", q: "What is the pigment that makes plant leaves appear green?", choices: ["Chlorophyll", "Carotene", "Melanin", "Hemoglobin"], answer: 0 },
    { id: "nat-m19", category: "Nature", difficulty: "medium", q: "What is the deep ocean zone that sunlight never reaches called?", choices: ["Aphotic zone", "Photic zone", "Intertidal zone", "Neritic zone"], answer: 0 },
    { id: "nat-h1", category: "Nature", difficulty: "hard", q: "Starfish belong to which class of echinoderms?", choices: ["Asteroidea", "Crinoidea", "Holothuroidea", "Echinoidea"], answer: 0 },
    { id: "nat-h2", category: "Nature", difficulty: "hard", q: "Tardigrades (water bears) make up their own animal phylum called what?", choices: ["Tardigrada", "Arthropoda", "Nematoda", "Onychophora"], answer: 0 },
    { id: "nat-h3", category: "Nature", difficulty: "hard", q: "Which carbon-fixation pathway lets desert plants open their stomata at night?", choices: ["CAM", "C3", "C4", "Photorespiration"], answer: 0 },
    { id: "nat-h4", category: "Nature", difficulty: "hard", q: "Which animal phylum contains the most described species?", choices: ["Arthropoda", "Mollusca", "Chordata", "Nematoda"], answer: 0 },
    { id: "nat-h5", category: "Nature", difficulty: "hard", q: "Which pigments are newly made to produce the red colors of autumn leaves?", choices: ["Anthocyanins", "Carotenoids", "Chlorophylls", "Xanthophylls"], answer: 0 },
    { id: "nat-h6", category: "Nature", difficulty: "hard", q: "Which process do rhizobia bacteria carry out in legume root nodules?", choices: ["Nitrogen fixation", "Photosynthesis", "Denitrification", "Decomposition"], answer: 0 },
    { id: "nat-h7", category: "Nature", difficulty: "hard", q: "What is the scientific study of fungi called?", choices: ["Mycology", "Botany", "Ornithology", "Herpetology"], answer: 0 },
    { id: "nat-h8", category: "Nature", difficulty: "hard", q: "The Wallace Line separates the wildlife of which two regions?", choices: ["Asia and Australia", "Africa and Asia", "Europe and Africa", "North and South America"], answer: 0 },
    { id: "nat-h9", category: "Nature", difficulty: "hard", q: "Which geological era is known as the 'Age of Reptiles'?", choices: ["Mesozoic", "Paleozoic", "Cenozoic", "Precambrian"], answer: 0 },
    { id: "nat-h10", category: "Nature", difficulty: "hard", q: "Whales evolved from which group of land mammals?", choices: ["Even-toed ungulates", "Carnivores", "Rodents", "Primates"], answer: 0 },
    { id: "nat-h11", category: "Nature", difficulty: "hard", q: "What is the process by which bacteria transfer DNA directly through cell-to-cell contact?", choices: ["Conjugation", "Transduction", "Transformation", "Translation"], answer: 0 },
    { id: "nat-h12", category: "Nature", difficulty: "hard", q: "Which plant hormone is chiefly responsible for shoots bending toward light?", choices: ["Auxin", "Cytokinin", "Ethylene", "Abscisic acid"], answer: 0 },
    { id: "nat-h13", category: "Nature", difficulty: "hard", q: "In which part of the chloroplast do the light-independent reactions occur?", choices: ["Stroma", "Thylakoid", "Grana", "Cristae"], answer: 0 },
    { id: "nat-h14", category: "Nature", difficulty: "hard", q: "Which is the largest type of white blood cell in human blood?", choices: ["Monocyte", "Neutrophil", "Lymphocyte", "Basophil"], answer: 0 },
    { id: "nat-h15", category: "Nature", difficulty: "hard", q: "Which geological eon covers Earth's earliest history, before about 4 billion years ago?", choices: ["Hadean", "Archean", "Proterozoic", "Phanerozoic"], answer: 0 },
    { id: "nat-h16", category: "Nature", difficulty: "hard", q: "Which enzyme fixes carbon dioxide during the Calvin cycle of photosynthesis?", choices: ["RuBisCO", "ATP synthase", "Nitrogenase", "Amylase"], answer: 0 },
    { id: "nat-h17", category: "Nature", difficulty: "hard", q: "Which flower structure contains the female reproductive organs?", choices: ["Carpel", "Stamen", "Sepal", "Petal"], answer: 0 },
    { id: "nat-h18", category: "Nature", difficulty: "hard", q: "What is the name of the deepest ocean zone, found in the great trenches?", choices: ["Hadal zone", "Abyssal zone", "Bathyal zone", "Pelagic zone"], answer: 0 },
    { id: "nat-h19", category: "Nature", difficulty: "hard", q: "Which soil bacteria oxidize ammonia into nitrite in the nitrogen cycle?", choices: ["Nitrosomonas", "Nitrobacter", "Rhizobium", "Azotobacter"], answer: 0 },
    { id: "nat-h20", category: "Nature", difficulty: "hard", q: "What term describes a species with an outsized influence on its whole ecosystem?", choices: ["Keystone species", "Indicator species", "Invasive species", "Endemic species"], answer: 0 },
    { id: "nat-h21", category: "Nature", difficulty: "hard", q: "Which inner-ear structures detect rotational movement to help with balance?", choices: ["Semicircular canals", "Cochlea", "Eardrum", "Eustachian tube"], answer: 0 },
    { id: "nat-h22", category: "Nature", difficulty: "hard", q: "What is a segment of DNA that can move to new positions within the genome called?", choices: ["Transposon", "Intron", "Codon", "Plasmid"], answer: 0 },
    { id: "nat-h23", category: "Nature", difficulty: "hard", q: "What is the phenomenon in which one gene influences several unrelated traits?", choices: ["Pleiotropy", "Epistasis", "Codominance", "Polygenic inheritance"], answer: 0 },
    { id: "nat-h24", category: "Nature", difficulty: "hard", q: "What is the boundary between Earth's crust and mantle called?", choices: ["Mohorovicic discontinuity", "Gutenberg discontinuity", "Lehmann discontinuity", "Conrad discontinuity"], answer: 0 },
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
    var shuffleArr = function (a) {
        var _a;
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            _a = [a[j], a[i]], a[i] = _a[0], a[j] = _a[1];
        }
        return a;
    };
    // Order UNSEEN questions first, then already-seen ones — so a player sees every
    // question in the pool exactly once before any repeats (100% no-repeat until the
    // whole pool is exhausted, then it cycles).
    var ordered;
    if (excludeIds && excludeIds.length) {
        var seen_1 = new Set(excludeIds);
        var unseen = shuffleArr(pool.filter(function (q) { return !seen_1.has(q.id); }));
        var seenPool = shuffleArr(pool.filter(function (q) { return seen_1.has(q.id); }));
        ordered = __spreadArray(__spreadArray([], unseen, true), seenPool, true);
    }
    else {
        ordered = shuffleArr(__spreadArray([], pool, true));
    }
    // Shuffle each question's choices too, so the correct answer isn't always in
    // the same slot (the bank authors the answer first for readability).
    var questions = ordered.slice(0, exports.TRIVIA_COUNT).map(function (qn) {
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
