/**
 * Mastery engine — the thing that turns quiz marks into a knowledge graph.
 *
 * Everything here is pure: it takes stored MCQ attempts (the answers array the
 * learner actually submitted) plus the question→outcome mapping and returns
 * per-student, per-outcome mastery with the reasoning attached. Nothing is
 * invented at read time, which is what makes the dashboard explainable: every
 * red cell can be traced to the exact questions and the exact wrong options
 * that produced it.
 */

import type { LearningOutcome } from "./taxonomy";

export type MasteryLevel = "not_started" | "needs_help" | "developing" | "secure";

/**
 * "Has understood" means the learner answered at least 80% of the questions
 * mapped to that outcome correctly. 50–79% is "developing" (a partial idea),
 * below 50% is "needs help". A learner with no answers is "not started", and is
 * never counted as failing — a heatmap must not punish absence.
 */
export const MASTERY_THRESHOLDS = { needsHelp: 0.5, secure: 0.8 } as const;

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  not_started: "Not attempted",
  needs_help: "Needs help",
  developing: "Developing",
  secure: "Secure",
};

/** Question shape the engine needs; the DB rows satisfy this. */
export type MasteryQuestion = {
  id: number;
  qtext: string;
  options: string[];
  correctIndex: number;
  /** Outcome this question is tagged to (null = untagged). */
  loCode: string | null;
  /** Option index that represents the classic wrong idea. */
  trapIndex?: number | null;
  /** Name of that wrong idea, e.g. "ignition temperature = boiling point". */
  trap?: string | null;
};

export type MasteryAttempt = {
  userId: number;
  answers: number[];
  createdAt?: Date | number | null;
};

export type StudentOutcomeMastery = {
  code: string;
  level: MasteryLevel;
  attempted: number;
  correct: number;
  accuracy: number;
  /** 1 mapped question is thin evidence; 3+ is solid. */
  confidence: "low" | "medium" | "high";
  /** Wrong options this learner chose, for the "why" panel. */
  misses: {
    questionId: number;
    chosenIndex: number;
    chosenText: string;
    correctText: string;
    misconception: string | null;
  }[];
};

export type StudentMastery = {
  userId: number;
  answersTotal: number;
  outcomes: StudentOutcomeMastery[];
  secureCount: number;
  needsHelpCount: number;
  notStartedCount: number;
};

export function levelFor(accuracy: number, attempted: number): MasteryLevel {
  if (attempted === 0) return "not_started";
  if (accuracy >= MASTERY_THRESHOLDS.secure) return "secure";
  if (accuracy >= MASTERY_THRESHOLDS.needsHelp) return "developing";
  return "needs_help";
}

function confidenceFor(attempted: number): "low" | "medium" | "high" {
  if (attempted >= 3) return "high";
  if (attempted === 2) return "medium";
  return "low";
}

/**
 * A learner's mastery of every outcome covered by their latest attempt on the
 * chapter. Answers are positional (index into the chapter's question list), so
 * an unanswered question (`-1` or out of range) is skipped rather than counted
 * as wrong.
 */
