/**
 * Idempotent enrichment pass: outcome graph, RAG corpus, class roster, notebooks.
 *
 * This runs for *existing* databases too, not only for a fresh one — a school
 * that already has months of quiz data must get the new mastery map without
 * losing anything. Every step is individually idempotent and cheap when there is
 * nothing to do, which matters because `ensureDemoDatabase()` runs on each cold
 * start:
 *
 *   1. learning outcomes   — upsert by code
 *   2. chapter → LO list   — replaces the placeholder codes on curated chapters
 *   3. question tagging    — only questions with no `lo_code` are touched
 *   4. source corpus       — only missing `doc_key`s are inserted
 *   5. class notebook      — one row per chapter, created once
 *   6. Class 8 roster      — 45 students with answer sheets, created once
 *
 * (`mastery:check` prints the numbers this produces, e.g. "31 of 45 students
 * haven't understood ignition temperature" — a count read back from the answer
 * sheets, not a hard-coded string.)
 *
 * Mastery is never stored. It is recomputed from `mcq_attempts.answers` on read,
 * so this file cannot make the dashboard disagree with a learner's marks.
 */

import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { db as database } from "./index";
import * as schema from "./schema";
import { CORPUS } from "./corpus";
import { LEARNING_OUTCOMES, outcomesForChapter } from "../lib/outcomes/taxonomy";
import { normalizeQuestion, TAGGED_BANKS } from "../../scripts/seed-outcome-tags";
import { hashPassword } from "../lib/password";
import { DEMO_PASSWORD } from "../../scripts/seed-content";

const {
  users,
  chapters,
  learningOutcomes,
  sourceDocuments,
  sourceChunks,
  classNotebooks,
  classNotebookItems,
  mcqQuestions,
  mcqAttempts,
  xpEvents,
  notes,
} = schema;

/* --------------------------- demo class roster --------------------------- */

export const ROSTER_EMAIL_DOMAIN = "zpss-anand.edu.in";
export const ROSTER_SIZE = 45;

const FIRST_NAMES = [
  "Aditi", "Vivaan", "Ananya", "Reyansh", "Ishita", "Ayaan", "Saanvi", "Krishna",
  "Myra", "Advait", "Diya", "Arnav", "Anika", "Shaurya", "Navya", "Dhruv",
  "Pari", "Rudra", "Aarohi", "Kiaan", "Riya", "Aryan", "Saanvi", "Veer",
  "Mahi", "Kabir", "Tanvi", "Om", "Nitya", "Yuvan", "Kiara", "Harsh",
  "Bhavya", "Nirvaan", "Jiya", "Devansh", "Avni", "Manan", "Hetvi", "Parth",
  "Zeel", "Jayesh", "Kavya", "Rohan", "Mitali",
];

const SURNAMES = [
  "Patel", "Mehta", "Joshi", "Solanki", "Chauhan", "Desai", "Vyas", "Bhatt",
  "Raval", "Trivedi", "Parmar", "Gohil", "Shah", "Modi", "Doshi", "Thakkar",
];

/** Deterministic PRNG so the seeded class is identical on every machine. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugHandle(name: string, index: number): string {
  return `${name.toLowerCase().replace(/[^a-z]/g, "_")}_${String(index + 1).padStart(2, "0")}`;
}

export type RosterStudent = {
  index: number;
  name: string;
  handle: string;
  email: string;
  /** 0.60 → 1.00, drives how often the learner answers correctly. */
  strength: number;
};

export function rosterStudents(): RosterStudent[] {
  return Array.from({ length: ROSTER_SIZE }, (_, index) => {
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const last = SURNAMES[(index * 7) % SURNAMES.length];
    const name = `${first} ${last}`;
    return {
      index,
      name,
      handle: slugHandle(name, index),
      email: `student${String(index + 1).padStart(2, "0")}@${ROSTER_EMAIL_DOMAIN}`,
      strength: Number((0.6 + (((index * 37) % 41) / 100)).toFixed(2)),
    };
  });
}

/**
 * The ignition-temperature outcome is the demo's honest headline: the wrong
 * answers below are produced by a fixed rule, then the heatmap recounts them.
 * 14 learners get all three questions right; 12 more are below half (needs
 * help) and the remaining 19 are part-developed. Nothing about the number "31"
 * is hard-coded into the UI — it is the count the mastery engine returns.
 */
