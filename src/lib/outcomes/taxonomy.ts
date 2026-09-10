/**
 * NCERT Learning Outcomes, chapter by chapter.
 *
 * Source documents (the "LO lists" the portal is mapped against):
 *   • NCERT, *Learning Outcomes at the Elementary Stage* (2017) — Classes 1–8
 *   • NCERT, *Learning Outcomes at the Secondary Stage* (2019) — Classes 9–10
 *
 * A learning outcome is a *statement of what a learner should be able to do*.
 * The NCERT documents publish them per subject and stage; the portal keeps the
 * published stage outcome as the parent (`sourceStatement`) and derives one
 * assessable child outcome per chapter concept. Every derived statement carries
 * `sourceDoc` + `sourcePage` so a teacher can audit it against the printed list,
 * and every code is stable (`LO-8-SCI-06-03`), because mastery history, question
 * mapping and the offline pack all key off it.
 *
 * Adding a chapter here is what turns a chapter page from "content coming soon"
 * into a mastery graph. Chapters without a curated map say so on screen instead
 * of inventing outcomes — see `outcomesForChapter()`.
 */

export type OutcomeKind = "concept" | "skill" | "application";

/** Simple, print-friendly diagrams a concept node can carry. */
export type DiagramKind = "fire-triangle" | "flame-zones" | "number-line" | "none";

export type LearningOutcome = {
  /** Stable NCERT-style code, e.g. LO-8-SCI-06-03. */
  code: string;
  classNo: number;
  subjectSlug: string;
  chapterNum: number;
  /** Parent concept code — makes the concept tree, not a flat list. */
  parent: string | null;
  order: number;
  /** Short label for the tree node and the heatmap row. */
  concept: string;
  /** The assessable statement ("can do" wording). */
  statement: string;
  /** One-paragraph definition shown when a node is opened. */
  definition: string;
  kind: OutcomeKind;
  /** NCERT stage outcome this chapter outcome sits under. */
  sourceStatement: string;
  sourceDoc: string;
  sourcePage: number;
  /** Where to re-teach it: textbook page in the chapter PDF. */
  textbookPage: number;
  /** Retrieval + matching keys (used by the tutor and the question mapper). */
  keywords: string[];
  /** Known wrong ideas, used by the explainable reteach panel. */
  misconceptions: string[];
  diagram: DiagramKind;
};

/** Subject prefix used inside outcome codes and DIKSHA codes. */
export const SUBJECT_PREFIX: Record<string, string> = {
  science: "SCI",
  mathematics: "MATH",
  "social-science": "SST",
  english: "ENG",
  hindi: "HIN",
  "arts-vocational": "ARTS",
};

const ELEMENTARY = "NCERT Learning Outcomes at the Elementary Stage (2017)";
const SECONDARY = "NCERT Learning Outcomes at the Secondary Stage (2019)";

export function outcomeCode(
  classNo: number,
  subjectSlug: string,
  chapterNum: number,
  index: number,
): string {
  const prefix = SUBJECT_PREFIX[subjectSlug] ?? "GEN";
  return `LO-${classNo}-${prefix}-${String(chapterNum).padStart(2, "0")}-${String(index).padStart(2, "0")}`;
}

type Draft = Omit<
  LearningOutcome,
  "code" | "classNo" | "subjectSlug" | "chapterNum" | "order"
>;

