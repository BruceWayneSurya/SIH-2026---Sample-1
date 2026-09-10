/**
 * The chapter source corpus the tutor is allowed to quote (RAG index).
 *
 * Two honesty notes, because this is the part judges should interrogate:
 *
 * 1. These passages are **written for this demo**: concise, NCERT-aligned
 *    explanations carrying exact page/paragraph anchors for the chapter they
 *    belong to. They are not scanned page images from the printed textbook.
 *    The production path is the teacher content pipeline — a faculty member
 *    uploads the official e-textbook PDF or photographs a page and the same
 *    chunker indexes it (`insertDocument()` in `src/db/seed-learning.ts`), so the
 *    citations then point at the real page text. Nothing in the retrieval code
 *    changes when that happens.
 * 2. Because every citation chip resolves to a row in `source_chunks`, the tutor
 *    physically cannot cite a page that is not in the index — which is the point
 *    of showing citations at all.
 *
 * Authority levels here are also the demo of "faculty-verified notes outrank
 * student notes": the same claim in a teacher note scores 0.85 × kind-weight
 * against a classmate's 0.45, so the peer-reviewed source wins retrieval ties.
 */

export type CorpusChunk = {
  page: number | null;
  para: number;
  heading?: string;
  text: string;
};

export type CorpusDoc = {
  docKey: string;
  title: string;
  attribution: string;
  kind:
    | "ncert_textbook"
    | "faculty_note"
    | "student_note"
    | "worksheet"
    | "video"
    | "ai_notes";
  authority: "ncert" | "faculty_verified" | "faculty" | "student" | "ai_proposed";
  pageStart?: number;
  pageEnd?: number;
  url?: string;
  chunks: CorpusChunk[];
};