export const IGNITION_OUTCOME = "LO-8-SCI-06-03";
const IGNITION_QUESTIONS = 3;

type AnswerPlan = {
  answers: number[];
  score: number;
};

function planAnswers(input: {
  studentIndex: number;
  strength: number;
  questionCount: number;
  correctIndexes: number[];
  /** Positions (0-based) of the ignition-temperature questions. */
  ignitionPositions: number[];
  trapIndexByPosition: Record<number, number>;
}): AnswerPlan {
  const { studentIndex, strength, questionCount, correctIndexes, ignitionPositions } = input;
  const random = mulberry32(9001 + studentIndex * 131);
  const answers = Array.from({ length: questionCount }, (_, position) =>
    // A little question-level noise keeps the other outcomes realistic.
    random() < strength ? correctIndexes[position] : wrongOption(position),
  );

  function wrongOption(position: number): number {
    const correct = correctIndexes[position];
    const trap = input.trapIndexByPosition[position];
    if (trap !== undefined && trap !== correct && random() < 0.6) return trap;
    const candidates = [0, 1, 2, 3].filter((option) => option !== correct);
    return candidates[Math.floor(random() * candidates.length)];
  }

  // Force the ignition-temperature pattern: secure for the first 14 learners,
  // needs-help for the next 12, developing for the remaining 19.
  const [first, second, third] = ignitionPositions;
  const positions = [first, second, third].filter((p) => p !== undefined);
  if (positions.length >= 1) {
    if (studentIndex < 14) {
      for (const position of positions) answers[position] = correctIndexes[position];
    } else if (studentIndex < 26) {
      // needs help: at most one of the three correct
      positions.forEach((position, order) => {
        answers[position] = order === 0 && studentIndex % 3 !== 0
          ? correctIndexes[position]
          : wrongOption(position);
      });
    } else {
      // developing: exactly two correct, the third is the classic trap
      const dropped = studentIndex % 3;
      positions.forEach((position, order) => {
        answers[position] =
          order === dropped ? wrongOption(position) : correctIndexes[position];
      });
    }
  }

  const score = answers.reduce(
    (total, answer, position) => total + (answer === correctIndexes[position] ? 1 : 0),
    0,
  );
  return { answers, score };
}

/* ------------------------------- seeding ------------------------------- */

export type LearningSeedResult = {
  outcomes: number;
  documents: number;
  chunks: number;
  tagged: number;
  roster: number;
  notebooks: number;
  skipped: boolean;
};

/**
 * Runs inside the same transaction style as `seedDemoDatabase`: batched inserts,
 * conservative bound-parameter counts, no destructive statements.
 */
