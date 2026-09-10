/**
 * Question → learning-outcome mapping for the seeded question banks.
 *
 * Kept as an index-aligned list next to the bank it describes (rather than a
 * field on every question) so a teacher can read the mapping as a column beside
 * the questions and audit it in one screen. `traps` names the wrong option that
 * carries the classic misconception — that name is what the reteach panel shows
 * ("19 students chose 'Boiling point'"), which is the explainable part of the
 * heatmap.
 *
 * Tagging is by normalised question text, so re-seeding or reordering the bank
 * cannot silently mis-tag a question: an unmatched question simply stays
 * untagged and never moves a mastery colour.
 */

import {
  chemicalReactionsMcqs,
  combustionMcqs,
  coordinatesMcqs,
  heatMcqs,
  magnetsMcqs,
  rationalMcqs,
  realNumbersMcqs,
  type MCQSeed,
} from "./seed-content";

export type OutcomeTag = { lo: string | null; trap?: { index: number; name: string } };

export type TaggedBank = {
  chapterKey: string;
  bank: MCQSeed[];
  tags: OutcomeTag[];
};

const t = (index: number, name: string) => ({ index, name });

export const TAGGED_BANKS: TaggedBank[] = [
  {
    chapterKey: "8-science-6",
    bank: combustionMcqs,
    tags: [
      { lo: "LO-8-SCI-06-01" },
      {
        lo: "LO-8-SCI-06-03",
        trap: t(1, "Thinks the ignition temperature is the boiling point of the substance"),
      },
      { lo: "LO-8-SCI-06-01" },
      {
        lo: "LO-8-SCI-06-02",
        trap: t(1, "Confuses smouldering with spontaneous combustion"),
      },
      {
        lo: "LO-8-SCI-06-04",
        trap: t(0, "Thinks the innermost zone is the hottest because it is nearest the wick"),
      },
      { lo: "LO-8-SCI-06-04" },
      { lo: "LO-8-SCI-06-01" },
      {
        lo: "LO-8-SCI-06-01",
        trap: t(0, "Treats a dry matchstick as non-combustible"),
      },
      {
        lo: "LO-8-SCI-06-03",
        trap: t(2, "Thinks rubbing a matchstick produces oxygen instead of heat"),
      },
      { lo: "LO-8-SCI-06-05" },
      { lo: "LO-8-SCI-06-05" },
      { lo: "LO-8-SCI-06-04" },
      {
        lo: "LO-8-SCI-06-06",
        trap: t(1, "Writes the calorific value unit as kJ instead of kJ/kg"),
      },
      { lo: "LO-8-SCI-06-06" },
      { lo: "LO-8-SCI-06-06" },
      {
        lo: "LO-8-SCI-06-06",
        trap: t(0, "Picks coal because it is the most familiar fuel"),
      },
      { lo: "LO-8-SCI-06-06" },
      {
        lo: "LO-8-SCI-06-05",
        trap: t(0, "Chooses hydrogen because it is believed to be the cheapest fuel"),
      },
      {
        lo: "LO-8-SCI-06-07",
        trap: t(1, "Thinks nitrogen, not carbon dioxide, cuts off the air supply"),
      },
      {
        lo: "LO-8-SCI-06-03",
        trap: t(0, "Thinks a bigger piece of wood has a higher ignition temperature"),
      },
    ],
  },
  {
    chapterKey: "8-mathematics-1",
    bank: rationalMcqs,
    tags: [
      { lo: "LO-8-MATH-01-01" },
      {
        lo: "LO-8-MATH-01-01",
        trap: t(0, "Treats 5/0 as a rational number instead of an undefined quantity"),
      },
      { lo: "LO-8-MATH-01-01" },
      { lo: "LO-8-MATH-01-04" },
      {
        lo: "LO-8-MATH-01-01",
        trap: t(3, "Moves the sign to the numerator but does not simplify to 2/3"),
      },
      { lo: "LO-8-MATH-01-01" },
      {
        lo: "LO-8-MATH-01-05",
        trap: t(0, "Adds numerators and denominators separately (2/5 + 3/7 = 5/12)"),
      },
      { lo: "LO-8-MATH-01-05" },
      { lo: "LO-8-MATH-01-05" },
      { lo: "LO-8-MATH-01-03" },
      {
        lo: "LO-8-MATH-01-03",
        trap: t(0, "Believes zero has a reciprocal"),
      },
      { lo: "LO-8-MATH-01-03" },
      {
        lo: "LO-8-MATH-01-03",
        trap: t(0, "Does not distinguish commutativity from associativity"),
      },
      {
        lo: "LO-8-MATH-01-03",
        trap: t(2, "Believes subtraction is commutative for rational numbers"),
      },
      {
        lo: "LO-8-MATH-01-04",
        trap: t(2, "Takes the mean of the numerators without a common denominator"),
      },
      { lo: "LO-8-MATH-01-04" },
    ],
  },
  {
    chapterKey: "10-science-1",
    bank: chemicalReactionsMcqs,
    tags: [
      { lo: "LO-10-SCI-01-02" },
      {
        lo: "LO-10-SCI-01-02",
        trap: t(3, "Reads an acid–metal reaction as double displacement"),
      },
      { lo: "LO-10-SCI-01-02" },
      { lo: "LO-10-SCI-01-03" },
      { lo: "LO-10-SCI-01-03" },
      {
        lo: "LO-10-SCI-01-03",
        trap: t(0, "Thinks respiration absorbs heat because it happens inside the body"),
      },
      { lo: "LO-10-SCI-01-04" },
      { lo: "LO-10-SCI-01-02" },
      { lo: "LO-10-SCI-01-02" },
      {
        lo: "LO-10-SCI-01-04",
        trap: t(1, "Identifies hydrogen as reduced because it is a reactant"),
      },
      { lo: "LO-10-SCI-01-01" },
      { lo: "LO-10-SCI-01-05" },
    ],
  },
  {
    chapterKey: "10-mathematics-1",
    bank: realNumbersMcqs,
    tags: [
      { lo: "LO-10-MATH-01-01" },
      { lo: "LO-10-MATH-01-01" },
      { lo: "LO-10-MATH-01-01" },
      { lo: "LO-10-MATH-01-02" },
      { lo: "LO-10-MATH-01-03" },
      { lo: "LO-10-MATH-01-04" },
      {
        lo: "LO-10-MATH-01-01",
        trap: t(1, "Includes 1 in the prime factorisation"),
      },
      { lo: "LO-10-MATH-01-01" },
      {
        lo: "LO-10-MATH-01-03",
        trap: t(0, "Assumes every square root is rational"),
      },
      { lo: "LO-10-MATH-01-01" },
      { lo: "LO-10-MATH-01-04" },
      { lo: "LO-10-MATH-01-02" },
    ],
  },
  {
    chapterKey: "9-mathematics-1",
    bank: coordinatesMcqs,
    tags: [
      {
        lo: "LO-9-MATH-01-02",
        trap: t(1, "Counts quadrants clockwise from the first"),
      },
      { lo: "LO-9-MATH-01-01" },
      { lo: "LO-9-MATH-01-02" },
      {
        lo: "LO-9-MATH-01-03",
        trap: t(0, "Uses the x-coordinate for distance from the x-axis"),
      },
      {
        lo: "LO-9-MATH-01-03",
        trap: t(1, "Gives the distance as −3 units because the coordinate is negative"),
      },
      { lo: "LO-9-MATH-01-02" },
      { lo: "LO-9-MATH-01-02" },
      { lo: "LO-9-MATH-01-02" },
      { lo: "LO-9-MATH-01-01" },
      { lo: "LO-9-MATH-01-03" },
    ],
  },
  {
    chapterKey: "6-science-4",
    bank: magnetsMcqs,
    tags: [
      { lo: "LO-6-SCI-04-02" },
      { lo: "LO-6-SCI-04-02" },
      {
        lo: "LO-6-SCI-04-02",
        trap: t(0, "Says like poles attract each other"),
      },
      { lo: "LO-6-SCI-04-02" },
      {
        lo: "LO-6-SCI-04-01",
        trap: t(1, "Believes every metal is attracted by a magnet"),
      },
      { lo: "LO-6-SCI-04-01" },
      { lo: "LO-6-SCI-04-02" },
      { lo: "LO-6-SCI-04-03" },
      {
        lo: "LO-6-SCI-04-04",
        trap: t(2, "Thinks an iron keeper destroys magnetism"),
      },
      { lo: "LO-6-SCI-04-03" },
    ],
  },
  {
    chapterKey: "7-science-9",
    bank: heatMcqs,
    tags: [
      { lo: "LO-7-SCI-09-01" },
      {
        lo: "LO-7-SCI-09-01",
        trap: t(0, "Names the degree Celsius as the SI unit"),
      },
      { lo: "LO-7-SCI-09-01" },
      { lo: "LO-7-SCI-09-04" },
      { lo: "LO-7-SCI-09-04" },
      {
        lo: "LO-7-SCI-09-04",
        trap: t(1, "Rounds the conversion instead of using F = 9/5 C + 32"),
      },
      { lo: "LO-7-SCI-09-02" },
      { lo: "LO-7-SCI-09-02" },
      { lo: "LO-7-SCI-09-02" },
      {
        lo: "LO-7-SCI-09-02",
        trap: t(0, "Chooses conduction, forgetting that space is a vacuum"),
      },
      { lo: "LO-7-SCI-09-03" },
      { lo: "LO-7-SCI-09-02" },
      { lo: "LO-7-SCI-09-02" },
    ],
  },
];

/** Normalised text → tag, used to name the misconception behind a wrong answer. */
export function tagIndex(): Map<string, OutcomeTag & { chapterKey: string }> {
  const map = new Map<string, OutcomeTag & { chapterKey: string }>();
  for (const bank of TAGGED_BANKS) {
    bank.bank.forEach((question, index) => {
      const tag = bank.tags[index];
      if (!tag) return;
      map.set(normalizeQuestion(question.q), { ...tag, chapterKey: bank.chapterKey });
    });
  }
  return map;
}

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
