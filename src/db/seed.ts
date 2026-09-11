import { and, count, eq, inArray } from "drizzle-orm";
import { GUEST_EMAILS } from "../lib/guest-accounts";
import { hashPassword } from "../lib/password";
import {
  CLASSES,
  chapterSlug,
  getChapters,
  SUBJECTS,
} from "../lib/curriculum";
import {
  combustionMcqs,
  combustionSubj,
  rationalMcqs,
  rationalSubj,
  heatMcqs,
  chemicalReactionsMcqs,
  chemicalReactionsSubj,
  realNumbersMcqs,
  realNumbersSubj,
  coordinatesMcqs,
  magnetsMcqs,
  videosByChapter,
  notesByChapter,
  DEMO_PASSWORD,
} from "../../scripts/seed-content";

import { db as database } from "./index";

// SQLite schema shared with the application
import * as schema from "./schema";
const {
  users,
  chapters,
  videos,
  notes,
  noteVotes,
  mcqQuestions,
  mcqAttempts,
  subjectiveQuestions,
  subjectiveAttempts,
  xpEvents,
} = schema;

const PREFIX: Record<string, string> = {
  science: "SCI",
  mathematics: "MATH",
  "social-science": "SST",
  english: "ENG",
  hindi: "HIN",
  "arts-vocational": "ARTS",
};

/** deterministic pseudo-random for stable demo data */
let s = 42;
function rnd() {
  s = (s * 1103515245 + 12345) % 2147483648;
  return s / 2147483648;
}
const pick = (n: number) => Math.floor(rnd() * n);

type DemoUser = {
  handle: string;
  name: string;
  email: string;
  role: "student" | "faculty";
  className?: number;
  state?: string;
  school?: string;
  spec?: string;
  inst?: string;
  guest?: boolean;
};

const DEMO_USERS: DemoUser[] = [
  { handle: "ms_anita", name: "Anita Sharma", email: "anita.sharma@vidyasetu.gov.in", role: "faculty", spec: "Science", inst: "SCH-GJ-204", state: "Gujarat" },
  { handle: "ravi_verma", name: "Ravi Verma", email: "ravi.verma@vidyasetu.gov.in", role: "faculty", spec: "Mathematics", inst: "SCH-MH-112", state: "Maharashtra" },
  { handle: "aarav_p", name: "Aarav Patel", email: "aarav@student.in", role: "student", className: 8, state: "Gujarat", school: "Shiksha Kendra, Rajkot" },
  { handle: "diya_m", name: "Diya Mehta", email: "diya@student.in", role: "student", className: 8, state: "Gujarat", school: "Kendriya Vidyalaya, Ahmedabad" },
  { handle: "rohan_k", name: "Rohan Kulkarni", email: "rohan@student.in", role: "student", className: 8, state: "Maharashtra", school: "Ganesh Vidyalaya, Pune" },
  { handle: "sneha_s", name: "Sneha Singh", email: "sneha@student.in", role: "student", className: 8, state: "Punjab", school: "GGS School, Ludhiana" },
  { handle: "kabir_s", name: "Kabir Shah", email: "kabir@student.in", role: "student", className: 8, state: "Kerala", school: "Govt. Higher Secondary, Kochi" },
  { handle: "ishita_r", name: "Ishita Roy", email: "ishita@student.in", role: "student", className: 8, state: "West Bengal", school: "Govt. High School, Kolkata" },
  { handle: "arjun_t", name: "Arjun Thakur", email: "arjun@student.in", role: "student", className: 7, state: "Bihar", school: "Shiksha Kendra, Patna" },
  { handle: "meera_n", name: "Meera Nair", email: "meera@student.in", role: "student", className: 7, state: "Kerala", school: "Govt. School, Thiruvananthapuram" },
  { handle: "vihaan_g", name: "Vihaan Gupta", email: "vihaan@student.in", role: "student", className: 7, state: "Rajasthan", school: "Govt. Sr. Sec. School, Jaipur" },
  { handle: "ananya_b", name: "Ananya Banerjee", email: "ananya@student.in", role: "student", className: 7, state: "Odisha", school: "GVHS, Bhubaneswar" },
  { handle: "kavya_r", name: "Kavya Reddy", email: "kavya@student.in", role: "student", className: 9, state: "Telangana", school: "Zilla Parishad High School, Warangal" },
  { handle: "aditya_j", name: "Aditya Joshi", email: "aditya@student.in", role: "student", className: 9, state: "Maharashtra", school: "Govt. Secondary School, Nagpur" },
  { handle: "fatima_k", name: "Fatima Khan", email: "fatima@student.in", role: "student", className: 10, state: "Uttar Pradesh", school: "Govt. Girls Inter College, Lucknow" },
  { handle: "naveen_s", name: "Naveen Sahu", email: "naveen@student.in", role: "student", className: 10, state: "Chhattisgarh", school: "Govt. Higher Secondary School, Raipur" },
  { handle: "tanvi_d", name: "Tanvi Deshmukh", email: "tanvi@student.in", role: "student", className: 6, state: "Maharashtra", school: "Zilla Parishad School, Nashik" },
  { handle: "imran_a", name: "Imran Ali", email: "imran@student.in", role: "student", className: 6, state: "Assam", school: "Govt. Middle School, Guwahati" },
  { handle: "guest_student", name: "Guest Student", email: "guest.student@vidyasetu.gov.in", role: "student", className: 8, state: "All India", school: "Pragyan Guest", guest: true },
  { handle: "guest_faculty", name: "Guest Faculty", email: "guest.faculty@vidyasetu.gov.in", role: "faculty", spec: "Science", inst: "SCH-DEMO", state: "All India", guest: true },
];