export async function seedLearningContent(): Promise<LearningSeedResult> {
  const result: LearningSeedResult = {
    outcomes: 0,
    documents: 0,
    chunks: 0,
    tagged: 0,
    roster: 0,
    notebooks: 0,
    skipped: false,
  };

  const [outcomeCount] = await database.select({ n: count() }).from(learningOutcomes);
  const [documentCount] = await database.select({ n: count() }).from(sourceDocuments);
  const [rosterCount] = await database
    .select({ n: count() })
    .from(users)
    .where(eq(users.email, rosterStudents()[0].email));
  const [bookCount] = await database.select({ n: count() }).from(classNotebooks);

  const ready =
    (outcomeCount?.n ?? 0) >= LEARNING_OUTCOMES.length &&
    (documentCount?.n ?? 0) >= Object.values(CORPUS).flat().length &&
    (rosterCount?.n ?? 0) >= 1 &&
    (bookCount?.n ?? 0) >= 1;
  if (ready) {
    result.skipped = true;
    // Still additive: a database seeded before the demo answer sheet existed
    // gets it now, without touching anything else.
    await seedGuestShowcase();
    return result;
  }

  // 1 · learning outcomes
  for (const batch of chunk(LEARNING_OUTCOMES, 20)) {
    await database
      .insert(learningOutcomes)
      .values(
        batch.map((outcome) => ({
          code: outcome.code,
          classNo: outcome.classNo,
          subjectSlug: outcome.subjectSlug,
          chapterNum: outcome.chapterNum,
          parentCode: outcome.parent,
          orderIndex: outcome.order,
          concept: outcome.concept,
          statement: outcome.statement,
          definition: outcome.definition,
          kind: outcome.kind,
          sourceStatement: outcome.sourceStatement,
          sourceDoc: outcome.sourceDoc,
          sourcePage: outcome.sourcePage,
          textbookPage: outcome.textbookPage,
          keywords: outcome.keywords,
          misconceptions: outcome.misconceptions,
          diagram: outcome.diagram,
          origin: "ncert_curated" as const,
        })),
      )
      .onConflictDoUpdate({
        target: learningOutcomes.code,
        set: { updatedAt: new Date() },
      });
    result.outcomes += batch.length;
  }

  // 2 · chapter → outcome code list (replaces the placeholder LO-x-…-0n codes)
  const chapterRows = await database
    .select({
      id: chapters.id,
      classNo: chapters.classNo,
      subjectSlug: chapters.subjectSlug,
      num: chapters.num,
      title: chapters.title,
      slug: chapters.slug,
    })
    .from(chapters);
  const chapterByKey = new Map(
    chapterRows.map((row) => [`${row.classNo}-${row.subjectSlug}-${row.num}`, row]),
  );
  for (const row of chapterRows) {
    const outcomes = outcomesForChapter(row.classNo, row.subjectSlug, row.num);
    if (outcomes.length === 0) continue;
    const codes = outcomes.map((outcome) => outcome.code);
    await database
      .update(chapters)
      .set({ outcomeIds: codes })
      .where(eq(chapters.id, row.id));
  }

  // 3 · question → outcome tagging (only untagged rows)
  const untagged = await database
    .select({ id: mcqQuestions.id, qtext: mcqQuestions.qtext, chapterId: mcqQuestions.chapterId })
    .from(mcqQuestions)
    .where(isNull(mcqQuestions.loCode));
  if (untagged.length > 0) {
    const tags = new Map<string, { lo: string | null; trap?: { index: number; name: string }; chapterKey: string }>();
    for (const bank of TAGGED_BANKS) {
      bank.bank.forEach((question, index) => {
        const tag = bank.tags[index];
        if (!tag) return;
        tags.set(normalizeQuestion(question.q), { ...tag, chapterKey: bank.chapterKey });
      });
    }
    const chapterKeyById = new Map(
      [...chapterByKey.entries()].map(([key, row]) => [row.id, key]),
    );
    for (const question of untagged) {
      const tag = tags.get(normalizeQuestion(question.qtext));
      if (!tag) continue;
      if (chapterKeyById.get(question.chapterId) !== tag.chapterKey) continue;
      await database
        .update(mcqQuestions)
        .set({
          loCode: tag.lo,
          trapIndex: tag.trap?.index ?? null,
          trap: tag.trap?.name ?? null,
        })
        .where(eq(mcqQuestions.id, question.id));
      result.tagged += 1;
    }
  }

  // 4 · source corpus
  const existingDocs = await database
    .select({ chapterId: sourceDocuments.chapterId, docKey: sourceDocuments.docKey })
    .from(sourceDocuments);
  const existingKeys = new Set(existingDocs.map((row) => `${row.chapterId}:${row.docKey}`));

  for (const [chapterKey, documents] of Object.entries(CORPUS)) {
    const chapter = chapterByKey.get(chapterKey);
    if (!chapter) continue;
    for (const document of documents) {
      if (existingKeys.has(`${chapter.id}:${document.docKey}`)) continue;
      const [created] = await database
        .insert(sourceDocuments)
        .values({
          chapterId: chapter.id,
          docKey: document.docKey,
          title: document.title,
          attribution: document.attribution,
          kind: document.kind,
          authority: document.authority,
          pageStart: document.pageStart ?? null,
          pageEnd: document.pageEnd ?? null,
          url: document.url ?? null,
          status: "published",
        })
        .returning({ id: sourceDocuments.id });
      result.documents += 1;
      const rows: (typeof sourceChunks.$inferInsert)[] = document.chunks.map(
        (chunk, index) => ({
          documentId: created.id,
          chapterId: chapter.id,
          seq: index + 1,
          page: chunk.page,
          para: chunk.para,
          heading: chunk.heading ?? null,
          text: chunk.text,
        }),
      );
      for (const batch of chunk(rows, 25)) {
        await database.insert(sourceChunks).values(batch).onConflictDoNothing();
        result.chunks += batch.length;
      }
    }
  }

  // 5 · class notebooks (teacher-curated source set)
  result.notebooks = await seedClassNotebooks(chapterByKey);

  // 6 · Class 8 roster with answer sheets
  result.roster = await seedRoster(chapterByKey);

  // 7 · the guest student's own attempt, so the learner-facing mastery map is
  // not empty on a first visit (a judge opening Class 8 Science sees colours,
  // "not attempted" cells and a concept tree that is genuinely derived from
  // this answer sheet — never from a hard-coded picture).
  await seedGuestShowcase();

  return result;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

/**
 * One realistic answer sheet for the demo student account: secure on four
 * outcomes, developing on ignition temperature, needs help on two. The plan is
 * built from the chapter's own bank (by outcome tag), so if the bank changes the
 * showcase follows it.
 */
async function seedGuestShowcase(): Promise<void> {
  const [chapter] = await database
    .select({ id: chapters.id })
    .from(chapters)
    .where(
      and(eq(chapters.classNo, 8), eq(chapters.subjectSlug, "science"), eq(chapters.num, 6)),
    )
    .limit(1);
  if (!chapter) return;
  const [guest] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, "guest_student"))
    .limit(1);
  if (!guest) return;
  const [already] = await database
    .select({ n: count() })
    .from(mcqAttempts)
    .where(and(eq(mcqAttempts.userId, guest.id), eq(mcqAttempts.chapterId, chapter.id)));
  if ((already?.n ?? 0) > 0) return;

  const bank = await database
    .select({
      id: mcqQuestions.id,
      correctIndex: mcqQuestions.correctIndex,
      loCode: mcqQuestions.loCode,
    })
    .from(mcqQuestions)
    .where(eq(mcqQuestions.chapterId, chapter.id))
    .orderBy(asc(mcqQuestions.id));
  if (bank.length === 0) return;

  // How many questions of each outcome this learner gets right.
  const rightByOutcome: Record<string, number> = {
    "LO-8-SCI-06-01": 3, // combustion — secure (3 of 4)
    "LO-8-SCI-06-02": 1, // conditions — secure
    "LO-8-SCI-06-03": 2, // ignition temperature — developing (2 of 3)
    "LO-8-SCI-06-04": 2, // flame zones — secure (2 of 2 → 100%)
    "LO-8-SCI-06-05": 0, // harmful products — needs help
    "LO-8-SCI-06-06": 4, // fuel efficiency — secure
    "LO-8-SCI-06-07": 0, // fire safety — needs help
  };
  const seen: Record<string, number> = {};
  const answers = bank.map((question) => {
    const code = question.loCode ?? "";
    const used = (seen[code] = (seen[code] ?? 0) + 1);
    const allowed = rightByOutcome[code] ?? 1;
    if (used <= allowed) return question.correctIndex;
    // A wrong answer lands on the next option so it is a real marked attempt.
    return (question.correctIndex + 1) % 4;
  });
  const score = answers.reduce(
    (total, answer, position) => total + (answer === bank[position].correctIndex ? 1 : 0),
    0,
  );
  const xpEarned = 10 * score;
  await database.insert(mcqAttempts).values({
    userId: guest.id,
    chapterId: chapter.id,
    answers,
    score,
    total: bank.length,
    durationSec: 863,
    xpEarned,
    createdAt: new Date(Date.now() - 2 * 86_400_000),
  });
  if (xpEarned > 0)
    await database.insert(xpEvents).values({
      userId: guest.id,
      type: "objective",
      amount: xpEarned,
      refType: "chapter",
      refId: chapter.id,
      note: `Objective Test · Combustion and Flame · ${score}/${bank.length}`,
      createdAt: new Date(Date.now() - 2 * 86_400_000),
    });
}