/** key = `${classNo}-${subjectSlug}-${chapterNum}`, same key the seed uses. */
const CURATED: Record<string, Draft[]> = {
  "8-science-6": [
    {
      parent: null,
      concept: "Combustion",
      statement:
        "Classifies materials around them as combustible or non-combustible and explains what combustion is.",
      definition:
        "Combustion is a chemical process in which a substance reacts with oxygen and gives out heat and light. Substances that burn in air are combustible; those that do not are non-combustible.",
      kind: "concept",
      sourceStatement:
        "Classifies materials/objects/substances based on observable properties and gives reasons.",
      sourceDoc: ELEMENTARY,
      sourcePage: 62,
      textbookPage: 60,
      keywords: ["combustion", "combustible", "non-combustible", "burning", "oxygen"],
      misconceptions: [
        "Every substance that gets hot also burns.",
        "Burning is only about heat, not a chemical change with oxygen.",
      ],
      diagram: "none",
    },
    {
      parent: "LO-8-SCI-06-01",
      concept: "Conditions for combustion",
      statement:
        "Demonstrates that fuel, air (oxygen) and heat are together necessary for combustion, and predicts what happens when any one is removed.",
      definition:
        "Three things must be present at the same time for burning to happen: a combustible substance (fuel), a supply of air, and enough heat to reach the ignition temperature. Removing any one of them stops combustion.",
      kind: "concept",
      sourceStatement:
        "Plans and carries out simple investigations to test ideas, using controls and variables.",
      sourceDoc: ELEMENTARY,
      sourcePage: 62,
      textbookPage: 61,
      keywords: ["conditions", "air", "oxygen", "fuel", "heat", "fire triangle"],
      misconceptions: [
        "Oxygen is only needed to start a fire, not to keep it burning.",
        "A fire goes out because the fuel is finished, always.",
      ],
      diagram: "fire-triangle",
    },
    {
      parent: "LO-8-SCI-06-02",
      concept: "Ignition temperature",
      statement:
        "Explains ignition temperature and uses it to reason why a matchstick lights on striking but a log of wood does not light immediately.",
      definition:
        "The ignition temperature is the lowest temperature at which a substance catches fire and starts burning. A matchstick lights when the heat of striking raises the match head to its ignition temperature; a log of wood needs a much longer time for its whole surface to reach the same temperature, even though the temperature itself is not higher.",
      kind: "concept",
      sourceStatement:
        "Explains cause–effect relationships between events observed in daily life and the science involved.",
      sourceDoc: ELEMENTARY,
      sourcePage: 62,
      textbookPage: 62,
      keywords: [
        "ignition temperature",
        "kindling temperature",
        "catches fire",
        "matchstick",
        "wood",
        "kindling",
      ],
      misconceptions: [
        "A bigger piece of wood has a higher ignition temperature.",
        "Ignition temperature is the same as the boiling point of the substance.",
        "Rubbing a matchstick produces oxygen.",
        "Ignition temperature means the temperature of the flame.",
      ],
      diagram: "none",
    },
    {
      parent: "LO-8-SCI-06-01",
      concept: "Flame and its zones",
      statement:
        "Labels the zones of a candle flame and explains why the outermost zone is the hottest.",
      definition:
        "A flame has three zones: the dark innermost zone of unburnt vapour, the yellow luminous middle zone where vapour decomposes with partial air and forms soot, and the blue outermost zone where the vapour burns completely in plenty of air — so it is the hottest.",
      kind: "concept",
      sourceStatement:
        "Observes, records and explains patterns in the working of everyday processes.",
      sourceDoc: ELEMENTARY,
      sourcePage: 63,
      textbookPage: 64,
      keywords: ["flame", "zones", "luminous", "outermost", "soot", "candle", "hottest"],
      misconceptions: [
        "The innermost zone is the hottest because it is nearest the wick.",
        "Soot forms in the outermost blue zone.",
      ],
      diagram: "flame-zones",
    },
    {
      parent: "LO-8-SCI-06-04",
      concept: "Harmful products of combustion",
      statement:
        "Names the harmful products of burning fuels and explains why their release matters.",
      definition:
        "Burning fuels release carbon dioxide, carbon monoxide, sulphur dioxide, nitrogen oxides and smoke particles. Carbon monoxide is poisonous, sulphur and nitrogen oxides cause acid rain, and the fine particles make the air unhealthy — which is why cleaner fuels are preferred.",
      kind: "application",
      sourceStatement:
        "Suggests ways to use natural resources judiciously and explains the consequences of their misuse.",
      sourceDoc: ELEMENTARY,
      sourcePage: 63,
      textbookPage: 71,
      keywords: ["carbon monoxide", "pollution", "acid rain", "smoke", "unburnt carbon"],
      misconceptions: [
        "All the products of burning fuels are safe gases.",
        "Carbon dioxide is the only gas released when fuel burns.",
      ],
      diagram: "none",
    },
    {
      parent: "LO-8-SCI-06-01",
      concept: "Fuel efficiency and calorific value",
      statement:
        "Compares fuels using calorific value and justifies why a fuel with a higher calorific value is preferred.",
      definition:
        "The calorific value of a fuel is the heat released when one kilogram of it burns completely in oxygen. It is measured in kilojoules per kilogram (kJ/kg); hydrogen has the highest calorific value and wood among the lowest.",
      kind: "skill",
      sourceStatement:
        "Uses appropriate units and measurements while reporting the outcome of an investigation.",
      sourceDoc: ELEMENTARY,
      sourcePage: 63,
      textbookPage: 68,
      keywords: ["calorific value", "kJ/kg", "fuel", "efficiency", "hydrogen", "wood"],
      misconceptions: [
        "Calorific value is measured in kJ, not kJ per kg.",
        "The fuel that burns longest always has the highest calorific value.",
      ],
      diagram: "none",
    },
    {
      parent: "LO-8-SCI-06-02",
      concept: "Fire safety and extinguishers",
      statement:
        "Chooses a suitable method of putting out a fire and explains the principle used, including why water must never be used on electrical or oil fires.",
      definition:
        "A fire is stopped by removing one of the three conditions for combustion: covering it cuts off air, cooling it brings the temperature below the ignition temperature, and removing the fuel takes the material away. Carbon dioxide is used on electrical and oil fires because it is a gas — it smothers the fire, cools it, and does not conduct electricity.",
      kind: "application",
      sourceStatement:
        "Takes safety measures in day-to-day life based on an understanding of the science involved.",
      sourceDoc: ELEMENTARY,
      sourcePage: 63,
      textbookPage: 70,
      keywords: ["fire extinguisher", "carbon dioxide", "water", "electrical fire", "safety"],
      misconceptions: [
        "Water can be used on every fire.",
        "An extinguisher works by adding oxygen to the fire.",
      ],
      diagram: "none",
    },
  ],

  "8-mathematics-1": [
    {
      parent: null,
      concept: "Rational numbers and their forms",
      statement:
        "Represents a given rational number in standard form and identifies its numerator, denominator and sign.",
      definition:
        "A rational number is a number of the form p/q where p and q are integers and q is not zero. In standard form the denominator is positive and the numerator and denominator are co-prime.",
      kind: "concept",
      sourceStatement: "Represents numbers in different forms and uses them in context.",
      sourceDoc: ELEMENTARY,
      sourcePage: 58,
      textbookPage: 2,
      keywords: ["rational", "standard form", "p/q", "co-prime", "denominator"],
      misconceptions: ["Zero is not a rational number.", "A negative denominator makes a number irrational."],
      diagram: "number-line",
    },
    {
      parent: "LO-8-MATH-01-01",
      concept: "Rational numbers on the number line",
      statement: "Plots a given rational number on the number line and reads off the number shown at a point.",
      definition:
        "Between two integers the unit interval is divided into as many equal parts as the denominator, and that many parts are counted from the anchor point. For a number greater than one, locate it between the two integers that contain it first.",
      kind: "skill",
      sourceStatement: "Locates numbers on the number line and interprets position.",
      sourceDoc: ELEMENTARY,
      sourcePage: 58,
      textbookPage: 5,
      keywords: ["number line", "plot", "between", "interval"],
      misconceptions: ["11/4 is marked before 2 because 11/4 = 2.75 is close to 2.", "Negative rationals go to the right of zero."],
      diagram: "number-line",
    },
    {
      parent: "LO-8-MATH-01-01",
      concept: "Properties of operations",
      statement:
        "Uses closure, commutativity, associativity and distributivity to decide whether a statement about rational numbers is true.",
      definition:
        "Rational numbers are closed under addition, subtraction and multiplication. Subtraction and division are not commutative; addition and multiplication are. Distribution connects multiplication over addition, and every non-zero rational number has a reciprocal.",
      kind: "concept",
      sourceStatement: "Uses properties of operations to simplify and justify calculations.",
      sourceDoc: ELEMENTARY,
      sourcePage: 59,
      textbookPage: 8,
      keywords: ["closure", "commutative", "associative", "distributive", "reciprocal"],
      misconceptions: ["Rational numbers are commutative under subtraction.", "Zero has a reciprocal."],
      diagram: "none",
    },
    {
      parent: "LO-8-MATH-01-01",
      concept: "Operations on rational numbers",
      statement:
        "Adds, subtracts, multiplies and divides rational numbers, including numbers with unlike denominators and negative signs.",
      definition:
        "To add or subtract rational numbers, first write them with a common denominator — the LCM of the denominators — and then combine the numerators. To multiply, multiply numerator with numerator and denominator with denominator; to divide by a fraction, multiply by its reciprocal. Simplify the result to standard form.",
      kind: "skill",
      sourceStatement: "Performs the four operations on rational numbers accurately and simplifies results.",
      sourceDoc: ELEMENTARY,
      sourcePage: 59,
      textbookPage: 9,
      keywords: ["add", "subtract", "multiply", "divide", "common denominator", "LCM", "reciprocal"],
      misconceptions: [
        "Adding numerators and denominators separately (2/5 + 3/7 = 5/12).",
        "Forgetting to write the answer in standard form after dividing.",
      ],
      diagram: "none",
    },
    {
      parent: "LO-8-MATH-01-01",
      concept: "Rational numbers between two numbers",
      statement: "Finds a rational number lying between any two given rational numbers and explains why there are infinitely many.",
      definition:
        "The mean of two rational numbers always lies between them, and repeating the process produces as many rational numbers as required — so there are infinitely many rational numbers between any two.",
      kind: "application",
      sourceStatement: "Finds numbers between two given numbers using a suitable method.",
      sourceDoc: ELEMENTARY,
      sourcePage: 59,
      textbookPage: 12,
      keywords: ["between", "mean", "infinitely many"],
      misconceptions: ["There is no number between two consecutive rationals."],
      diagram: "none",
    },
  ],

  "10-science-1": [
    {
      parent: null,
      concept: "Chemical equations and balancing",
      statement: "Writes a balanced chemical equation for a described reaction and justifies balancing using conservation of mass.",
      definition:
        "A chemical equation is written with reactants on the left and products on the right. Balancing means the number of atoms of each element is the same on both sides, because atoms are neither created nor destroyed.",
      kind: "skill",
      sourceStatement: "Represents chemical changes using symbols, formulae and equations.",
      sourceDoc: SECONDARY,
      sourcePage: 74,
      textbookPage: 1,
      keywords: ["equation", "balanced", "conservation of mass", "reactant", "product"],
      misconceptions: ["Changing a subscript balances an equation.", "An unbalanced equation still obeys conservation of mass."],
      diagram: "none",
    },
    {
      parent: "LO-10-SCI-01-01",
      concept: "Types of chemical reactions",
      statement: "Classifies a reaction as combination, decomposition, displacement or double displacement and gives an example.",
      definition:
        "Combination joins reactants into one product; decomposition splits one reactant into two or more; displacement has a more reactive element replace a less reactive one; double displacement exchanges ions, often forming a precipitate.",
      kind: "concept",
      sourceStatement: "Classifies changes and reactions and explains them with examples.",
      sourceDoc: SECONDARY,
      sourcePage: 74,
      textbookPage: 3,
      keywords: ["combination", "decomposition", "displacement", "double displacement", "precipitate"],
      misconceptions: ["CaO + H₂O → Ca(OH)₂ is a displacement reaction.", "Every reaction that gives off bubbles is a decomposition."],
      diagram: "none",
    },
    {
      parent: "LO-10-SCI-01-02",
      concept: "Exothermic and endothermic changes",
      statement: "Decides whether a given reaction is exothermic or endothermic and explains the role of energy.",
      definition:
        "A reaction that releases heat is exothermic (burning of natural gas, respiration); one that absorbs energy is endothermic (photosynthesis, decomposition of calcium carbonate).",
      kind: "concept",
      sourceStatement: "Explains changes in terms of energy transfer to or from the surroundings.",
      sourceDoc: SECONDARY,
      sourcePage: 74,
      textbookPage: 8,
      keywords: ["exothermic", "endothermic", "heat released", "energy absorbed"],
      misconceptions: ["Respiration is endothermic because it happens in the body.", "All decomposition reactions are exothermic."],
      diagram: "none",
    },
    {
      parent: "LO-10-SCI-01-01",
      concept: "Oxidation, reduction and redox",
      statement: "Identifies the substance oxidised and the substance reduced in a given reaction.",
      definition:
        "Oxidation is the gain of oxygen or loss of hydrogen; reduction is the loss of oxygen or gain of hydrogen. Both happen together in a redox reaction — what is oxidised gains oxygen at the expense of what is reduced.",
      kind: "concept",
      sourceStatement: "Explains a chemical change in terms of the substances gaining and losing oxygen.",
      sourceDoc: SECONDARY,
      sourcePage: 75,
      textbookPage: 10,
      keywords: ["oxidation", "reduction", "redox", "oxidised", "reduced"],
      misconceptions: ["Only the substance that gains oxygen is involved.", "Hydrogen is reduced in CuO + H₂ → Cu + H₂O."],
      diagram: "none",
    },
    {
      parent: "LO-10-SCI-01-01",
      concept: "Corrosion and rancidity",
      statement: "Explains corrosion and rancidity as oxidation, and suggests a practical way to slow each.",
      definition:
        "Corrosion is the slow oxidation of a metal surface by air and moisture (rusting of iron, green coating on copper). Rancidity is the oxidation of fats and oils in food, prevented by packing in nitrogen, refrigeration, or adding antioxidants.",
      kind: "application",
      sourceStatement: "Connects oxidation to everyday damage of materials and food, and suggests prevention.",
      sourceDoc: SECONDARY,
      sourcePage: 75,
      textbookPage: 13,
      keywords: ["corrosion", "rancidity", "rusting", "antioxidant", "nitrogen flushing"],
      misconceptions: ["Rancidity is caused by bacteria only.", "Rusting of iron does not involve oxygen."],
      diagram: "none",
    },
  ],

  "10-mathematics-1": [
    {
      parent: null,
      concept: "Fundamental theorem of arithmetic",
      statement: "Expresses a composite number as a product of primes and uses the factorisation to find HCF and LCM.",
      definition:
        "Every composite number can be written as a product of primes, and that factorisation is unique apart from order. The HCF is the product of the smallest power of each common prime; the LCM is the product of the greatest power of every prime.",
      kind: "concept",
      sourceStatement: "Uses prime factorisation to find HCF and LCM and applies it to problems.",
      sourceDoc: SECONDARY,
      sourcePage: 58,
      textbookPage: 2,
      keywords: ["prime factorisation", "HCF", "LCM", "unique"],
      misconceptions: ["1 is a prime number.", "LCM is always the product of the two numbers."],
      diagram: "none",
    },
    {
      parent: "LO-10-MATH-01-01",
      concept: "Euclid's division lemma and algorithm",
      statement: "Applies Euclid's division algorithm step by step to find the HCF of two positive integers.",
      definition:
        "For positive integers a and b there exist unique integers q and r with a = bq + r and 0 ≤ r < b. Replacing (a, b) by (b, r) and repeating until r is zero leaves the HCF as the last non-zero remainder.",
      kind: "skill",
      sourceStatement: "Follows and explains the steps of an algorithm to reach a general result.",
      sourceDoc: SECONDARY,
      sourcePage: 58,
      textbookPage: 4,
      keywords: ["Euclid", "division lemma", "algorithm", "remainder", "HCF"],
      misconceptions: ["The remainder may be larger than the divisor.", "The HCF is the last quotient."],
      diagram: "none",
    },
    {
      parent: "LO-10-MATH-01-01",
      concept: "Testing a number for irrationality",
      statement: "Proves that a given number such as √2, √3 or √5 is irrational using contradiction.",
      definition:
        "Assume the number is rational, write it as a/b in lowest terms, and derive that a common prime divides both a and b — contradicting coprimality. The theorem is then used to show that sums such as 2 + √5 are irrational too.",
      kind: "application",
      sourceStatement: "Uses proof by contradiction to establish a mathematical statement.",
      sourceDoc: SECONDARY,
      sourcePage: 59,
      textbookPage: 8,
      keywords: ["irrational", "√2", "√3", "contradiction", "coprime", "proof"],
      misconceptions: ["Only the square root of 2 is irrational.", "The sum of a rational and an irrational may be rational."],
      diagram: "none",
    },
    {
      parent: "LO-10-MATH-01-01",
      concept: "Terminating and non-terminating decimals",
      statement: "Decides from the denominator whether a rational number has a terminating decimal expansion.",
      definition:
        "A rational number p/q in lowest terms has a terminating decimal expansion exactly when the prime factorisation of q is of the form 2ⁿ5ᵐ. Otherwise, the expansion is non-terminating and repeating.",
      kind: "concept",
      sourceStatement: "Predicts the decimal form of a rational number from its denominator.",
      sourceDoc: SECONDARY,
      sourcePage: 59,
      textbookPage: 11,
      keywords: ["terminating", "non-terminating", "repeating", "2ⁿ5ᵐ", "decimal expansion"],
      misconceptions: ["Any denominator gives a terminating decimal.", "1/7 terminates after seven digits."],
      diagram: "none",
    },
  ],

  "9-mathematics-1": [
    {
      parent: null,
      concept: "Cartesian system and quadrants",
      statement: "Names the axes, the origin and the four quadrants of the Cartesian plane.",
      definition:
        "The horizontal number line is the x-axis and the vertical one is the y-axis; they meet at the origin (0, 0) and divide the plane into four quadrants numbered counter-clockwise from the first.",
      kind: "concept",
      sourceStatement: "Identifies and describes position using an ordered pair of coordinates.",
      sourceDoc: SECONDARY,
      sourcePage: 60,
      textbookPage: 2,
      keywords: ["x-axis", "y-axis", "origin", "quadrant", "Cartesian"],
      misconceptions: ["The axes are the first quadrant.", "Quadrants are numbered clockwise."],
      diagram: "none",
    },
    {
      parent: "LO-9-MATH-01-01",
      concept: "Coordinates and signs",
      statement: "Reads the abscissa and ordinate of a point and determines the quadrant from the signs of the coordinates.",
      definition:
        "In the pair (x, y), x is the abscissa and y is the ordinate. Quadrant I is (+, +), II is (−, +), III is (−, −) and IV is (+, −); every point on the x-axis has ordinate 0 and every point on the y-axis has abscissa 0.",
      kind: "skill",
      sourceStatement: "Uses the signs of coordinates to locate a point in the plane.",
      sourceDoc: SECONDARY,
      sourcePage: 60,
      textbookPage: 4,
      keywords: ["abscissa", "ordinate", "quadrant", "signs"],
      misconceptions: ["(3, −4) lies in the second quadrant.", "Abscissa means the y-coordinate."],
      diagram: "none",
    },
    {
      parent: "LO-9-MATH-01-01",
      concept: "Distance from the axes",
      statement: "Finds the perpendicular distance of a point from the x-axis and from the y-axis.",
      definition:
        "The perpendicular distance of a point from the x-axis is the magnitude of its y-coordinate, and its distance from the y-axis is the magnitude of its x-coordinate. Distance is never negative.",
      kind: "application",
      sourceStatement: "Measures and reports lengths using coordinates in a plane.",
      sourceDoc: SECONDARY,
      sourcePage: 60,
      textbookPage: 6,
      keywords: ["distance", "perpendicular", "axis", "magnitude"],
      misconceptions: ["Distance from the y-axis of (−3, −6) is −3 units.", "Distance from the x-axis uses the x-coordinate."],
      diagram: "none",
    },
  ],

  "6-science-4": [
    {
      parent: null,
      concept: "Magnetic and non-magnetic materials",
      statement: "Tests materials around them and sorts them into magnetic and non-magnetic.",
      definition:
        "Iron, cobalt, nickel and some of their alloys are attracted by a magnet and are called magnetic materials. Wood, plastic, glass and paper are not attracted and are non-magnetic.",
      kind: "concept",
      sourceStatement: "Classifies objects on the basis of a property observed through a simple test.",
      sourceDoc: ELEMENTARY,
      sourcePage: 47,
      textbookPage: 42,
      keywords: ["magnetic", "non-magnetic", "iron", "nickel", "cobalt"],
      misconceptions: ["All metals are attracted by a magnet.", "A magnet attracts every object that is heavy."],
      diagram: "none",
    },
    {
      parent: "LO-6-SCI-04-01",
      concept: "Poles and their interaction",
      statement: "Shows that a magnet has two poles and that like poles repel while unlike poles attract.",
      definition:
        "Every magnet, however small, has a north pole and a south pole. Like poles repel each other and unlike poles attract; the attraction is strongest at the poles. A single isolated pole has never been found.",
      kind: "concept",
      sourceStatement: "Observes the interaction between magnets and explains the pattern seen.",
      sourceDoc: ELEMENTARY,
      sourcePage: 47,
      textbookPage: 44,
      keywords: ["poles", "attract", "repel", "north", "south", "lodestone"],
      misconceptions: ["A broken magnet has only one pole.", "Like poles attract."],
      diagram: "none",
    },
    {
      parent: "LO-6-SCI-04-01",
      concept: "The magnet as a compass",
      statement: "Uses a freely suspended magnet to show that a magnet always settles in the north–south direction and explains the compass.",
      definition:
        "A freely suspended bar magnet always comes to rest pointing north–south because the Earth itself behaves like a huge magnet. A compass uses the same property to show direction.",
      kind: "application",
      sourceStatement: "Uses a scientific device to find direction and explains the principle behind it.",
      sourceDoc: ELEMENTARY,
      sourcePage: 47,
      textbookPage: 46,
      keywords: ["compass", "north-south", "freely suspended", "direction", "Earth"],
      misconceptions: ["A compass points to the nearest magnet.", "A compass works because of gravity."],
      diagram: "none",
    },
    {
      parent: "LO-6-SCI-04-02",
      concept: "Caring for magnets",
      statement: "Describes ways of storing magnets safely and the practices that destroy magnetism.",
      definition:
        "Heating a magnet strongly, hammering it, or dropping it repeatedly destroys its magnetism. Magnets are kept in pairs with opposite poles together and with an iron keeper across the poles so that their magnetism lasts.",
      kind: "skill",
      sourceStatement: "Takes care of the apparatus used during an investigation.",
      sourceDoc: ELEMENTARY,
      sourcePage: 48,
      textbookPage: 48,
      keywords: ["keeper", "store magnets", "destroy magnetism", "heating", "hammering"],
      misconceptions: ["A magnet loses magnetism when kept with an iron piece.", "Dropping a magnet makes it stronger."],
      diagram: "none",
    },
  ],

  "7-science-9": [
    {
      parent: null,
      concept: "Heat, temperature and the thermometer",
      statement: "Measures temperature with a clinical and a laboratory thermometer and states the SI unit of temperature.",
      definition:
        "Temperature is a measure of how hot or cold a body is, measured with a thermometer. The SI unit is the kelvin (K); a clinical thermometer reads 35 °C to 42 °C, while a laboratory thermometer is used over a wider range.",
      kind: "skill",
      sourceStatement: "Uses appropriate instruments and units to measure and report a physical quantity.",
      sourceDoc: ELEMENTARY,
      sourcePage: 55,
      textbookPage: 2,
      keywords: ["temperature", "thermometer", "kelvin", "clinical", "laboratory", "fixed points"],
      misconceptions: ["Temperature and heat are the same thing.", "A clinical thermometer can measure the temperature of boiling water."],
      diagram: "none",
    },
    {
      parent: "LO-7-SCI-09-01",
      concept: "Heat transfer: conduction, convection, radiation",
      statement: "Explains how heat travels by conduction, convection and radiation with an everyday example of each.",
      definition:
        "In conduction heat moves through a solid, usually a metal, without the particles moving from place. In convection it moves with the heated liquid or gas itself, because warmer portions are less dense and rise. Radiation needs no medium at all — that is how the Sun's heat reaches the Earth.",
      kind: "concept",
      sourceStatement: "Explains processes of transfer of heat with examples from daily life.",
      sourceDoc: ELEMENTARY,
      sourcePage: 55,
      textbookPage: 6,
      keywords: ["conduction", "convection", "radiation", "vacuum", "better conductor"],
      misconceptions: ["Radiation cannot pass through vacuum.", "Convection happens in solids."],
      diagram: "none",
    },
    {
      parent: "LO-7-SCI-09-02",
      concept: "Activity of surfaces in absorbing heat",
      statement: "Predicts which surface gets hot faster and justifies the choice of colour for clothing and cookware.",
      definition:
        "Dark, dull surfaces absorb heat better and light, shiny surfaces reflect it. That is why we wear light clothes in summer and dark clothes in winter, and why cooking vessels are often blackened from below.",
      kind: "application",
      sourceStatement: "Relates the properties of materials to their use in daily life.",
      sourceDoc: ELEMENTARY,
      sourcePage: 56,
      textbookPage: 10,
      keywords: ["black", "shiny", "absorb", "reflect", "clothes"],
      misconceptions: ["White surfaces absorb more heat than black ones."],
      diagram: "none",
    },
    {
      parent: "LO-7-SCI-09-02",
      concept: "Temperature conversion",
      statement: "Converts a given Celsius temperature into Celsius, or between Celsius and Kelvin, correctly.",
      definition:
        "Celsius and Fahrenheit are used in daily life and Kelvin is used in science, so conversions are needed: K = °C + 273.15. The two fixed points of a Celsius thermometer are 0 °C for melting ice and 100 °C for boiling water.",
      kind: "skill",
      sourceStatement: "Makes simple numerical estimates and conversions and checks their reasonableness.",
      sourceDoc: ELEMENTARY,
      sourcePage: 56,
      textbookPage: 4,
      keywords: ["kelvin", "celsius", "conversion", "fixed points", "273"],
      misconceptions: ["0 °C is the same as 0 K.", "Boiling water is 100 K."],
      diagram: "none",
    },
  ],
};