const CHAPTER_CONTENT: Record<
  string,
  { mcqs: typeof combustionMcqs; subj: typeof combustionSubj }
> = {
  "8-science-6": { mcqs: combustionMcqs, subj: combustionSubj },
  "8-mathematics-1": { mcqs: rationalMcqs, subj: rationalSubj },
  "7-science-9": { mcqs: heatMcqs, subj: [] },
  "10-science-1": { mcqs: chemicalReactionsMcqs, subj: chemicalReactionsSubj },
  "10-mathematics-1": { mcqs: realNumbersMcqs, subj: realNumbersSubj },
  "9-mathematics-1": { mcqs: coordinatesMcqs, subj: [] },
  "6-science-4": { mcqs: magnetsMcqs, subj: [] },
};

const ATTEMPTS: Record<string, Record<string, number>> = {
  "8-science-6": { diya_m: 19, sneha_s: 18, rohan_k: 17, aarav_p: 15, kabir_s: 12 },
  "8-mathematics-1": { sneha_s: 19, diya_m: 16, rohan_k: 15, ishita_r: 14 },
  "7-science-9": { meera_n: 18, arjun_t: 16, vihaan_g: 14, ananya_b: 13 },
  "10-science-1": { fatima_k: 11, naveen_s: 9 },
  "10-mathematics-1": { naveen_s: 11, fatima_k: 10 },
  "9-mathematics-1": { kavya_r: 9, aditya_j: 8 },
  "6-science-4": { tanvi_d: 9, imran_a: 8 },
};

const SUBJECTIVE_DONE: { handle: string; chapter: string }[] = [
  { handle: "diya_m", chapter: "8-science-6" },
  { handle: "aarav_p", chapter: "8-science-6" },
  { handle: "sneha_s", chapter: "8-mathematics-1" },
];

