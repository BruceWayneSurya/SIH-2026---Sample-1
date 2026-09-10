/**
 * Scope guard — the polite refusal.
 *
 * A tutor that answers anything is a tutor a parent cannot trust. This module
 * decides, without calling a model, whether a question belongs to the chapter
 * the learner is sitting in. Two cases are handled:
 *
 *   • above_class  — the topic is taught in a higher class
 *                    ("solve 2x² − 5x + 3 = 0" in Class 8)
 *   • other_subject — same class, different subject/chapter
 *
 * The refusal is a *sentence with a boundary in it* ("Class 8 stops at …"),
 * which is what teachers and parents actually ask for, plus a suggestion drawn
 * from the chapter's own learning outcomes so the learner is never left stuck.
 */

import type { LearningOutcome } from "../outcomes/taxonomy";

export type ScopeStatus = "in_scope" | "above_class" | "other_subject";

export type ScopeVerdict = {
  status: ScopeStatus;
  topic?: string;
  topicClass?: number;
  topicSubject?: string;
  message: string;
  suggestion: string;
};

export type ScopeContext = {
  classNo: number;
  subjectSlug: string;
  subjectName: string;
  chapterTitle: string;
  outcomes: LearningOutcome[];
};

/** Topic → the class in which NCERT introduces it. Kept short and auditable. */
const TOPIC_CLASSES: { topic: string; classNo: number; subject: string; aliases: RegExp }[] = [
  { topic: "Trigonometry", classNo: 10, subject: "Mathematics", aliases: /\btrigonometry|sin\b|cos\b|tan\b|theta/i },
  { topic: "Quadratic equations", classNo: 10, subject: "Mathematics", aliases: /\bquadratic|x\s*\^\s*2\s*[-+]\s*\d|discriminant/i },
  { topic: "Arithmetic progressions", classNo: 10, subject: "Mathematics", aliases: /\barithmetic progression|\bA\.?P\.?\b|\bnth term\b/i },
  { topic: "Coordinate geometry", classNo: 10, subject: "Mathematics", aliases: /\bcoordinate geometry|distance formula|section formula/i },
  { topic: "Surface areas and volumes", classNo: 10, subject: "Mathematics", aliases: /\bsurface area of (a )?(sphere|cone|cylinder)|frustum/i },
  { topic: "Calculus (limits, derivatives)", classNo: 11, subject: "Mathematics", aliases: /\bcalculus|derivative|differentiat|integration|limit of a function/i },
  { topic: "Vectors and matrices", classNo: 11, subject: "Mathematics", aliases: /\bvector\b|\bmatrix\b|matrices|determinant/i },
  { topic: "Probability (theorems)", classNo: 11, subject: "Mathematics", aliases: /\bprobability of\b.*\bconditional|bayes/i },
  { topic: "Sets and relations", classNo: 11, subject: "Mathematics", aliases: /\bset theory|cartesian product of sets|equivalence relation/i },
  { topic: "Laws of motion", classNo: 11, subject: "Science", aliases: /\bnewton'?s (first|second|third) law|laws of motion|f\s*=\s*ma\b/i },
  { topic: "Thermodynamics", classNo: 11, subject: "Science", aliases: /\bthermodynamic|entropy|first law of thermo/i },
  { topic: "Chemical bonding", classNo: 11, subject: "Science", aliases: /\bchemical bonding|octet|hybridis|hybridiz|valence bond/i },
  { topic: "Periodic classification", classNo: 10, subject: "Science", aliases: /\bperiodic table|periodic classification|mendeleev/i },
  { topic: "Organic chemistry", classNo: 11, subject: "Science", aliases: /\borganic chemistry|carbon compound|functional group|isomer/i },
  { topic: "Genetics and evolution", classNo: 10, subject: "Science", aliases: /\bheredity|evolution by natural selection|mendel|dna replicat/i },
  { topic: "Electromagnetism", classNo: 12, subject: "Science", aliases: /\belectromagnetic induction|faraday'?s law|lorentz force/i },
  { topic: "Optics (lens formula)", classNo: 10, subject: "Science", aliases: /\blens formula|refractive index|focal length/i },
  { topic: "Human physiology (advanced)", classNo: 11, subject: "Science", aliases: /\bnephron|neuron|human circulatory|photosynthesis light reaction/i },
];

/** Subject words that make "other subject, same class" answerable. */
const SUBJECT_WORDS: { slug: string; name: string; regex: RegExp }[] = [
  { slug: "science", name: "Science", regex: /\b(science|physics|chemistry|biology)\b/i },
  { slug: "mathematics", name: "Mathematics", regex: /\b(maths?|mathematics|algebra|geometry|arithmetic)\b/i },
  { slug: "social-science", name: "Social Science", regex: /\b(history|geography|civics|social science)\b/i },
  { slug: "english", name: "English", regex: /\b(english grammar|essay|comprehension passage)\b/i },
  { slug: "hindi", name: "Hindi", regex: /\b(hindi|व्याकरण)\b/i },
];

const NUMBER_WORDS: Record<string, number> = {
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function mentionedClass(query: string): number | null {
  const explicit = query.match(/\bclass\s*(\d{1,2})\b/i);
  if (explicit) return Number(explicit[1]);
  const roman = query.match(/\bclass\s*(vi{1,3}|iv|ix|x{1,2})\b/i);
  if (roman) {
    const map: Record<string, number> = {
      iv: 4,
      vi: 6,
      vii: 7,
      viii: 8,
      ix: 9,
      x: 10,
      xi: 11,
      xii: 12,
    };
    return map[roman[1].toLowerCase()] ?? null;
  }
  const word = query.match(/\bclass\s*(six|seven|eight|nine|ten|eleven|twelve)\b/i);
  return word ? (NUMBER_WORDS[word[1].toLowerCase()] ?? null) : null;
}

function suggestionFor(context: ScopeContext): string {
  const first = context.outcomes[0];
  if (!first) return `Ask me anything from ${context.chapterTitle}.`;
  return `Stay with me on this chapter: try “help me understand ${first.concept.toLowerCase()}”.`;
}

export function detectOutOfScope(
  query: string,
  context: ScopeContext,
): ScopeVerdict {
  const inScope: ScopeVerdict = {
    status: "in_scope",
    message: "",
    suggestion: "",
  };
  const text = query.trim();
  if (!text) return inScope;

  const named = mentionedClass(text);
  if (named !== null && named > context.classNo) {
    return {
      status: "above_class",
      topic: `Class ${named}`,
      topicClass: named,
      message: `That is a Class ${named} topic. I only teach Class ${context.classNo} here — and guessing ahead of your syllabus does more harm than good.`,
      suggestion: suggestionFor(context),
    };
  }

  for (const entry of TOPIC_CLASSES) {
    if (!entry.aliases.test(text)) continue;
    if (entry.classNo <= context.classNo) continue;
    return {
      status: "above_class",
      topic: entry.topic,
      topicClass: entry.classNo,
      topicSubject: entry.subject,
      message: `${entry.topic} is introduced in Class ${entry.classNo} ${entry.subject}. In Class ${context.classNo} ${context.subjectName} we stop before that, so I will not go further than your syllabus.`,
      suggestion: suggestionFor(context),
    };
  }

  const subject = SUBJECT_WORDS.find((entry) => entry.regex.test(text));
  if (subject && subject.slug !== context.subjectSlug) {
    return {
      status: "other_subject",
      topic: subject.name,
      topicSubject: subject.name,
      message: `That looks like a ${subject.name} question, and you are in ${context.subjectName} · ${context.chapterTitle}.`,
      suggestion: `Open your ${subject.name} chapters from the dashboard, or ask me about ${context.chapterTitle}.`,
    };
  }

  return inScope;
}

/** Opens each refusal with the same reassuring shape. */
export function refusalPrefix(verdict: ScopeVerdict): string {
  return verdict.status === "in_scope" ? "" : "Honest answer first: ";
}