export function studentMastery(
  questions: MasteryQuestion[],
  attempt: MasteryAttempt | null,
  outcomes: LearningOutcome[],
): StudentMastery {
  const answers = attempt?.answers ?? [];
  const perOutcome = new Map<string, StudentOutcomeMastery>();

  questions.forEach((question, index) => {
    if (!question.loCode) return;
    if (!outcomes.some((outcome) => outcome.code === question.loCode)) return;
    const chosen = answers[index];
    if (!Number.isInteger(chosen) || chosen < 0) return;
    const entry = perOutcome.get(question.loCode) ?? {
      code: question.loCode,
      level: "not_started" as MasteryLevel,
      attempted: 0,
      correct: 0,
      accuracy: 0,
      confidence: "low" as const,
      misses: [],
    };
    entry.attempted += 1;
    const right = chosen === question.correctIndex;
    if (right) entry.correct += 1;
    else
      entry.misses.push({
        questionId: question.id,
        chosenIndex: chosen,
        chosenText: question.options[chosen] ?? `Option ${chosen + 1}`,
        correctText: question.options[question.correctIndex] ?? "",
        misconception:
          question.trapIndex === chosen ? (question.trap ?? null) : null,
      });
    perOutcome.set(question.loCode, entry);
  });

  const list = outcomes.map((outcome) => {
    const entry = perOutcome.get(outcome.code);
    if (!entry)
      return {
        code: outcome.code,
        level: "not_started" as MasteryLevel,
        attempted: 0,
        correct: 0,
        accuracy: 0,
        confidence: "low" as const,
        misses: [],
      };
    const accuracy = entry.attempted ? entry.correct / entry.attempted : 0;
    return {
      ...entry,
      accuracy,
      level: levelFor(accuracy, entry.attempted),
      confidence: confidenceFor(entry.attempted),
    };
  });

  return {
    userId: attempt?.userId ?? 0,
    answersTotal: answers.filter((a) => Number.isInteger(a) && a >= 0).length,
    outcomes: list,
    secureCount: list.filter((o) => o.level === "secure").length,
    needsHelpCount: list.filter((o) => o.level === "needs_help").length,
    notStartedCount: list.filter((o) => o.level === "not_started").length,
  };
}

/* ----------------------------- class view ----------------------------- */

export type ClassOutcomeSummary = {
  code: string;
  concept: string;
  statement: string;
  textbookPage: number;
  kind: LearningOutcome["kind"];
  diagram: LearningOutcome["diagram"];
  misconceptions: string[];
  /** Everyone on the roster, including learners who have not attempted. */
  rosterSize: number;
  attempted: number;
  secure: number;
  developing: number;
  needsHelp: number;
  notStarted: number;
  /** attempted − secure: the headline number. */
  notUnderstood: number;
  /** Share of the whole roster that has not secured the outcome. */
  notUnderstoodPct: number;
  confidence: "low" | "medium" | "high";
  /** The most common wrong option across the class, with a name if known. */
  topMistake: {
    questionId: number;
    qtext: string;
    chosenIndex: number;
    chosenText: string;
    correctText: string;
    count: number;
    misconception: string | null;
  } | null;
  /** Per-question evidence, worst question first. */
  evidence: {
    questionId: number;
    qtext: string;
    answered: number;
    correct: number;
    chosen: { optionIndex: number; text: string; count: number; isCorrect: boolean }[];
    misconception: string | null;
  }[];
  studentsNeedingHelp: number[];
};

export type ClassMastery = {
  rosterSize: number;
  attemptedStudents: number;
  outcomes: ClassOutcomeSummary[];
  students: { userId: number; mastery: StudentMastery }[];
  /** Outcomes ordered by how badly the class did (teacher's worklist). */
  priority: ClassOutcomeSummary[];
  /** One-line, print-ready statement for each flagged outcome. */
  headlines: string[];
};

export type RosterMember = { userId: number };

/**
 * Aggregate a class: who attempted what, how each outcome landed, and the
 * single most common wrong idea per outcome.
 */