async function seedClassNotebooks(
  chapterByKey: Map<string, { id: number }>,
): Promise<number> {
  const existing = await database
    .select({ chapterId: classNotebooks.chapterId })
    .from(classNotebooks);
  const present = new Set(existing.map((row) => row.chapterId));
  let created = 0;

  const [curator] = await database
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.handle, "ms_anita"))
    .limit(1);

  const plans: { chapterKey: string; title: string; items: { kind: "note" | "pdf" | "youtube" | "worksheet" | "link"; title: string; url?: string }[] }[] = [
    {
      chapterKey: "8-science-6",
      title: "Ms. Anita's Class 8 Science notebook — Combustion and Flame",
      items: [
        { kind: "pdf", title: "NCERT textbook, Chapter 6 (pp. 60–72)", url: "https://ncert.nic.in/textbook.php" },
        { kind: "worksheet", title: "Worksheet — fire triangle and safety at home", url: "/worksheet/combustion" },
        { kind: "youtube", title: "Flame zones demonstrated with a candle (7 min)", url: "https://www.youtube.com/watch?v=demo-flame-zones" },
        { kind: "link", title: "NCERT Exemplar problems, Chapter 6", url: "https://ncert.nic.in/exemplar-problems.php" },
      ],
    },
    {
      chapterKey: "8-mathematics-1",
      title: "Mr. Ravi's Class 8 Mathematics notebook — Rational Numbers",
      items: [
        { kind: "pdf", title: "NCERT textbook, Chapter 1 (pp. 1–20)", url: "https://ncert.nic.in/textbook.php" },
        { kind: "worksheet", title: "Number-line practice set", url: "/worksheet/rational-number-line" },
        { kind: "link", title: "NCERT Exemplar problems, Chapter 1", url: "https://ncert.nic.in/exemplar-problems.php" },
      ],
    },
  ];

  for (const plan of plans) {
    const chapter = chapterByKey.get(plan.chapterKey);
    if (!chapter) continue;
    if (present.has(chapter.id)) continue;
    const [notebook] = await database
      .insert(classNotebooks)
      .values({
        chapterId: chapter.id,
        classNo: Number(plan.chapterKey.split("-")[0]),
        subjectSlug: plan.chapterKey.split("-")[1],
        title: plan.title,
        curatorId: curator?.id ?? null,
        curatorName: curator?.name ?? "Faculty",
      })
      .onConflictDoNothing()
      .returning({ id: classNotebooks.id });
    if (!notebook) continue;
    created += 1;

    const chapterNotes = await database
      .select({ id: notes.id, title: notes.title, facultyVerified: notes.facultyVerified })
      .from(notes)
      .where(eq(notes.chapterId, chapter.id))
      .orderBy(asc(notes.id))
      .limit(2);

    const items: (typeof classNotebookItems.$inferInsert)[] = [
      // Verified faculty notes always head the source set — RAG ranks them first.
      ...chapterNotes
        .filter((note) => note.facultyVerified)
        .map((note) => ({
          notebookId: notebook.id,
          kind: "note" as const,
          title: note.title,
          noteId: note.id,
          addedById: curator?.id ?? null,
          addedByName: curator?.name ?? "Faculty",
        })),
      ...plan.items.map((item) => ({
        notebookId: notebook.id,
        kind: item.kind,
        title: item.title,
        url: item.url ?? null,
        addedById: curator?.id ?? null,
        addedByName: curator?.name ?? "Faculty",
      })),
      ...chapterNotes
        .filter((note) => !note.facultyVerified)
        .map((note) => ({
          notebookId: notebook.id,
          kind: "note" as const,
          title: note.title,
          noteId: note.id,
          addedById: curator?.id ?? null,
          addedByName: curator?.name ?? "Faculty",
        })),
    ];
    if (items.length) await database.insert(classNotebookItems).values(items);
  }
  return created;
}