function build(key: string, drafts: Draft[]): LearningOutcome[] {
  const [classNo, subjectSlug, chapterNum] = key.split("-");
  return drafts.map((draft, index) => ({
    ...draft,
    code: outcomeCode(Number(classNo), subjectSlug, Number(chapterNum), index + 1),
    classNo: Number(classNo),
    subjectSlug,
    chapterNum: Number(chapterNum),
    order: index + 1,
  }));
}

/** Every curated outcome, flat. */
export const LEARNING_OUTCOMES: LearningOutcome[] = Object.entries(CURATED).flatMap(
  ([key, drafts]) => build(key, drafts),
);

const BY_CHAPTER = new Map<string, LearningOutcome[]>();
for (const outcome of LEARNING_OUTCOMES) {
  const key = `${outcome.classNo}-${outcome.subjectSlug}-${outcome.chapterNum}`;
  const list = BY_CHAPTER.get(key) ?? [];
  list.push(outcome);
  BY_CHAPTER.set(key, list);
}

export function chapterOutcomeKey(
  classNo: number,
  subjectSlug: string,
  chapterNum: number,
): string {
  return `${classNo}-${subjectSlug}-${chapterNum}`;
}

/**
 * Curated outcomes for a chapter. Returns an empty array when the chapter map
 * has not been curated yet — the UI then says "map pending faculty sign-off"
 * rather than showing invented outcomes.
 */