export function classMastery(
  roster: RosterMember[],
  questions: MasteryQuestion[],
  attempts: MasteryAttempt[],
  outcomes: LearningOutcome[],
): ClassMastery {
  const rosterIds = new Set(roster.map((member) => member.userId));
  const inClass = attempts.filter((attempt) => rosterIds.has(attempt.userId));
  const students = inClass.map((attempt) => ({
    userId: attempt.userId,
    mastery: studentMastery(questions, attempt, outcomes),
  }));

  const byOutcome = new Map<string, { userId: number; entry: StudentOutcomeMastery }[]>();
  for (const student of students) {
    for (const entry of student.mastery.outcomes) {
      const list = byOutcome.get(entry.code) ?? [];
      list.push({ userId: student.userId, entry });
      byOutcome.set(entry.code, list);
    }
  }

  const summaries = outcomes.map((outcome): ClassOutcomeSummary => {
    const entries = (byOutcome.get(outcome.code) ?? []).map((row) => row.entry);
    const attempted = entries.filter((e) => e.level !== "not_started");
    const secure = attempted.filter((e) => e.level === "secure").length;
    const developing = attempted.filter((e) => e.level === "developing").length;
    const needsHelp = attempted.filter((e) => e.level === "needs_help").length;
    const notUnderstood = attempted.length - secure;

    const mapped = questions.filter((q) => q.loCode === outcome.code);
    const evidence = mapped
      .map((question) => {
        const index = questions.indexOf(question);
        const chosen = new Map<number, number>();
        let answered = 0;
        let correct = 0;
        for (const attempt of inClass) {
          const pick = attempt.answers[index];
          if (!Number.isInteger(pick) || pick < 0) continue;
          if (pick >= question.options.length) continue;
          answered += 1;
          if (pick === question.correctIndex) correct += 1;
          else chosen.set(pick, (chosen.get(pick) ?? 0) + 1);
        }
        return {
          questionId: question.id,
          qtext: question.qtext,
          answered,
          correct,
          chosen: [...chosen.entries()]
            .map(([optionIndex, count]) => ({
              optionIndex,
              text: question.options[optionIndex] ?? `Option ${optionIndex + 1}`,
              count,
              isCorrect: optionIndex === question.correctIndex,
            }))
            .sort((a, b) => b.count - a.count),
          misconception:
            question.trapIndex !== null && question.trapIndex !== undefined
              ? (question.trap ?? null)
              : null,
        };
      })
      .sort((a, b) => b.answered - b.correct - (a.answered - a.correct));

    const topEvidence = evidence.find((item) => item.chosen.length > 0) ?? null;
    const top = topEvidence?.chosen[0];
    const topMistake =
      topEvidence && top
        ? {
            questionId: topEvidence.questionId,
            qtext: topEvidence.qtext,
            chosenIndex: top.optionIndex,
            chosenText: top.text,
            correctText: mapped
              .find((q) => q.id === topEvidence.questionId)!
              .options[
              mapped.find((q) => q.id === topEvidence.questionId)!.correctIndex
            ],
            count: top.count,
            misconception:
              mapped.find((q) => q.id === topEvidence.questionId)?.trapIndex ===
              top.optionIndex
                ? (mapped.find((q) => q.id === topEvidence.questionId)?.trap ??
                  null)
                : null,
          }
        : null;

    return {
      code: outcome.code,
      concept: outcome.concept,
      statement: outcome.statement,
      textbookPage: outcome.textbookPage,
      kind: outcome.kind,
      diagram: outcome.diagram,
      misconceptions: outcome.misconceptions,
      rosterSize: roster.length,
      attempted: attempted.length,
      secure,
      developing,
      needsHelp,
      notStarted: roster.length - attempted.length,
      notUnderstood,
      notUnderstoodPct: roster.length
        ? Math.round((notUnderstood / roster.length) * 100)
        : 0,
      confidence:
        mapped.length >= 3 ? "high" : mapped.length === 2 ? "medium" : "low",
      topMistake,
      evidence,
      studentsNeedingHelp: (byOutcome.get(outcome.code) ?? [])
        .filter((row) => row.entry.level === "needs_help")
        .map((row) => row.userId),
    };
  });

  const priority = [...summaries]
    .filter((summary) => summary.notUnderstood > 0)
    .sort(
      (a, b) =>
        b.notUnderstood - a.notUnderstood ||
        b.notUnderstoodPct - a.notUnderstoodPct ||
        a.code.localeCompare(b.code),
    );

  return {
    rosterSize: roster.length,
    attemptedStudents: inClass.length,
    outcomes: summaries,
    students,
    priority,
    headlines: priority.map(outcomeHeadline),
  };
}

/** "31 of 45 students haven't understood ignition temperature." */
export function outcomeHeadline(summary: ClassOutcomeSummary): string {
  const concept =
    summary.concept.charAt(0).toLowerCase() + summary.concept.slice(1);
  return `${summary.notUnderstood} of ${summary.rosterSize} students haven't understood ${concept}.`;
}

