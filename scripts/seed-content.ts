export type MCQSeed = {
  q: string;
  options: string[];
  correct: number;
  why: string;
  pyq?: string; // tag like "CBSE 2023" — undefined = practice question
};

export type SubjSeed = {
  q: string;
  marks: 2 | 3 | 5;
  rubric: { step: string; marks: number }[];
  answer: string;
};

export type VideoSeed = {
  title: string;
  url: string;
  duration: number;
  sizeMb: number;
  markers: { t: number; label: string }[];
  slides?: string;
  slidesTitle?: string;
};

export type NoteSeed = {
  title: string;
  content: string;
  author: string; // handle
  verified?: boolean;
  votesFrom: string[]; // handles that upvote this note
};

const V = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";

/* ------------------------------------------------------------------ */
/*  CLASS 8 · SCIENCE · CH 6 — COMBUSTION AND FLAME                   */
/* ------------------------------------------------------------------ */
export const combustionMcqs: MCQSeed[] = [
  { q: "The process in which a substance reacts with oxygen to give off heat and light is called —", options: ["Decomposition", "Combustion", "Respiration", "Oxidation only"], correct: 1, why: "Combustion is a fast chemical reaction of a substance with oxygen that releases energy as heat and light.", pyq: "CBSE 2023" },
  { q: "The lowest temperature at which a combustible substance catches fire is called its —", options: ["Melting point", "Boiling point", "Ignition temperature", "Kindling temperature"], correct: 2, why: "The minimum temperature at which a substance ignites spontaneously is its ignition temperature.", pyq: "NCERT Exemplar" },
  { q: "The fastest process of combustion is —", options: ["Slow combustion", "Rapid combustion", "Spontaneous combustion", "Smouldering"], correct: 2, why: "Spontaneous combustion occurs without external heating, so it is the fastest type.", pyq: "CBSE 2021" },
  { q: "Combustion that takes place in the absence of air or oxygen is called —", options: ["Smouldering", "Spontaneous combustion", "Rapid combustion", "Slow combustion"], correct: 0, why: "When oxygen supply is restricted, combustion proceeds as smouldering, as in a dying fire or a glowing coal.", pyq: "State Board 2022" },
  { q: "The hottest zone of a candle flame is the —", options: ["Innermost zone", "Second zone", "Outermost zone", "Third zone"], correct: 2, why: "The outermost zone has the most air, so combustion is complete and the temperature is highest.", pyq: "CBSE 2022" },
  { q: "Soot (carbon particles) is formed in which zone of a candle flame?", options: ["Outermost zone", "Innermost non-luminous zone", "Luminous zone", "Blue zone"], correct: 2, why: "Unburnt wax vapours glow yellow in the luminous zone and form soot on obstruction.", pyq: "NCERT Exemplar" },
  { q: "Substances which can catch fire easily are called —", options: ["Non-combustible substances", "Combustible substances", "Inert substances", "Metals"], correct: 1, why: "Paper, wood, wax and petrol catch fire, so they are combustible substances.", pyq: "CBSE 2023" },
  { q: "Which of the following is a non-combustible substance?", options: ["Dry matchstick", "Cotton cloth", "Iron nail", "Paper scrap"], correct: 2, why: "Iron nails, bricks and stone do not catch fire under ordinary conditions.", pyq: "State Board 2021" },
  { q: "A matchstick catches fire when struck because the rubbing produces —", options: ["Light", "Enough heat to reach the ignition temperature", "Oxygen", "Friction with the wick only"], correct: 1, why: "The heat of rubbing raises the head (red phosphorus) to its ignition temperature.", pyq: "NCERT Exemplar" },
  { q: "On burning, non-metals generally form —", options: ["Basic oxides", "Acidic oxides", "Neutral oxides", "No oxides"], correct: 1, why: "Oxygen compounds of non-metals, such as CO₂ and SO₂, behave as acidic oxides.", pyq: "CBSE 2020" },
  { q: "On burning, metals form —", options: ["Acidic oxides", "Basic oxides", "Acids", "Salts only"], correct: 1, why: "Metal oxides such as sodium oxide are basic in nature.", pyq: "CBSE 2020" },
  { q: "The outermost zone of a flame appears blue because —", options: ["It is coolest", "Combustion is complete and temperature is high", "Unburnt wax vapours glow", "Water vapour is present"], correct: 1, why: "Complete combustion of hot gases makes the outer zone blue and the hottest.", pyq: "NCERT Exemplar" },
  { q: "The unit used to express the calorific value of a fuel is —", options: ["kg", "kJ", "kJ/kg", "kJ·kg"], correct: 2, why: "Calorific value = heat produced per kilogram of fuel, so the unit is kJ/kg.", pyq: "CBSE 2023" },
  { q: "The calorific value of a fuel is the amount of heat produced when —", options: ["1 g of fuel burns", "1 kg of fuel burns completely", "1 kg of fuel is heated", "Any amount of fuel burns"], correct: 1, why: "It is the heat released on complete combustion of 1 kg of fuel.", pyq: "State Board 2022" },
  { q: "Which of the following fuels has the highest calorific value?", options: ["Coal", "Petrol", "Wood", "Hydrogen"], correct: 3, why: "Hydrogen has the highest calorific value at about 150 kJ/kg.", pyq: "CBSE 2022" },
  { q: "Among the following, the fuel with the lowest calorific value is —", options: ["LPG", "Kerosene", "Wood", "Natural gas"], correct: 2, why: "Wood has the lowest calorific value, about 15–25 kJ/kg.", pyq: "NCERT Exemplar" },
  { q: "Petrol, kerosene and diesel are obtained from —", options: ["Crude oil", "Coal", "Natural gas", "Plants"], correct: 0, why: "These are refined from crude oil; coal and natural gas are separate fossil fuels.", pyq: "State Board 2023" },
  { q: "Hydrogen is considered the cleanest fuel because —", options: ["It is cheapest", "Its combustion leaves only water", "It burns with a yellow flame", "It is available everywhere"], correct: 1, why: "2H₂ + O₂ → 2H₂O, so the only product is water and no pollutant is released.", pyq: "CBSE 2021" },
  { q: "Which gas is released by a common fire extinguisher to cut off the air supply?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correct: 2, why: "CO₂ blankets the fire, separating it from oxygen and stopping combustion.", pyq: "NCERT Exemplar" },
  { q: "A large lump of wood catches fire later than a small chip because —", options: ["Its ignition temperature is higher", "Heat takes longer to raise the whole lump to its ignition temperature", "It contains more oxygen", "It is non-combustible"], correct: 1, why: "The same ignition temperature applies, but spreading heat through a big lump takes time.", pyq: "Practice" },
];

export const combustionSubj: SubjSeed[] = [
  { q: "Define the ignition temperature of a substance.", marks: 2, rubric: [{ step: "Correct definition (minimum temperature at which it catches fire)", marks: 1 }, { step: "Example (e.g., paper or kerosene)", marks: 1 }], answer: "The ignition temperature is the minimum temperature at which a combustible substance catches fire. For example, the ignition temperature of paper is lower than that of wood." },
  { q: "Give two examples each of combustible and non-combustible substances.", marks: 2, rubric: [{ step: "Two correct combustible examples", marks: 1 }, { step: "Two correct non-combustible examples", marks: 1 }], answer: "Combustible: paper, petrol, wood, cotton. Non-combustible: brick, iron nail, stone, glass." },
  { q: "Why do non-metals form acidic oxides on burning?", marks: 2, rubric: [{ step: "Non-metals combine with oxygen to form oxides", marks: 1 }, { step: "These oxides dissolve in water to give acids (e.g., CO₂ → carbonic acid)", marks: 1 }], answer: "On burning, non-metals combine with oxygen to form oxides such as CO₂ and SO₂. These dissolve in water to form carbonic and sulphurous acids, so they are acidic oxides." },
  { q: "What is smouldering? Give one example.", marks: 2, rubric: [{ step: "Definition (combustion without flame, in restricted oxygen)", marks: 1 }, { step: "Valid example (glowing coal / dying fire)", marks: 1 }], answer: "Smouldering is combustion that takes place in the absence (or restriction) of oxygen, producing no visible flame. A glowing coal or a slowly dying fire is an example." },
  { q: "State any two precautions to prevent fire caused by electrical faults.", marks: 2, rubric: [{ step: "Use of insulated / fault-free wiring", marks: 1 }, { step: "Switch off power / fuse or MCB / avoid overloading", marks: 1 }], answer: "Precautions: use properly insulated and regularly checked wiring; fit fuses or MCBs and avoid overloading circuits. Never touch switches with wet hands." },
  { q: "Draw the three zones of a candle flame and label them.", marks: 3, rubric: [{ step: "Correct labelled diagram of the three zones", marks: 2 }, { step: "Correct names: non-luminous, luminous, outermost", marks: 1 }], answer: "A candle flame has (1) the innermost non-luminous zone, (2) the luminous (yellow) zone, and (3) the outermost blue zone. The diagram should show the teardrop flame with all three zones labelled." },
  { q: "Explain why hydrogen is considered the cleanest fuel.", marks: 3, rubric: [{ step: "Combustion equation / water is the only product", marks: 2 }, { step: "No smoke or toxic gas is released", marks: 1 }], answer: "Hydrogen burns with oxygen to form only water (2H₂ + O₂ → 2H₂O). It produces no smoke, CO₂ or toxic gases, so it is the cleanest fuel despite its high calorific value (150 kJ/kg)." },
  { q: "What is spontaneous combustion? Give one example.", marks: 3, rubric: [{ step: "Definition (combustion without external heating)", marks: 2 }, { step: "Example (white phosphorus / dry hay or coal heaps)", marks: 1 }], answer: "Spontaneous combustion is the process in which a substance catches fire on its own, without being heated, because its ignition temperature is low. White phosphorus is the classic example." },
  { q: "Define the calorific value of a fuel and state its unit.", marks: 3, rubric: [{ step: "Definition (heat produced on complete combustion of 1 kg)", marks: 2 }, { step: "Unit: kJ/kg", marks: 1 }], answer: "The calorific value of a fuel is the amount of heat energy produced when 1 kg of the fuel burns completely. Its unit is kilojoules per kilogram (kJ/kg)." },
  { q: "Why is the outermost zone of a flame the hottest zone?", marks: 3, rubric: [{ step: "Complete combustion of fuel vapours", marks: 2 }, { step: "Sufficient supply of air in this zone", marks: 1 }], answer: "In the outermost zone, the unburnt wax vapours meet a full supply of air, so combustion is complete. Complete combustion releases the maximum heat, making this zone the hottest and giving it the blue colour." },
  { q: "With the help of a labelled diagram, describe the three zones of a candle flame. Explain the colour of each zone.", marks: 5, rubric: [{ step: "Correct labelled diagram", marks: 2 }, { step: "Names of the three zones", marks: 1 }, { step: "Reason for colour of each zone (dark / yellow / blue)", marks: 2 }], answer: "The innermost zone is dark (unburnt vapours), the middle luminous zone is yellow (partly burnt, glowing carbon particles), and the outermost zone is blue (complete combustion, highest temperature). A labelled teardrop diagram with all three zones must be drawn." },
  { q: "Explain the process of combustion with an example. List the conditions required for combustion to take place.", marks: 5, rubric: [{ step: "Definition of combustion", marks: 1 }, { step: "Valid example (candle, matchstick)", marks: 1 }, { step: "Conditions: combustible substance, oxygen/air, ignition temperature (any 3, each 1M)", marks: 3 }], answer: "Combustion is the process in which a substance reacts with oxygen to give off heat and light, e.g., a burning candle. Conditions: (1) a combustible substance, (2) presence of oxygen/air, and (3) temperature reaching the ignition temperature — commonly shown as the fire triangle." },
  { q: "Why is petrol stored in closed containers? Discuss the role of oxygen and ignition temperature in your answer.", marks: 5, rubric: [{ step: "Petrol is highly volatile and flammable", marks: 1 }, { step: "Vapours can mix with air and ignite", marks: 1 }, { step: "Low ignition temperature / spark risk", marks: 1 }, { step: "Closed container cuts air supply and holds vapours", marks: 1 }, { step: "Correct reasoning overall", marks: 1 }], answer: "Petrol is highly flammable with a low ignition temperature and gives off vapours readily. If stored openly, the vapours mix with air and a tiny spark can ignite them. A closed container restricts the air supply and confines the vapours, keeping the petrol safe." },
  { q: "A fire breaks out in a kitchen due to overheated oil in a pan. List the steps you would take to put it out and explain why water should not be used.", marks: 5, rubric: [{ step: "Switch off the stove / gas", marks: 1 }, { step: "Cover the pan with a lid / wet cloth to cut air", marks: 1 }, { step: "Use a CO₂ fire extinguisher if available", marks: 1 }, { step: "Water makes oil splash and spread the fire", marks: 1 }, { step: "Correct reasoning overall", marks: 1 }], answer: "First switch off the stove, then cover the pan with a lid or a damp cloth to cut off the air. A CO₂ extinguisher may be used. Water must never be poured: it sinks, boils instantly, splashes the burning oil and spreads the fire." },
  { q: "Compare wood and LPG as fuels in terms of calorific value, pollution and availability. Which would you prefer and why?", marks: 5, rubric: [{ step: "Calorific value comparison (LPG ~50 kJ/kg > wood 15–25 kJ/kg)", marks: 1 }, { step: "Pollution comparison (LPG burns cleaner, wood gives smoke)", marks: 1 }, { step: "Availability / convenience comparison", marks: 1 }, { step: "Clear preference stated", marks: 1 }, { step: "Justified reason linked to above points", marks: 1 }], answer: "Wood has a low calorific value (15–25 kJ/kg), burns with smoke, and needs space and effort. LPG has a high calorific value (~50 kJ/kg), burns cleanly and is convenient. LPG is preferred because it is efficient, less polluting and easier to store and handle." },
];

/* ------------------------------------------------------------------ */
/*  CLASS 8 · MATHEMATICS · CH 1 — RATIONAL NUMBERS                   */
/* ------------------------------------------------------------------ */
export const rationalMcqs: MCQSeed[] = [
  { q: "A rational number is a number which can be expressed in the form —", options: ["p + q", "p/q, where q ≠ 0", "p² + q²", "q/p, where p ≠ 0"], correct: 1, why: "A rational number is p/q where p and q are integers and q ≠ 0.", pyq: "CBSE 2023" },
  { q: "The number 5/0 is —", options: ["A rational number", "An integer", "Not defined", "Zero"], correct: 2, why: "Division by zero is not defined, so 5/0 cannot be a rational number.", pyq: "NCERT Exemplar" },
  { q: "The additive inverse of 7/9 is —", options: ["7/9", "9/7", "−7/9", "−9/7"], correct: 2, why: "7/9 + (−7/9) = 0, so the additive inverse is −7/9.", pyq: "CBSE 2021" },
  { q: "Between any two rational numbers, there are —", options: ["No rational numbers", "One rational number", "Finite rational numbers", "Infinitely many rational numbers"], correct: 3, why: "We can always find a rational number between two rationals (e.g., their mean), so there are infinitely many.", pyq: "CBSE 2022" },
  { q: "The standard form of 8/(−12) is —", options: ["8/12", "−2/3", "2/3", "−8/12"], correct: 1, why: "Both signs in denominator/numerator are moved: 8/(−12) = −8/12 = −2/3.", pyq: "NCERT Exemplar" },
  { q: "The standard form of (−15)/(−25) is —", options: ["15/25", "−15/25", "3/5", "−3/5"], correct: 2, why: "Two negatives make a positive: (−15)/(−25) = 15/25 = 3/5.", pyq: "State Board 2022" },
  { q: "2/5 + 3/7 = ?", options: ["5/12", "29/35", "1/2", "29/12"], correct: 1, why: "LCM 35: 14/35 + 15/35 = 29/35.", pyq: "CBSE 2020" },
  { q: "(−3/4) − (−1/2) = ?", options: ["−1/4", "1/4", "−5/4", "5/4"], correct: 0, why: "(−3/4) + 2/4 = −1/4.", pyq: "State Board 2021" },
  { q: "5/7 × 21/10 = ?", options: ["105/70", "3/2", "2/3", "1"], correct: 1, why: "(5 × 21)/(7 × 10) = 105/70 = 3/2 after cancellation.", pyq: "CBSE 2023" },
  { q: "The reciprocal of −7 is —", options: ["7", "1/7", "−1/7", "−7"], correct: 2, why: "Reciprocal of a non-zero integer a is 1/a, so it is −1/7.", pyq: "NCERT Exemplar" },
  { q: "The reciprocal of 0 —", options: ["Is 0", "Is 1", "Does not exist", "Is undefined as 0/1"], correct: 2, why: "There is no number which on multiplication by 0 gives 1, so the reciprocal of 0 does not exist.", pyq: "CBSE 2021" },
  { q: "The multiplicative identity of rational numbers is —", options: ["0", "1", "−1", "It does not exist"], correct: 1, why: "p/q × 1 = 1 × p/q = p/q for every rational number.", pyq: "NCERT Exemplar" },
  { q: "The property a + b = b + a for all rational numbers a, b is called —", options: ["Associative", "Distributive", "Commutative", "Closure"], correct: 2, why: "The order can be changed in addition — commutative property.", pyq: "CBSE 2022" },
  { q: "Which of the following is NOT a property of rational numbers?", options: ["Commutativity of addition", "Commutativity of multiplication", "Commutativity of subtraction", "Closure under addition"], correct: 2, why: "a − b ≠ b − a in general, so subtraction is not commutative.", pyq: "State Board 2022" },
  { q: "Which of the following rational numbers lies between 1/4 and 1/2?", options: ["1/2", "1/3", "3/8", "2/3"], correct: 2, why: "1/4 = 2/8 and 1/2 = 4/8; 3/8 lies between them.", pyq: "NCERT Exemplar" },
  { q: "The smallest positive rational number —", options: ["Is 1", "Is 1/1000", "Is 0", "Does not exist"], correct: 3, why: "For any positive rational number, a smaller positive one (its half) exists, so no smallest exists.", pyq: "CBSE 2020" },
  { q: "(−5/6) ÷ (25/36) = ?", options: ["−6/5", "6/5", "−5/6", "−25/36"], correct: 0, why: "(−5/6) × (36/25) = −180/150 = −6/5.", pyq: "State Board 2023" },
  { q: "The sum of a rational number and its additive inverse is —", options: ["1", "−1", "0", "The number itself"], correct: 2, why: "By definition, a number plus its additive inverse always equals 0.", pyq: "CBSE 2023" },
  { q: "The number 0 belongs to which of the following sets?", options: ["Natural numbers only", "Whole numbers only", "Integers only", "Natural, whole, integer and rational numbers"], correct: 3, why: "0 is a whole number, an integer and a rational number (0/1), but not a natural number.", pyq: "Practice" },
  { q: "Which of the following is a rational number between 0 and 1?", options: ["5/4", "4/5", "3/2", "7/3"], correct: 1, why: "4/5 = 0.8, which lies between 0 and 1; the others are greater than 1.", pyq: "Practice" },
];

export const rationalSubj: SubjSeed[] = [
  { q: "Write the definition of a rational number and give two examples.", marks: 2, rubric: [{ step: "Correct definition p/q, q ≠ 0, p, q integers", marks: 1 }, { step: "Two correct examples (e.g., 5/7, −3/4)", marks: 1 }], answer: "A rational number is a number that can be written as p/q, where p and q are integers and q ≠ 0. Examples: 5/7 and −3/4." },
  { q: "Write three rational numbers between 0 and 1.", marks: 2, rubric: [{ step: "Three distinct rational numbers", marks: 1 }, { step: "All lie strictly between 0 and 1", marks: 1 }], answer: "Any three such numbers, e.g., 1/3, 1/2 and 2/3 (or 1/4, 1/2, 3/4)." },
  { q: "Add: (−3/4) + 5/4.", marks: 2, rubric: [{ step: "Correct method (common denominator)", marks: 1 }, { step: "Correct answer 2/4 = 1/2", marks: 1 }], answer: "(−3 + 5)/4 = 2/4 = 1/2." },
  { q: "State the multiplicative identity of rational numbers.", marks: 2, rubric: [{ step: "Identity is 1", marks: 1 }, { step: "Example: (−2/3) × 1 = −2/3", marks: 1 }], answer: "The multiplicative identity is 1, because p/q × 1 = 1 × p/q = p/q for every rational number." },
  { q: "Why is 5/0 not defined as a rational number?", marks: 2, rubric: [{ step: "q ≠ 0 is a condition in the definition", marks: 1 }, { step: "Division by zero is not possible (no number × 0 = 5)", marks: 1 }], answer: "A rational number is p/q with q ≠ 0. Since 5/0 has q = 0 and no number multiplied by 0 gives 5, 5/0 is not defined." },
  { q: "Simplify, showing your steps: 2/3 + 5/6.", marks: 3, rubric: [{ step: "Find LCM of denominators (6)", marks: 1 }, { step: "Write equivalent fractions (4/6 + 5/6)", marks: 1 }, { step: "Correct answer 9/6 = 3/2", marks: 1 }], answer: "LCM of 3 and 6 is 6. 2/3 = 4/6, so 4/6 + 5/6 = 9/6 = 3/2." },
  { q: "Represent −7/4 and 11/4 on the same number line.", marks: 3, rubric: [{ step: "Correctly divided number line", marks: 1 }, { step: "−7/4 placed at −1¾", marks: 1 }, { step: "11/4 placed at 2¾", marks: 1 }], answer: "Mark integers −3 to 4. −7/4 = −1¾ lies between −2 and −1; 11/4 = 2¾ lies between 2 and 3. Label both points clearly." },
  { q: "State any three properties of rational numbers with an example each.", marks: 3, rubric: [{ step: "Property 1 + example", marks: 1 }, { step: "Property 2 + example", marks: 1 }, { step: "Property 3 + example", marks: 1 }], answer: "(1) Closure: 1/2 + 3/4 = 5/4 is rational. (2) Commutativity: 2/5 + 1/3 = 1/3 + 2/5. (3) Associativity: (1/2 + 1/3) + 1/6 = 1/2 + (1/3 + 1/6) = 1." },
  { q: "Express 7/(−21) in standard form.", marks: 3, rubric: [{ step: "Move negative sign to numerator (−7/21)", marks: 1 }, { step: "Divide numerator and denominator by 7", marks: 1 }, { step: "Correct answer −1/3", marks: 1 }], answer: "7/(−21) = −7/21 = −1/3, which is in standard form (positive denominator, co-prime terms)." },
  { q: "Which is greater: −5/7 or −2/3? Justify your answer.", marks: 3, rubric: [{ step: "Convert to common denominator (21)", marks: 1 }, { step: "Compare numerators (−15 vs −14)", marks: 1 }, { step: "Correct answer −2/3 with reason", marks: 1 }], answer: "−5/7 = −15/21 and −2/3 = −14/21. Since −14 > −15, −2/3 is greater than −5/7." },
  { q: "Subtract, showing each step: 3/4 − (−5/6).", marks: 5, rubric: [{ step: "Change sign: 3/4 + 5/6", marks: 1 }, { step: "LCM of 4 and 6 = 12", marks: 1 }, { step: "Equivalent fractions 9/12 + 10/12", marks: 1 }, { step: "Sum 19/12", marks: 1 }, { step: "Express as mixed number 1 7/12", marks: 1 }], answer: "3/4 − (−5/6) = 3/4 + 5/6. LCM = 12, so 9/12 + 10/12 = 19/12 = 1 7/12." },
  { q: "Explain the closure property of rational numbers under addition with two examples.", marks: 5, rubric: [{ step: "Correct statement of the property", marks: 2 }, { step: "Example 1 correctly verified", marks: 1 }, { step: "Example 2 correctly verified", marks: 1 }, { step: "Concluding sentence", marks: 1 }], answer: "Closure under addition: the sum of any two rational numbers is again a rational number. e.g., 1/2 + 3/4 = 5/4 (rational) and (−2/3) + 1/6 = −1/2 (rational). Hence Q is closed under addition." },
  { q: "Find the rational number x such that 2/5 + x = −1/3.", marks: 5, rubric: [{ step: "Rearrange: x = −1/3 − 2/5", marks: 1 }, { step: "LCM of 3 and 5 = 15", marks: 1 }, { step: "Convert fractions (−5/15 − 6/15)", marks: 1 }, { step: "Sum = −11/15", marks: 1 }, { step: "Verify: 2/5 + (−11/15) = −1/3", marks: 1 }], answer: "x = −1/3 − 2/5 = (−5 − 6)/15 = −11/15. Check: 2/5 + (−11/15) = 6/15 − 11/15 = −5/15 = −1/3. ✓" },
  { q: "Explain the commutative and associative properties of addition of rational numbers with examples.", marks: 5, rubric: [{ step: "Commutative stated + example", marks: 2 }, { step: "Associative stated + example", marks: 2 }, { step: "Correct arithmetic in examples", marks: 1 }], answer: "Commutative: a + b = b + a; e.g., 1/4 + 2/3 = 11/12 = 2/3 + 1/4. Associative: (a + b) + c = a + (b + c); e.g., (1/2 + 1/3) + 1/6 = 1 and 1/2 + (1/3 + 1/6) = 1." },
  { q: "Represent 4/5 on a number line and explain how you divide the unit interval.", marks: 5, rubric: [{ step: "Draw number line with 0 and 1", marks: 1 }, { step: "Divide the unit interval into 5 equal parts", marks: 1 }, { step: "Each part = 1/5", marks: 1 }, { step: "Count 4 parts from 0 and mark the point", marks: 1 }, { step: "Label the point 4/5", marks: 1 }], answer: "Draw a number line and mark 0 and 1. Divide the segment between them into 5 equal parts, each of length 1/5. Counting 4 parts to the right of 0 gives the point representing 4/5." },
];

/* ------------------------------------------------------------------ */
/*  CLASS 7 · SCIENCE · CH 9 — HEAT                                    */
/* ------------------------------------------------------------------ */
export const heatMcqs: MCQSeed[] = [
  { q: "The instrument used to measure the temperature of a body is called —", options: ["Barometer", "Thermometer", "Hygrometer", "Odometer"], correct: 1, why: "A thermometer measures temperature; the clinical, laboratory and maximum–minimum types serve different purposes.", pyq: "CBSE 2023" },
  { q: "The SI unit of temperature is —", options: ["Degree Celsius", "Fahrenheit", "Kelvin", "Joule"], correct: 2, why: "The SI unit is kelvin (K); degree Celsius and Fahrenheit are common but not SI units.", pyq: "NCERT Exemplar" },
  { q: "The temperature range of a clinical thermometer is —", options: ["0°C to 100°C", "35°C to 42°C", "−40°C to 250°C", "0°C to 50°C"], correct: 1, why: "A clinical thermometer is made for the human body range, 35°C to 42°C.", pyq: "CBSE 2021" },
  { q: "0°C is also called the —", options: ["Boiling point of water", "Freezing point of water", "Body temperature", "Fixed zero"], correct: 1, why: "At 0°C water freezes and ice melts — it is the lower fixed point.", pyq: "CBSE 2022" },
  { q: "At standard pressure, water boils at —", options: ["0°C", "50°C", "90°C", "100°C"], correct: 3, why: "The upper fixed point of the Celsius scale is 100°C, the boiling point of water at sea-level pressure.", pyq: "State Board 2022" },
  { q: "The normal human body temperature of 37°C is equal to —", options: ["95°F", "98.6°F", "100°F", "89°F"], correct: 1, why: "F = (9/5)×C + 32 = (9/5)×37 + 32 = 98.6°F.", pyq: "CBSE 2020" },
  { q: "Heat always flows from a —", options: ["Colder body to a hotter body", "Hotter body to a colder body", "Both ways equally", "None of these"], correct: 1, why: "Heat is energy in transit that flows spontaneously from higher temperature to lower temperature.", pyq: "NCERT Exemplar" },
  { q: "Transfer of heat through a solid, particle to particle, is called —", options: ["Convection", "Radiation", "Conduction", "Evaporation"], correct: 2, why: "In conduction, heat travels through the material (e.g., a metal spoon in hot soup) without the material itself moving.", pyq: "CBSE 2023" },
  { q: "The transfer of heat in liquids and gases due to actual movement of particles is —", options: ["Conduction", "Radiation", "Convection", "Diffusion"], correct: 2, why: "Heated, less dense liquid rises while cooler denser liquid sinks, forming a convection current.", pyq: "State Board 2021" },
  { q: "Heat from the Sun reaches the Earth mainly by —", options: ["Conduction", "Convection", "Radiation", "Reflection"], correct: 2, why: "Space is a vacuum, so heat can travel only by electromagnetic radiation.", pyq: "CBSE 2022" },
  { q: "Which surface is a better absorber of heat?", options: ["Shiny silver surface", "Black / dark dull surface", "White surface", "Glass surface"], correct: 1, why: "Dark, dull surfaces absorb more heat; that is why black bodies heat up faster in the Sun.", pyq: "NCERT Exemplar" },
  { q: "Which of the following is a good conductor of heat?", options: ["Wood", "Rubber", "Copper", "Plastic"], correct: 2, why: "Metals like copper, aluminium and iron conduct heat well; wood, rubber and plastic are insulators.", pyq: "CBSE 2020" },
  { q: "The wooden handle of a spoon does not get hot quickly because —", options: ["It is light", "Wood is a bad conductor of heat", "It is far from the fire", "It is wet"], correct: 1, why: "Wood is a poor conductor (insulator), so heat travels through it very slowly.", pyq: "State Board 2023" },
  { q: "The liquid commonly used in a clinical thermometer is —", options: ["Water", "Alcohol only", "Mercury (or alcohol)", "Oil"], correct: 2, why: "Mercury (and in alcohol thermometers, coloured alcohol) expands uniformly with temperature.", pyq: "CBSE 2021" },
  { q: "The maximum reading on a typical laboratory thermometer is —", options: ["42°C", "100°C", "250°C", "0°C"], correct: 1, why: "A laboratory thermometer usually covers 0°C to 100°C.", pyq: "NCERT Exemplar" },
  { q: "Convection currents in liquids are caused by differences in —", options: ["Colour", "Density", "Shape", "Weight of the container"], correct: 1, why: "Heated liquid becomes less dense and rises, producing circulating currents.", pyq: "CBSE 2023" },
  { q: "We prefer light-coloured clothes in summer because they —", options: ["Absorb more heat", "Reflect most of the heat", "Are cheaper", "Dry faster"], correct: 1, why: "Light colours reflect most of the incident heat, keeping the body cooler.", pyq: "State Board 2022" },
  { q: "The two fixed points used to calibrate a thermometer are —", options: ["Freezing and boiling points of water", "Body temperatures", "Temperatures of Sun and Moon", "0°C and 50°C"], correct: 0, why: "0°C (melting ice) and 100°C (boiling water at standard pressure) are the lower and upper fixed points.", pyq: "CBSE 2020" },
  { q: "A bimetallic strip thermometer works because its two metals —", options: ["Are the same length", "Expand unequally on heating", "Are both non-metals", "Do not expand"], correct: 1, why: "Unequal expansion bends the strip, moving the pointer — this is used in thermostat switches.", pyq: "Practice" },
  { q: "95°F expressed in Celsius is —", options: ["35°C", "30°C", "40°C", "25°C"], correct: 0, why: "C = (5/9)(F − 32) = (5/9)(95 − 32) = (5/9)×63 = 35°C.", pyq: "Practice" },
];

/* ------------------------------------------------------------------ */
/*  VIDEOS                                                            */
/* ------------------------------------------------------------------ */
export const videosByChapter: Record<string, VideoSeed[]> = {
  "8-science-6": [
    {
      title: "Combustion: Definition, Conditions & Types",
      url: `${V}/BigBuckBunny.mp4`,
      duration: 603,
      sizeMb: 96.4,
      markers: [
        { t: 0, label: "Introduction" },
        { t: 55, label: "What is combustion?" },
        { t: 150, label: "The fire triangle: fuel, air, heat" },
        { t: 250, label: "Slow, rapid & spontaneous combustion" },
        { t: 370, label: "Smouldering in the dark" },
        { t: 490, label: "Quick recap & check" },
      ],
      slides: "/slides/combustion-intro.md",
      slidesTitle: "Slides — Combustion Basics",
    },
    {
      title: "Flame Zones: The Copper Wire Loop Experiment",
      url: `${V}/ElephantsDream.mp4`,
      duration: 653,
      sizeMb: 169.8,
      markers: [
        { t: 0, label: "Setting up the experiment" },
        { t: 45, label: "Observing the three zones" },
        { t: 130, label: "Copper wire loop in each zone" },
        { t: 270, label: "Soot in the luminous zone" },
        { t: 410, label: "Why the outer zone is blue" },
        { t: 550, label: "Summary of observations" },
      ],
      slides: "/slides/flame-zones.md",
      slidesTitle: "Slides — Flame Zones Lab",
    },
  ],
  "8-mathematics-1": [
    {
      title: "Rational Numbers: Number Line & Standard Form",
      url: `${V}/Sintel.mp4`,
      duration: 888,
      sizeMb: 129.8,
      markers: [
        { t: 0, label: "What makes a number rational?" },
        { t: 80, label: "p/q form and the q ≠ 0 rule" },
        { t: 200, label: "Placing rationals on a number line" },
        { t: 350, label: "Standard form worked examples" },
        { t: 520, label: "Additive & multiplicative inverses" },
        { t: 700, label: "Practice set" },
      ],
      slides: "/slides/rational-numbers.md",
      slidesTitle: "Slides — Rational Numbers",
    },
  ],
  "7-science-9": [
    {
      title: "Heat & Thermometer: Three Modes of Transfer",
      url: `${V}/TearsOfSteel.mp4`,
      duration: 734,
      sizeMb: 178.2,
      markers: [
        { t: 0, label: "Measuring temperature" },
        { t: 60, label: "Clinical vs laboratory thermometer" },
        { t: 180, label: "Celsius–Fahrenheit conversion" },
        { t: 320, label: "Conduction, convection, radiation" },
        { t: 470, label: "Good and bad conductors" },
        { t: 600, label: "Quick recap" },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  NOTES                                                             */
/* ------------------------------------------------------------------ */
export const notesByChapter: Record<string, NoteSeed[]> = {
  "8-science-6": [
    {
      title: "One-Page Revision Notes — Combustion & Flame",
      author: "aarav_p",
      content:
        "COMBUSTION — fast reaction with O₂ → heat + light.\n\nConditions (Fire Triangle):\n1. Combustible substance (fuel)\n2. Oxygen / air\n3. Temperature = ignition temperature\n\nTypes: Slow (respiration) · Rapid (matchstick) · Spontaneous (white P) · Smouldering (no air)\n\nFlame zones (candle):\n• Innermost — dark, unburnt vapours\n• Luminous — yellow, glowing carbon (soot here!)\n• Outermost — blue, complete combustion, HOTTEST\n\nCalorific value = heat from 1 kg complete burn (kJ/kg).\nWood 15–25 · Petrol 48 · Diesel 45 · LPG 50 · H₂ 150 (cleanest!)\n\nAcidic oxides ← non-metals (CO₂, SO₂) | Basic oxides ← metals.",
      votesFrom: ["diya_m", "rohan_k", "sneha_s", "kabir_s", "ishita_r", "ms_anita", "ravi_verma", "arjun_t", "meera_n", "vihaan_g", "ananya_b", "ms_anita"],
    },
    {
      title: "Verified Quick Summary for Exams",
      author: "ms_anita",
      verified: true,
      content:
        "Exam-ready summary (verified by faculty).\n\n• Combustion: a substance reacts with oxygen giving heat & light. Products: oxides + heat.\n• Ignition temperature: minimum temperature for a substance to catch fire. Lower it → easier ignition (matchstick, kerosene ~250°C… use a lamp!)\n• Spontaneous combustion happens without heating — white phosphorus (stored under water for safety).\n• Fire safety: cut the air (lid/CO₂), never use water on oil or electrical fires.\n• Hydrogen = cleanest fuel: 2H₂ + O₂ → 2H₂O, no pollutant.\n\nTip: in diagrams, always label the blue outer zone as the hottest.",
      votesFrom: ["aarav_p", "diya_m", "rohan_k", "sneha_s", "kabir_s", "ishita_r", "ravi_verma", "meera_n", "arjun_t", "vihaan_g", "ananya_b", "aarav_p", "diya_m", "rohan_k", "sneha_s"],
    },
    {
      title: "Flame Zones Diagram + Temperature Notes",
      author: "diya_m",
      content:
        "Draw the teardrop flame and shade three zones:\n1. NON-LUMINOUS (darkest) — wax vapours rise here, not yet burnt.\n2. LUMINOUS (yellow) — partial burning; unburnt carbon glows. Hold a cold surface here → SOOT deposits (activity: copper wire loop gets blackened!)\n3. OUTERMOST (blue) — complete burning, highest temperature.\n\nObservation: copper wire loops — blackens fastest in the luminous zone, melts first in the outer zone.\n\nWhy outer is blue: complete combustion + most air supply.",
      votesFrom: ["aarav_p", "rohan_k", "sneha_s", "kabir_s", "ishita_r", "ms_anita", "meera_n"],
    },
    {
      title: "PYQ Bank (CBSE + State Board 2020–2023) with Explanations",
      author: "rohan_k",
      content:
        "Collected previous-year MCQs I have solved:\n\n[CBSE 2023] Unit of calorific value → kJ/kg\n[CBSE 2022] Hottest zone of candle flame → outermost\n[CBSE 2021] Spontaneous combustion example → white phosphorus\n[CBSE 2020] Non-metals burn to give → acidic oxides\n[State 2022] Smouldering occurs in absence of → air\n[Exemplar] Soot is formed in → luminous zone\n[State 2023] Petrol, kerosene, diesel come from → crude oil\n[CBSE 2023] Lowest calorific value among common fuels → wood\n\nKeep practising the conversion: F = 9/5 C + 32 also appears in combo questions.",
      votesFrom: ["aarav_p", "sneha_s", "kabir_s", "ishita_r"],
    },
    {
      title: "Mnemonics — Calorific Values & Oxides",
      author: "sneha_s",
      content:
        "Quick memory aids:\n\n\"W-P-D-L-N-H\" for ascending calorific value:\nWood → Petrol → Diesel → LPG → Natural gas → Hydrogen (150 kJ/kg, king of clean fuel 👑)\n\nOXIDES rule — \"Metals go Basic, Non-metals turn Acidic\":\nFe, Na, Mg → basic oxides | C, S, P, N → acidic oxides.\n\nFire safety — \"S-C-C\": Switch off, Cover (lid/CO₂), Call for help. NEVER water on oil/electric fires.",
      votesFrom: ["diya_m", "kabir_s", "arjun_t"],
    },
  ],
  "8-mathematics-1": [
    {
      title: "Rational Numbers — Formula & Properties Cheat Sheet",
      author: "ravi_verma",
      verified: true,
      content:
        "Verified cheat sheet (faculty).\n\nDefinition: p/q, p, q integers, q ≠ 0.\nStandard form: positive denominator; co-prime numerator & denominator.\n\nKey identities:\n• Additive inverse: −a (a + (−a) = 0)\n• Multiplicative identity: 1\n• Reciprocal: q/p (does not exist for 0)\n\nProperties: closure, commutativity (add & multiply), associativity (add & multiply), distributivity, every non-zero rational has a reciprocal, 0 is the additive identity.\nNOT commutative: subtraction & division.\n\nBetween any two rationals → infinitely many rationals (use the mean!).",
      votesFrom: ["aarav_p", "diya_m", "rohan_k", "sneha_s", "kabir_s", "ishita_r", "ms_anita", "meera_n", "arjun_t", "ananya_b", "vihaan_g"],
    },
    {
      title: "Number Line Practice Set with Step-by-Step",
      author: "ishita_r",
      content:
        "How to plot a/b:\n1. Draw the line, mark 0 and 1.\n2. For negatives use the left side; for >1 mark whole numbers first (11/4 → between 2 and 3).\n3. Divide the unit interval into |q| equal parts.\n4. Count |p| parts from the anchor (0 or the whole number).\n\nTry: 4/5, −7/4, 9/2, 2/3. Mean trick: the mean of a/b and c/d is always between them: (a/b + c/d)/2.",
      votesFrom: ["aarav_p", "diya_m", "rohan_k", "kabir_s"],
    },
  ],
  "7-science-9": [
    {
      title: "Heat Chapter — 5-Minute Revision",
      author: "meera_n",
      content:
        "• Thermometer: SI unit kelvin; clinical 35–42°C; lab 0–100°C.\n• Fixed points: 0°C (ice) & 100°C (boiling water).\n• C = 5/9 (F − 32); F = 9/5 C + 32 → 37°C = 98.6°F.\n• Conduction (solids, metals good) · Convection (liquids/gases, density) · Radiation (vacuum, Sun!).\n• Dark dull surfaces absorb more; light surfaces reflect more.",
      votesFrom: ["arjun_t", "vihaan_g", "ananya_b", "ms_anita"],
    },
  ],
};

export const DEMO_PASSWORD = "demo123";