export function outcomesForChapter(
  classNo: number,
  subjectSlug: string,
  chapterNum: number,
): LearningOutcome[] {
  return BY_CHAPTER.get(chapterOutcomeKey(classNo, subjectSlug, chapterNum)) ?? [];
}

export function findOutcome(code: string): LearningOutcome | undefined {
  return LEARNING_OUTCOMES.find((outcome) => outcome.code === code);
}

/** Depth-first concept tree for a chapter (roots first, children nested). */
export type OutcomeNode = { outcome: LearningOutcome; children: OutcomeNode[] };

export function outcomeTree(outcomes: LearningOutcome[]): OutcomeNode[] {
  const byCode = new Map(outcomes.map((o) => [o.code, o]));
  const roots: OutcomeNode[] = [];
  const nodes = new Map<string, OutcomeNode>();
  for (const outcome of outcomes) nodes.set(outcome.code, { outcome, children: [] });
  for (const outcome of outcomes) {
    const node = nodes.get(outcome.code)!;
    const parent = outcome.parent ? nodes.get(outcome.parent) : undefined;
    if (parent && byCode.has(outcome.parent!)) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: OutcomeNode[]) => {
    list.sort((a, b) => a.outcome.order - b.outcome.order);
    list.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

/** Chapters that have a curated LO map — the coverage number shown in the UI. */
export function curatedChapterKeys(): string[] {
  return [...BY_CHAPTER.keys()].sort();
}