/** Green / amber / red chip used by the heatmap and the concept tree. */
export function masteryTone(level: MasteryLevel): {
  cell: string;
  chip: string;
  dot: string;
  label: string;
} {
  switch (level) {
    case "secure":
      return {
        cell: "bg-leaf-500/15 text-leaf-800 ring-1 ring-inset ring-leaf-500/30",
        chip: "bg-leaf-50 text-leaf-700 border-leaf-500/40",
        dot: "bg-leaf-600",
        label: LEVEL_LABEL.secure,
      };
    case "developing":
      return {
        cell: "bg-amber-400/20 text-amber-900 ring-1 ring-inset ring-amber-500/30",
        chip: "bg-amber-50 text-amber-800 border-amber-400/50",
        dot: "bg-amber-500",
        label: LEVEL_LABEL.developing,
      };
    case "needs_help":
      return {
        cell: "bg-rose-500/20 text-rose-900 ring-1 ring-inset ring-rose-500/30",
        chip: "bg-rose-50 text-rose-700 border-rose-300",
        dot: "bg-rose-600",
        label: LEVEL_LABEL.needs_help,
      };
    default:
      return {
        cell: "bg-slate-100 text-slate-400",
        chip: "bg-slate-50 text-slate-500 border-slate-200",
        dot: "bg-slate-300",
        label: LEVEL_LABEL.not_started,
      };
  }
}

/** Heatmap cell for one student × one outcome. */
export function cellFor(
  mastery: StudentMastery,
  code: string,
): StudentOutcomeMastery {
  return (
    mastery.outcomes.find((outcome) => outcome.code === code) ?? {
      code,
      level: "not_started",
      attempted: 0,
      correct: 0,
      accuracy: 0,
      confidence: "low",
      misses: [],
    }
  );
}

/* --------------------------- error clustering --------------------------- */

export type MisconceptionCluster = {
  /** Named wrong idea when the bank names it, else the option text chosen. */
  label: string;
  misconception: string | null;
  chosenText: string;
  questionId: number | null;
  count: number;
  /** Learner ids in this cluster; teachers use it to pull a group for reteaching. */
  students: number[];
  /** Suggested teaching move — plain language, tied to the source page. */
  reteach: string;
};

/**
 * Group the learners who have not secured an outcome by the *wrong idea* they
 * hold, not just by their score. This is what turns a red cell into a lesson
 * plan: one cluster usually means one 10-minute reteach, while scattered misses
 * mean the concept was never taught rather than misunderstood.
 */
export function groupMisconceptions(
  outcome: ClassOutcomeSummary,
  students: { userId: number; mastery: StudentMastery }[],
): MisconceptionCluster[] {
  const clusters = new Map<string, MisconceptionCluster>();
  for (const student of students) {
    const cell = cellFor(student.mastery, outcome.code);
    if (cell.level === "secure" || cell.level === "not_started") continue;
    const miss = cell.misses[0];
    const key = miss
      ? (miss.misconception ?? `option:${miss.chosenIndex}:${miss.chosenText}`)
      : "unanswered";
    const cluster = clusters.get(key) ?? {
      label: miss?.misconception ?? miss?.chosenText ?? "No answer recorded",
      misconception: miss?.misconception ?? null,
      chosenText: miss?.chosenText ?? "",
      questionId: miss?.questionId ?? null,
      count: 0,
      students: [],
      reteach: "",
    };
    cluster.count += 1;
    cluster.students.push(student.userId);
    clusters.set(key, cluster);
  }
  return [...clusters.values()]
    .map((cluster) => ({
      ...cluster,
      reteach: cluster.misconception
        ? `Reteach "${outcome.concept}" from the textbook page ${outcome.textbookPage}, then re-ask this question to the group.`
        : `Ask this group to explain their reasoning aloud against page ${outcome.textbookPage}.`,
    }))
    .sort((a, b) => b.count - a.count);
}