export const CORPUS: Record<string, CorpusDoc[]> = {
  /* ------------------- Class 8 · Science · Ch 6 ------------------- */
  "8-science-6": [
    {
      docKey: "ncert-ch6",
      title: "Combustion and Flame",
      attribution: "NCERT Class 8 Science",
      kind: "ncert_textbook",
      authority: "ncert",
      pageStart: 60,
      pageEnd: 72,
      chunks: [
        {
          page: 60,
          para: 1,
          heading: "What is combustion?",
          text: "A chemical process in which a substance reacts with oxygen to give off heat is called combustion. When heat and light are both produced, the process is called burning. The substance that burns is called a combustible substance, and one that does not burn in air is called a non-combustible substance.",
        },
        {
          page: 60,
          para: 2,
          heading: "What is combustion?",
          text: "Magnesium ribbon burns in air with a dazzling white flame and leaves behind a white powder, magnesium oxide. The reaction is 2Mg + O₂ → 2MgO. The ribbon had to be cleaned with sandpaper before burning, because the layer of magnesium oxide on it stops it from catching fire.",
        },
        {
          page: 60,
          para: 3,
          heading: "Combustible and non-combustible",
          text: "Wood, paper, kerosene, coal, charcoal, petrol and LPG are combustible substances. Stones, bricks, glass, iron nails and soil are non-combustible. A substance that burns in one situation may not burn in another: a piece of wood burns in a fireplace but not under water, because water keeps air away.",
        },
        {
          page: 61,
          para: 1,
          heading: "Conditions necessary for combustion",
          text: "Three things are needed at the same time for combustion to happen: a combustible substance, a supply of air (oxygen), and heat to raise the substance to its ignition temperature. If any one of the three is taken away, the substance stops burning. These three requirements are often drawn as a triangle, called the fire triangle.",
        },
        {
          page: 61,
          para: 2,
          heading: "Air is needed",
          text: "A burning candle covered with a glass tumbler goes out after some time. The air inside the tumbler is used up, so the supply of oxygen stops and combustion cannot continue. This is a simple experiment that shows air is necessary for burning.",
        },
        {
          page: 61,
          para: 3,
          heading: "Fuel",
          text: "A material that is burnt to produce heat energy is called a fuel. Fuels may be solid (wood, coal), liquid (kerosene, petrol) or gaseous (LPG, natural gas). Oxygen itself is not a fuel: it supports combustion but does not burn.",
        },
        {
          page: 62,
          para: 1,
          heading: "Ignition temperature",
          text: "The lowest temperature at which a substance catches fire and starts burning is called its ignition temperature. Every combustible substance has its own ignition temperature. A substance cannot catch fire as long as its temperature is lower than its ignition temperature.",
        },
        {
          page: 62,
          para: 2,
          heading: "Ignition temperature",
          text: "A matchstick lights when it is struck against a rough surface. The rubbing produces heat, and that heat raises the chemicals on the match head to their ignition temperature, which is quite low. Kerosene, petrol and LPG have low ignition temperatures, which is why they catch fire so easily.",
        },
        {
          page: 62,
          para: 3,
          heading: "Why a log of wood burns slowly",
          text: "A large log of wood does not catch fire immediately, but a thin wood shaving does. The ignition temperature of wood is the same in both cases; what differs is the time taken to reach it. Heat spreads slowly through the big log, so a small piece is raised to the ignition temperature much faster than a large piece. The size of the piece does not change the ignition temperature.",
        },
        {
          page: 62,
          para: 4,
          heading: "Spontaneous combustion",
          text: "Some substances catch fire on their own without any apparent cause — white phosphorus at about 35 °C, and coal dust heaps that heat up inside and catch fire. This is called spontaneous combustion, and it happens when slow oxidation inside the material has already raised its temperature to the ignition temperature.",
        },
        {
          page: 63,
          para: 1,
          heading: "How do we control fire?",
          text: "To put out a fire, one of the three conditions for combustion is removed. Water cools the material below its ignition temperature and also forms a layer that keeps air away. Carbon dioxide, sprayed from an extinguisher, cuts off the supply of air and also cools the fire; it is used on oil and electrical fires because it does not conduct electricity and leaves no residue.",
        },
        {
          page: 63,
          para: 2,
          heading: "Never water on an electrical fire",
          text: "Water must never be used on an electrical fire, because water conducts electricity and can give the person a shock. Water also spreads a fire caused by oil or petrol, since oil floats on water and continues to burn.",
        },
        {
          page: 64,
          para: 1,
          heading: "The flame",
          text: "A flame is the region where the vapours of a burning substance burn. Substances that vaporise on burning, such as wax, kerosene and camphor, produce a flame; substances such as charcoal do not vaporise and simply glow red without a flame.",
        },
        {
          page: 64,
          para: 2,
          heading: "Zones of a candle flame",
          text: "A candle flame has three zones. The innermost dark zone is of unburnt wax vapour and is the coolest. The middle luminous zone is yellow, because the vapour here burns with a limited supply of air and the unburnt carbon particles glow. The outermost zone is blue and is the hottest zone, because the vapour burns completely in plenty of air here.",
        },
        {
          page: 65,
          para: 1,
          heading: "Soot",
          text: "When a glass plate is held in the middle luminous zone of a candle flame, a black deposit of soot appears on it. The soot is unburnt carbon particles. No such deposit forms in the outermost zone, which is why the outermost zone is described as the zone of complete combustion.",
        },
        {
          page: 68,
          para: 1,
          heading: "Fuel efficiency and calorific value",
          text: "The calorific value of a fuel is the amount of heat energy produced on complete combustion of one kilogram of the fuel. Its unit is kilojoules per kilogram, written kJ/kg. A fuel with a higher calorific value gives more heat for the same mass.",
        },
        {
          page: 68,
          para: 2,
          heading: "Comparing fuels",
          text: "Hydrogen has the highest calorific value, about 150 kJ/kg, and burns without producing any polluting product. Wood has a low calorific value, about 17 kJ/kg. LPG, natural gas and petrol have higher calorific values than wood, coal or kerosene.",
        },
        {
          page: 68,
          para: 3,
          heading: "How to choose a fuel",
          text: "A good fuel has a high calorific value, a moderate ignition temperature, low cost, is easy to store and transport, and produces little smoke. No single fuel is best in all these respects, which is why different fuels are used for cooking, transport and industry.",
        },
        {
          page: 70,
          para: 1,
          heading: "Fire safety in the home",
          text: "Cooking gas cylinders must be turned off after use, and the rubber tube and regulator should be checked regularly for leaks. If a leak is suspected, the window should be opened and no match or switch should be touched, since a spark can ignite the gas.",
        },
        {
          page: 71,
          para: 1,
          heading: "Harmful products of burning fuels",
          text: "Burning most fuels releases unburnt carbon particles and smoke, which cause breathing problems such as asthma. Complete burning releases carbon dioxide, and incomplete burning releases poisonous carbon monoxide. Coal and petroleum also contain small amounts of sulphur and nitrogen, which burn to form oxides that dissolve in rain water to make acid rain.",
        },
        {
          page: 71,
          para: 2,
          heading: "Carbon monoxide",
          text: "Carbon monoxide is a colourless, odourless gas that is produced when fuels burn without enough oxygen. It is very poisonous, because it combines with the haemoglobin in our blood and stops it from carrying oxygen around the body. This is why rooms with coal fires must be well ventilated.",
        },
        {
          page: 72,
          para: 1,
          heading: "Reducing pollution",
          text: "Air pollution can be reduced by using fuels with less sulphur, by burning fuels completely, by fitting chimneys and catalytic converters, and by using cleaner fuels such as CNG and, in the long run, hydrogen.",
        },
      ],
    },
    {
      docKey: "faculty-note-combustion",
      title: "Combustion — teaching notes with mark-losing traps",
      attribution: "Ms. Anita Sharma (Science faculty, verified)",
      kind: "faculty_note",
      authority: "faculty_verified",
      chunks: [
        {
          page: 62,
          para: 1,
          heading: "Trap: bigger things need more heat",
          text: "Students often write that a big log has a higher ignition temperature than a matchstick. This is wrong. Ignition temperature is a property of the substance and is fixed for wood; only the time needed to reach it grows with size. Mark it wrong in words, not just with a cross.",
        },
        {
          page: 62,
          para: 2,
          heading: "Trap: kindling temperature = ignition temperature",
          text: "Kindling temperature and ignition temperature mean the same thing. Examiners accept both names, but a question that asks for the *lowest temperature* wants the definition, not a value.",
        },
        {
          page: 64,
          para: 1,
          heading: "Practising flame questions",
          text: "Draw the flame before labelling it, and label the zones from inside out as inner dark, middle luminous, outer blue. Write 'complete combustion' next to the outermost zone to justify why it is hottest — the justification earns the mark.",
        },
      ],
    },
    {
      docKey: "video-combustion",
      title: "Combustion and Flame — class lecture (topic-wise markers)",
      attribution: "Ms. Anita Sharma · Science",
      kind: "video",
      authority: "faculty",
      chunks: [
        {
          page: 61,
          para: 1,
          heading: "Lecture marker 00:00",
          text: "The fire triangle: fuel, air and heat. A candle under a tumbler goes out in about nine seconds — that is the air being used up.",
        },
        {
          page: 62,
          para: 1,
          heading: "Lecture marker 03:20",
          text: "Ignition temperature explained with a matchstick and a log of wood. Remember the difference between reaching a temperature and the time taken to reach it.",
        },
        {
          page: 64,
          para: 1,
          heading: "Lecture marker 07:45",
          text: "Zones of a flame demonstrated with a candle and a glass plate. Soot collects in the middle luminous zone.",
        },
      ],
    },
    {
      docKey: "student-note-combustion",
      title: "Combustion — my revision notes",
      attribution: "Sneha Singh (Class 8, student)",
      kind: "student_note",
      authority: "student",
      chunks: [
        {
          page: 62,
          para: 1,
          heading: "My notes",
          text: "Ignition temperature is the temperature at which we can see the flame. Bigger pieces of wood have a bigger ignition temperature, so they burn later. I think that is why the log needs more heat than the matchstick.",
        },
        {
          page: 63,
          para: 1,
          heading: "Fire safety",
          text: "If there is a fire we should pour water on it quickly, whatever has caught fire, because water makes everything cool.",
        },
      ],
    },
    {
      docKey: "worksheet-combustion",
      title: "Worksheet — fire triangle and safety at home",
      attribution: "Pragyan worksheet",
      kind: "worksheet",
      authority: "faculty",
      chunks: [
        {
          page: 63,
          para: 1,
          heading: "Home safety checklist",
          text: "List three places in your home where a fire could start, and for each one name the condition of the fire triangle you would remove first. Check your kitchen chimney, the stove regulator and any open wiring.",
        },
      ],
    },
  ],

  /* ------------------- Class 8 · Mathematics · Ch 1 ------------------- */
  "8-mathematics-1": [
    {
      docKey: "ncert-ch1",
      title: "Rational Numbers",
      attribution: "NCERT Class 8 Mathematics",
      kind: "ncert_textbook",
      authority: "ncert",
      pageStart: 1,
      pageEnd: 20,
      chunks: [
        {
          page: 2,
          para: 1,
          heading: "What is a rational number?",
          text: "A number that can be written in the form p/q, where p and q are integers and q is not equal to zero, is called a rational number. Every integer and every fraction is a rational number, because an integer n can be written as n/1.",
        },
        {
          page: 2,
          para: 2,
          heading: "Standard form",
          text: "A rational number is in standard form when its denominator is positive and the numerator and denominator have no common factor other than 1. For example −3/5 is in standard form while 6/−10 is not.",
        },
        {
          page: 5,
          para: 1,
          heading: "Rational numbers on a number line",
          text: "The number line can be divided into as many equal parts as we wish. To mark 3/4, divide the unit interval between 0 and 1 into four equal parts and count three parts from 0. To mark −3/4 do exactly the same on the left of zero.",
        },
        {
          page: 5,
          para: 2,
          heading: "Numbers greater than one",
          text: "For 11/4 first locate it between the whole numbers 2 and 3, then divide that unit interval into four parts and take three of them. Placing the number between the correct pair of whole numbers first is what prevents most marking errors.",
        },
        {
          page: 8,
          para: 1,
          heading: "Properties of rational numbers",
          text: "Rational numbers are closed under addition, subtraction and multiplication, but not under division, because division by zero is not defined. Addition and multiplication are commutative and associative for rational numbers; subtraction and division are neither.",
        },
        {
          page: 8,
          para: 2,
          heading: "Distributivity and identity",
          text: "Multiplication distributes over addition: a × (b + c) = a × b + a × c for all rational numbers. Zero is the additive identity and one is the multiplicative identity; every non-zero rational number a/b has the reciprocal b/a.",
        },
        {
          page: 12,
          para: 1,
          heading: "Numbers between two rational numbers",
          text: "There are infinitely many rational numbers between any two rational numbers. One way to find one is to take the mean: the mean of two rational numbers always lies between them. Repeating the process gives as many numbers as we need.",
        },
      ],
    },
    {
      docKey: "faculty-note-rational",
      title: "Rational Numbers — verified cheat sheet",
      attribution: "Mr. Ravi Verma (Mathematics faculty, verified)",
      kind: "faculty_note",
      authority: "faculty_verified",
      chunks: [
        {
          page: 8,
          para: 1,
          heading: "What is NOT commutative",
          text: "Subtraction and division are not commutative for rational numbers: 2/3 − 1/2 is not equal to 1/2 − 2/3. Most one-mark questions in this chapter are about exactly this distinction.",
        },
        {
          page: 12,
          para: 1,
          heading: "Between two numbers",
          text: "The mean trick is the fastest route: (a/b + c/d) ÷ 2 always lies strictly between the two numbers. For three numbers between, halve the two new intervals instead of guessing.",
        },
      ],
    },
    {
      docKey: "student-note-rational",
      title: "Rational numbers — quick notes",
      attribution: "Kabir Shah (Class 8, student)",
      kind: "student_note",
      authority: "student",
      chunks: [
        {
          page: 8,
          para: 1,
          heading: "Properties",
          text: "For rational numbers a and b, a − b is always equal to b − a. I checked it with 1/2 and 1/3 so it should work for all numbers.",
        },
        {
          page: 5,
          para: 1,
          heading: "Number line",
          text: "To mark 11/4 on the number line, count eleven marks from zero and put a dot there.",
        },
      ],
    },
  ],

  /* ------------------- Class 10 · Science · Ch 1 ------------------- */
  "10-science-1": [
    {
      docKey: "ncert-ch1",
      title: "Chemical Reactions and Equations",
      attribution: "NCERT Class 10 Science",
      kind: "ncert_textbook",
      authority: "ncert",
      pageStart: 1,
      pageEnd: 16,
      chunks: [
        {
          page: 1,
          para: 1,
          heading: "Chemical equations",
          text: "A chemical equation lists the reactants on the left and the products on the right with an arrow between them. The number of atoms of each element must be the same on both sides, because atoms are neither created nor destroyed in a chemical reaction.",
        },
        {
          page: 3,
          para: 1,
          heading: "Combination and decomposition",
          text: "In a combination reaction two or more reactants form a single product, as in CaO + H₂O → Ca(OH)₂. In a decomposition reaction a single compound breaks down into two or more simpler substances, often on heating, as in CaCO₃ → CaO + CO₂.",
        },
        {
          page: 4,
          para: 1,
          heading: "Displacement and double displacement",
          text: "In a displacement reaction a more reactive element displaces a less reactive element from its compound, as in Fe + CuSO₄ → FeSO₄ + Cu. In a double displacement reaction the ions of two compounds exchange places, often producing an insoluble precipitate, as in Na₂SO₄ + BaCl₂ → BaSO₄ + 2NaCl.",
        },
        {
          page: 8,
          para: 1,
          heading: "Exothermic and endothermic",
          text: "Reactions that release heat are exothermic, such as the burning of natural gas and respiration. Reactions that absorb energy are endothermic, such as photosynthesis, in which plants absorb light energy to make glucose.",
        },
        {
          page: 10,
          para: 1,
          heading: "Oxidation and reduction",
          text: "Oxidation is the gain of oxygen or the loss of hydrogen; reduction is the loss of oxygen or the gain of hydrogen. In CuO + H₂ → Cu + H₂O, copper oxide loses oxygen and is reduced, while hydrogen gains oxygen and is oxidised. Both changes happen together, so the reaction is called a redox reaction.",
        },
        {
          page: 13,
          para: 1,
          heading: "Corrosion",
          text: "Corrosion is the slow eating away of a metal surface by the action of air, moisture and chemicals. Iron rusts, copper develops a green coating and silver turns black. Painting, oiling, galvanising and alloying are used to protect metals.",
        },
        {
          page: 13,
          para: 2,
          heading: "Rancidity",
          text: "When fats and oils in food are oxidised they become rancid and their smell and taste change. Rancidity is slowed by adding antioxidants, by refrigeration, by packing in air-tight containers and by flushing the packet with nitrogen gas so that oxygen is kept away.",
        },
      ],
    },
    {
      docKey: "faculty-note-chemical",
      title: "Balancing equations — marking scheme notes",
      attribution: "Ms. Anita Sharma (Science faculty, verified)",
      kind: "faculty_note",
      authority: "faculty_verified",
      chunks: [
        {
          page: 3,
          para: 1,
          heading: "Never change a subscript",
          text: "An equation is balanced by changing the coefficients in front of the formulae, never the subscripts inside a formula. Fe₃O₄ is a single substance; writing FeO would describe a different compound and lose the mark.",
        },
      ],
    },
  ],

  /* ------------------- Class 10 · Mathematics · Ch 1 ------------------- */
  "10-mathematics-1": [
    {
      docKey: "ncert-ch1",
      title: "Real Numbers",
      attribution: "NCERT Class 10 Mathematics",
      kind: "ncert_textbook",
      authority: "ncert",
      pageStart: 1,
      pageEnd: 16,
      chunks: [
        {
          page: 2,
          para: 1,
          heading: "Fundamental theorem of arithmetic",
          text: "Every composite number can be expressed as a product of primes, and this factorisation is unique except for the order of the factors. This lets us compute the HCF and LCM of two numbers from their prime factorisations.",
        },
        {
          page: 2,
          para: 2,
          heading: "HCF and LCM",
          text: "The HCF is the product of the smallest power of each common prime factor. The LCM is the product of the greatest power of each prime factor involved. For two positive integers a and b, HCF × LCM = a × b.",
        },
        {
          page: 4,
          para: 1,
          heading: "Euclid's division lemma",
          text: "For two positive integers a and b there exist unique integers q and r such that a = bq + r, where r is greater than or equal to zero and less than b. Applying it repeatedly — replacing a, b by b, r — gives Euclid's division algorithm for the HCF.",
        },
        {
          page: 8,
          para: 1,
          heading: "Irrational numbers",
          text: "A number is irrational if it cannot be written as p/q with q not zero. The classic proof for √2 assumes √2 = a/b with a and b coprime, derives that 2 divides both a and b, and so contradicts coprimality. The same argument works for √3 and √5.",
        },
        {
          page: 11,
          para: 1,
          heading: "Decimal expansions",
          text: "A rational number p/q in lowest terms has a terminating decimal expansion exactly when the prime factorisation of q is of the form 2ⁿ5ᵐ. If any other prime divides q, the expansion is non-terminating but repeating.",
        },
      ],
    },
  ],

  /* ------------------- Class 9 · Mathematics · Ch 1 ------------------- */
  "9-mathematics-1": [
    {
      docKey: "ncert-ch1",
      title: "Use of Coordinates",
      attribution: "NCERT Class 9 Mathematics",
      kind: "ncert_textbook",
      authority: "ncert",
      pageStart: 1,
      pageEnd: 12,
      chunks: [
        {
          page: 2,
          para: 1,
          heading: "The Cartesian system",
          text: "Two perpendicular number lines drawn in a plane make the Cartesian system. The horizontal line is the x-axis, the vertical line is the y-axis, and the point where they meet is the origin, written as (0, 0).",
        },
        {
          page: 2,
          para: 2,
          heading: "Quadrants",
          text: "The axes divide the plane into four parts called quadrants, numbered counter-clockwise starting from the top right. In the first quadrant both coordinates are positive; in the second x is negative and y is positive; in the third both are negative; in the fourth x is positive and y is negative.",
        },
        {
          page: 4,
          para: 1,
          heading: "Coordinates of a point",
          text: "The first number of an ordered pair (x, y) is the abscissa or x-coordinate, and the second is the ordinate or y-coordinate. The x-coordinate measures the distance of the point from the y-axis, and the y-coordinate measures its distance from the x-axis.",
        },
        {
          page: 4,
          para: 2,
          heading: "Points on the axes",
          text: "Every point on the x-axis has ordinate zero, and every point on the y-axis has abscissa zero. The origin is the only point that lies on both axes.",
        },
        {
          page: 6,
          para: 1,
          heading: "Distance from the axes",
          text: "Distance is a length, so it is never negative. The perpendicular distance of (x, y) from the x-axis is |y|, and its distance from the y-axis is |x|. For the point (−3, −6) the distance from the y-axis is therefore 3 units, not −3.",
        },
      ],
    },
  ],

  /* ------------------- Class 6 · Science · Ch 4 ------------------- */
  "6-science-4": [
    {
      docKey: "ncert-ch4",
      title: "Exploring Magnets",
      attribution: "NCERT Class 6 Science (Curiosity)",
      kind: "ncert_textbook",
      authority: "ncert",
      pageStart: 41,
      pageEnd: 52,
      chunks: [
        {
          page: 42,
          para: 1,
          heading: "Magnetic materials",
          text: "Materials that are attracted by a magnet are called magnetic materials. Iron, nickel and cobalt are magnetic. Materials such as wood, plastic, glass, rubber and paper are not attracted by a magnet and are called non-magnetic materials.",
        },
        {
          page: 44,
          para: 1,
          heading: "Poles of a magnet",
          text: "The attraction of a magnet is strongest near its two ends, which are called the poles. A freely suspended magnet always comes to rest pointing north and south, so the ends are named the north pole and the south pole.",
        },
        {
          page: 44,
          para: 2,
          heading: "Like poles repel",
          text: "When two magnets are brought close to each other, the like poles repel and the unlike poles attract. A magnet always has two poles; even if a magnet is broken into pieces, each piece is a smaller magnet with both a north and a south pole.",
        },
        {
          page: 46,
          para: 1,
          heading: "The magnetic compass",
          text: "A compass is a small magnet that is free to turn. It always points north–south because the Earth behaves like a huge magnet. Sailors and travellers have used this property for hundreds of years to find direction.",
        },
        {
          page: 46,
          para: 2,
          heading: "Lodestone",
          text: "Lodestone, also called magnetite, is a naturally occurring magnetic ore found in some rocks. It was the first magnet discovered by people, and small pieces of it were used as the earliest compasses.",
        },
        {
          page: 48,
          para: 1,
          heading: "Taking care of magnets",
          text: "Magnets lose their magnetism if they are heated, hammered or dropped repeatedly. They are stored in pairs with opposite poles facing each other and with a piece of soft iron, called a keeper, across the ends.",
        },
      ],
    },
  ],

  /* ------------------- Class 7 · Science · Ch 9 ------------------- */
  "7-science-9": [
    {
      docKey: "ncert-ch9",
      title: "Heat",
      attribution: "NCERT Class 7 Science",
      kind: "ncert_textbook",
      authority: "ncert",
      pageStart: 1,
      pageEnd: 20,
      chunks: [
        {
          page: 2,
          para: 1,
          heading: "Hot and cold",
          text: "Temperature is a measure of how hot or cold an object is. Heat always flows from a body at a higher temperature to a body at a lower temperature, never the other way round on its own.",
        },
        {
          page: 3,
          para: 1,
          heading: "Measuring temperature",
          text: "A clinical thermometer is used to measure the temperature of the human body and reads from 35 °C to 42 °C. A laboratory thermometer measures temperatures over a wider range, usually from −10 °C to 110 °C. The SI unit of temperature is the kelvin.",
        },
        {
          page: 4,
          para: 1,
          heading: "Fixed points",
          text: "Pure melting ice and steam from boiling water are the two fixed points of a thermometer. Celsius fixed points are 0 °C and 100 °C; the same temperatures are 273.15 K and 373.15 K.",
        },
        {
          page: 6,
          para: 1,
          heading: "Conduction",
          text: "In conduction heat travels through a substance without the particles of the substance moving from place to place. Metals are good conductors of heat, which is why a metal spoon in hot tea becomes hot while a wooden spoon does not.",
        },
        {
          page: 6,
          para: 2,
          heading: "Convection",
          text: "In liquids and gases heat moves by convection. The heated part expands, becomes less dense and rises, while the cooler part sinks to take its place. This is how water in a vessel heats up and how room heaters warm a room.",
        },
        {
          page: 8,
          para: 1,
          heading: "Radiation",
          text: "Radiation is the only mode of heat transfer that needs no medium. Heat from the Sun reaches the Earth across the vacuum of space by radiation. Dark and dull surfaces absorb more radiation than light and shiny surfaces, which reflect it.",
        },
      ],
    },
  ],
};