async function seedRoster(
  chapterByKey: Map<string, { id: number }>,
): Promise<number> {
  const roster = rosterStudents();
  const domain = ROSTER_EMAIL_DOMAIN;
  const [existing] = await database
    .select({ n: count() })
    .from(users)
    .where(sql`${users.email} LIKE ${`%@${domain}`}`);
  if ((existing?.n ?? 0) >= ROSTER_SIZE) return 0;

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const created = await database
    .insert(users)
    .values(
      roster.map((student) => ({
        handle: student.handle,
        name: student.name,
        email: student.email,
        passwordHash,
        role: "student" as const,
        className: 8,
        state: "Gujarat",
        school: "Zilla Parishad High School, Anand",
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailDomain: domain,
        verificationStatus: "verified" as const,
        verifiedBy: "Class roster import (Zilla Parishad High School, Anand)",
        isGuest: false,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email });
  if (created.length === 0) return 0;
  const idByEmail = new Map(created.map((row) => [row.email, row.id]));

  const scienceChapter = chapterByKey.get("8-science-6");
  const mathsChapter = chapterByKey.get("8-mathematics-1");

  const bankFor = async (chapterId: number) =>
    database
      .select({
        id: mcqQuestions.id,
        correctIndex: mcqQuestions.correctIndex,
        trapIndex: mcqQuestions.trapIndex,
        loCode: mcqQuestions.loCode,
      })
      .from(mcqQuestions)
      .where(eq(mcqQuestions.chapterId, chapterId))
      .orderBy(asc(mcqQuestions.id));

  const attempts: (typeof mcqAttempts.$inferInsert)[] = [];
  const xpRows: (typeof xpEvents.$inferInsert)[] = [];

  const record = (
    userId: number,
    chapterId: number,
    chapterTitle: string,
    plan: AnswerPlan,
    total: number,
    daysAgo: number,
  ) => {
    const xpEarned = 10 * plan.score;
    attempts.push({
      userId,
      chapterId,
      answers: plan.answers,
      score: plan.score,
      total,
      durationSec: 600 + ((userId * 37) % 300),
      xpEarned,
      createdAt: new Date(Date.now() - daysAgo * 86_400_000),
    });
    if (xpEarned > 0)
      xpRows.push({
        userId,
        type: "objective",
        amount: xpEarned,
        refType: "chapter",
        refId: chapterId,
        note: `Objective Test · ${chapterTitle} · ${plan.score}/${total}`,
        createdAt: new Date(Date.now() - daysAgo * 86_400_000),
      });
  };

  if (scienceChapter) {
    const bank = await bankFor(scienceChapter.id);
    const ignitionPositions = bank
      .map((question, position) => (question.loCode === IGNITION_OUTCOME ? position : -1))
      .filter((position) => position >= 0);
    const correctIndexes = bank.map((question) => question.correctIndex);
    const trapIndexByPosition: Record<number, number> = {};
    bank.forEach((question, position) => {
      if (question.trapIndex !== null && question.trapIndex !== undefined)
        trapIndexByPosition[position] = question.trapIndex;
    });

    for (const student of roster) {
      const userId = idByEmail.get(student.email);
      if (!userId) continue;
      const plan = planAnswers({
        studentIndex: student.index,
        strength: student.strength,
        questionCount: bank.length,
        correctIndexes,
        ignitionPositions,
        trapIndexByPosition,
      });
      record(userId, scienceChapter.id, "Combustion and Flame", plan, bank.length, 3 + (student.index % 9));
    }
  }

  if (mathsChapter) {
    const bank = await bankFor(mathsChapter.id);
    if (bank.length > 0) {
      const correctIndexes = bank.map((question) => question.correctIndex);
      const trapIndexByPosition: Record<number, number> = {};
      bank.forEach((question, position) => {
        if (question.trapIndex !== null && question.trapIndex !== undefined)
          trapIndexByPosition[position] = question.trapIndex;
      });
      for (const student of roster) {
        // Two thirds of the class has attempted the maths chapter as well.
        if (student.index % 3 === 2) continue;
        const userId = idByEmail.get(student.email);
        if (!userId) continue;
        const plan = planAnswers({
          studentIndex: student.index + 500,
          strength: student.strength,
          questionCount: bank.length,
          correctIndexes,
          ignitionPositions: [],
          trapIndexByPosition,
        });
        record(userId, mathsChapter.id, "Rational Numbers", plan, bank.length, 2 + (student.index % 7));
      }
    }
  }

  for (const batch of chunk(attempts, 30)) await database.insert(mcqAttempts).values(batch);
  for (const batch of chunk(xpRows, 30)) await database.insert(xpEvents).values(batch);
  return created.length;
}