/** Batch inserts keep hosted SQLite initialization short and transactional. */
export async function seedDemoDatabase(): Promise<boolean> {
  return database.transaction(async (db) => {
    const [userCount] = await db.select({ n: count() }).from(users);
    const [chapterCount] = await db.select({ n: count() }).from(chapters);
    const guestUsers = DEMO_USERS.filter((u) => u.guest);
    const existing = userCount.n > 0 || chapterCount.n > 0;
    let toCreate = DEMO_USERS;
    if (existing) {
      const present = await db.select({ email: users.email }).from(users)
        .where(and(inArray(users.email, [...GUEST_EMAILS.student, ...GUEST_EMAILS.faculty]), eq(users.isGuest, true)));
      toCreate = guestUsers.filter((u) => !present.some((p) => (GUEST_EMAILS[u.role] as readonly string[]).includes(p.email)));
      if (toCreate.length === 0) return false;
    }
    const pw = hashPassword(DEMO_PASSWORD);
    const createdUsers = await db.insert(users).values(toCreate.map((u) => ({
      handle: u.handle, name: u.name, email: u.email, passwordHash: pw, role: u.role,
      className: u.className ?? null, state: u.state ?? null, school: u.school ?? null,
      subjectSpecialization: u.spec ?? null, institutionId: u.inst ?? null, isGuest: !!u.guest,
      emailVerified: true, emailVerifiedAt: new Date(), emailDomain: u.email.split("@")[1] ?? null,
      verificationStatus: "verified" as const,
      verifiedBy: u.role === "faculty" ? "Seeded institutional address" : "Student self-registration",
    }))).onConflictDoNothing().returning({ id: users.id, handle: users.handle });
    if (existing) return false;
    s = 42;
    const userIds = Object.fromEntries(createdUsers.map((u) => [u.handle, u.id]));
    const chapterIds: Record<string, number> = {};
    const chapterTitles: Record<string, string> = {};
    const chapterRows: (typeof chapters.$inferInsert)[] = [];
    for (const classNo of CLASSES) {
      for (const sub of SUBJECTS) {
        for (const [i, row] of getChapters(classNo, sub.slug).entries()) {
          const nn = String(i + 1).padStart(2, "0");
          const prefix = PREFIX[sub.slug];
          chapterRows.push({
            classNo, subjectSlug: sub.slug, subjectName: sub.name, num: i + 1,
            title: row.title, slug: chapterSlug(row, i),
            outcomeIds: [1, 2, 3].map((n) => `LO-${classNo}-${prefix}-${nn}-0${n}`),
            dikshaCode: `D-${classNo}-${prefix}-${nn}`,
          });
        }
      }
    }
    // Stay below SQLite's conservative 999-bound-parameter limit.
    for (let offset = 0; offset < chapterRows.length; offset += 60) {
      const rows = await db.insert(chapters).values(chapterRows.slice(offset, offset + 60)).returning();
      for (const row of rows) {
        const key = `${row.classNo}-${row.subjectSlug}-${row.num}`;
        chapterIds[key] = row.id;
        chapterTitles[key] = row.title;
      }
    }
    const videoRows: (typeof videos.$inferInsert)[] = [];
    for (const [key, list] of Object.entries(videosByChapter)) {
      for (const v of list) videoRows.push({
        chapterId: chapterIds[key], title: v.title, kind: "mp4", videoUrl: v.url,
        durationSec: v.duration, fileSizeMb: v.sizeMb, markers: v.markers,
        slidesUrl: v.slides, slidesTitle: v.slidesTitle, uploadedById: userIds.ms_anita,
        uploadedByName: "Ms. Anita Sharma (Faculty)",
      });
    }
    if (videoRows.length) await db.insert(videos).values(videoRows);

    const noteRows: (typeof notes.$inferInsert)[] = [];
    const noteFixtures = Object.entries(notesByChapter).flatMap(([key, list]) => list.map((n) => ({
      ...n, chapterId: chapterIds[key], authorId: userIds[n.author] ?? null,
      voters: [...new Set(n.votesFrom.filter((h) => userIds[h] !== undefined).map((h) => userIds[h]))],
    })));
    for (const n of noteFixtures) noteRows.push({
      chapterId: n.chapterId, title: n.title, content: n.content, fileType: "text", authorId: n.authorId,
      authorName: DEMO_USERS.find((u) => u.handle === n.author)?.name ?? n.author,
      facultyVerified: !!n.verified, verifiedByName: n.verified ? "Ms. Anita Sharma" : null,
      rewarded: n.voters.length >= 10 && n.authorId !== null,
    });
    const createdNotes = noteRows.length ? await db.insert(notes).values(noteRows).returning() : [];
    const voteRows: (typeof noteVotes.$inferInsert)[] = [];
    const xpRows: (typeof xpEvents.$inferInsert)[] = [];
    for (const n of noteFixtures) {
      const note = createdNotes.find((row) => row.chapterId === n.chapterId && row.title === n.title)!;
      for (const userId of n.voters) voteRows.push({ noteId: note.id, userId });
      if (note.rewarded && n.authorId) xpRows.push({
        userId: n.authorId, type: "note_upvotes", amount: 50, refType: "note", refId: note.id,
        note: `Note reached 10+ upvotes — "${n.title}"`,
      });
    }
    if (voteRows.length) await db.insert(noteVotes).values(voteRows).onConflictDoNothing();
    const mcqRows: (typeof mcqQuestions.$inferInsert)[] = [];
    const subjectiveRows: (typeof subjectiveQuestions.$inferInsert)[] = [];
    const bankSize: Record<string, number> = {};
    for (const [key, bank] of Object.entries(CHAPTER_CONTENT)) {
      bankSize[key] = bank.mcqs.length;
      for (const m of bank.mcqs) mcqRows.push({
        chapterId: chapterIds[key], qtext: m.q, options: m.options, correctIndex: m.correct,
        explanation: m.why, isPyq: !!m.pyq, pyqTag: m.pyq ?? "Practice",
      });
      for (const q of bank.subj) subjectiveRows.push({
        chapterId: chapterIds[key], qtext: q.q, marks: q.marks, rubric: q.rubric, modelAnswer: q.answer,
      });
    }
    if (mcqRows.length) await db.insert(mcqQuestions).values(mcqRows);
    if (subjectiveRows.length) await db.insert(subjectiveQuestions).values(subjectiveRows);
    const attempts: (typeof mcqAttempts.$inferInsert)[] = [];
    // diya_m (the demo star student) practises on consecutive recent days so
    // the analytics demo shows a live multi-day streak.
    let diyaDay = 2;
    for (const [key, byUser] of Object.entries(ATTEMPTS)) {
      const total = bankSize[key] ?? 20;
      for (const [handle, score] of Object.entries(byUser)) {
        // Spread demo attempts across the past months so the analytics
        // heatmap and trend charts have a realistic history after backfill.
        const at =
          handle === "diya_m"
            ? new Date(Date.now() - diyaDay-- * 86_400_000)
            : new Date(
                Date.now() - (5 + Math.floor(rnd() * 230)) * 86_400_000 -
                  Math.floor(rnd() * 20) * 3_600_000,
              );
        attempts.push({ userId: userIds[handle], chapterId: chapterIds[key], total, score,
          answers: Array.from({ length: total }, (_, i) => i < score ? pick(4) : (pick(4) + 1) % 4),
          durationSec: 240 + pick(480), xpEarned: 10 * score, createdAt: at });
        xpRows.push({ userId: userIds[handle], type: "objective", amount: 10 * score,
          refType: "chapter", refId: chapterIds[key], note: `Objective Test · ${chapterTitles[key]} · ${score}/${total}`,
          createdAt: at });
      }
    }
    if (attempts.length) await db.insert(mcqAttempts).values(attempts);
    const subjectiveDone: (typeof subjectiveAttempts.$inferInsert)[] = [];
    for (const entry of SUBJECTIVE_DONE) {
      const at =
        entry.handle === "diya_m" && diyaDay >= 0
          ? new Date(Date.now() - diyaDay-- * 86_400_000)
          : new Date(Date.now() - (2 + Math.floor(rnd() * 200)) * 86_400_000);
      subjectiveDone.push({ userId: userIds[entry.handle], chapterId: chapterIds[entry.chapter],
        answers: { 1: "Self-reviewed against the model marking scheme." }, xpEarned: 30, createdAt: at });
      xpRows.push({ userId: userIds[entry.handle], type: "subjective", amount: 30, refType: "chapter",
        refId: chapterIds[entry.chapter], note: `Subjective Practice · ${chapterTitles[entry.chapter]}`,
        createdAt: at });
    }
    if (subjectiveDone.length) await db.insert(subjectiveAttempts).values(subjectiveDone);
    if (xpRows.length) await db.insert(xpEvents).values(xpRows);
    console.info(`Seed complete: ${createdUsers.length} users, ${chapterRows.length} chapters.`);
    return true;
  });
}
