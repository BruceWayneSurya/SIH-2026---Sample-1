import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "../src/lib/session";
import {
  getChapters,
  SUBJECTS,
  slugify,
} from "../src/lib/curriculum";
import {
  combustionMcqs,
  combustionSubj,
  rationalMcqs,
  rationalSubj,
  heatMcqs,
  videosByChapter,
  notesByChapter,
  DEMO_PASSWORD,
} from "./seed-content";

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return path.join(process.cwd(), "data", "app.db");
  if (raw.startsWith("file://")) return raw.slice("file://".length);
  if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
    return path.join(process.cwd(), "data", "app.db");
  }
  return raw;
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

// lazy imports of schema (tsx resolves types fine)
import * as schema from "../src/db/schema";
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
  { handle: "guest_student", name: "Guest Student", email: "guest.student@vidyasetu.gov.in", role: "student", className: 8, state: "All India", school: "VidyaSetu Guest", guest: true },
  { handle: "guest_faculty", name: "Guest Faculty", email: "guest.faculty@vidyasetu.gov.in", role: "faculty", spec: "Science", inst: "SCH-DEMO", state: "All India", guest: true },
];

const CHAPTER_CONTENT: Record<
  string,
  { mcqs: typeof combustionMcqs; subj: typeof combustionSubj }
> = {
  "8-science-6": { mcqs: combustionMcqs, subj: combustionSubj },
  "8-mathematics-1": { mcqs: rationalMcqs, subj: rationalSubj },
  "7-science-9": { mcqs: heatMcqs, subj: [] },
};

const ATTEMPTS: Record<string, Record<string, number>> = {
  "8-science-6": { diya_m: 19, sneha_s: 18, rohan_k: 17, aarav_p: 15, kabir_s: 12 },
  "8-mathematics-1": { sneha_s: 19, diya_m: 16, rohan_k: 15, ishita_r: 14 },
  "7-science-9": { meera_n: 18, arjun_t: 16, vihaan_g: 14, ananya_b: 13 },
};

const SUBJECTIVE_DONE: { handle: string; chapter: string }[] = [
  { handle: "diya_m", chapter: "8-science-6" },
  { handle: "aarav_p", chapter: "8-science-6" },
  { handle: "sneha_s", chapter: "8-mathematics-1" },
];

async function resetTables() {
  // SQLite: disable FKs briefly, delete from child->parent tables, reset autoincrement.
  sqlite.exec("PRAGMA foreign_keys = OFF;");
  const tables = [
    "note_votes",
    "mcq_attempts",
    "subjective_attempts",
    "xp_events",
    "notes",
    "videos",
    "mcq_questions",
    "subjective_questions",
    "chapters",
    "users",
  ];
  for (const t of tables) sqlite.exec(`DELETE FROM "${t}";`);
  sqlite.exec(
    "DELETE FROM sqlite_sequence WHERE name IN (" +
      tables.map((t) => `'${t}'`).join(",") +
      ");",
  );
  sqlite.exec("PRAGMA foreign_keys = ON;");
}

async function main() {
  await resetTables();
  const pw = hashPassword(DEMO_PASSWORD);

  // ---- users -------------------------------------------------------
  const userIds: Record<string, number> = {};
  for (const u of DEMO_USERS) {
    const [row] = await db
      .insert(users)
      .values({
        handle: u.handle,
        name: u.name,
        email: u.email,
        passwordHash: pw,
        role: u.role,
        className: u.className ?? null,
        state: u.state ?? null,
        school: u.school ?? null,
        subjectSpecialization: u.spec ?? null,
        institutionId: u.inst ?? null,
        isGuest: !!u.guest,
      })
      .returning({ id: users.id });
    userIds[u.handle] = row.id;
  }

  // ---- chapters ----------------------------------------------------
  const chapterIds: Record<string, number> = {};
  const chapterTitles: Record<string, string> = {};
  for (const classNo of [7, 8]) {
    for (const sub of SUBJECTS) {
      const rows = getChapters(classNo, sub.slug);
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const key = `${classNo}-${sub.slug}-${i + 1}`;
        const nn = String(i + 1).padStart(2, "0");
        const prefix = PREFIX[sub.slug];
        chapterTitles[key] = r.title;
        const [ch] = await db
          .insert(chapters)
          .values({
            classNo,
            subjectSlug: sub.slug,
            subjectName: sub.name,
            num: i + 1,
            title: r.title,
            slug: slugify(r.title) || `chapter-${i + 1}`,
            outcomeIds: [
              `LO-${classNo}-${prefix}-${nn}-01`,
              `LO-${classNo}-${prefix}-${nn}-02`,
              `LO-${classNo}-${prefix}-${nn}-03`,
            ],
            dikshaCode: `D-${classNo}-${prefix}-${nn}`,
          })
          .returning({ id: chapters.id });
        chapterIds[key] = ch.id;
      }
    }
  }

  // ---- videos ------------------------------------------------------
  for (const [key, list] of Object.entries(videosByChapter)) {
    const chId = chapterIds[key];
    if (!chId) continue;
    for (const v of list) {
      await db
        .insert(videos)
        .values({
          chapterId: chId,
          title: v.title,
          kind: "mp4",
          videoUrl: v.url,
          durationSec: v.duration,
          fileSizeMb: v.sizeMb,
          markers: v.markers,
          slidesUrl: v.slides,
          slidesTitle: v.slidesTitle,
          uploadedById: userIds.ms_anita,
          uploadedByName: "Ms. Anita Sharma (Faculty)",
        });
    }
  }

  // ---- notes + votes ------------------------------------------------
  for (const [key, list] of Object.entries(notesByChapter)) {
    const chId = chapterIds[key];
    if (!chId) continue;
    for (const n of list) {
      const authorId = userIds[n.author] ?? null;
      const [note] = await db
        .insert(notes)
        .values({
          chapterId: chId,
          title: n.title,
          content: n.content,
          fileType: "text",
          authorId,
          authorName: DEMO_USERS.find((u) => u.handle === n.author)?.name ?? n.author,
          facultyVerified: !!n.verified,
          verifiedByName: n.verified ? "Ms. Anita Sharma" : null,
        })
        .returning({ id: notes.id });

      const voterIds = Array.from(
        new Set(n.votesFrom.filter((h) => userIds[h] !== undefined).map((h) => userIds[h])),
      );
      for (const uid of voterIds) {
        await db
          .insert(noteVotes)
          .values({ noteId: note.id, userId: uid })
          .onConflictDoNothing();
      }
      if (voterIds.length >= 10 && authorId) {
        await db.update(notes).set({ rewarded: true }).where(eq(notes.id, note.id));
        await db.insert(xpEvents).values({
          userId: authorId,
          type: "note_upvotes",
          amount: 50,
          refType: "note",
          refId: note.id,
          note: `Note reached 10+ upvotes — "${n.title}"`,
        });
      }
    }
  }

  // ---- mcq + subjective banks ---------------------------------------
  const bankSize: Record<string, number> = {};
  for (const [key, bank] of Object.entries(CHAPTER_CONTENT)) {
    const chId = chapterIds[key];
    if (!chId) continue;
    for (const m of bank.mcqs) {
      await db.insert(mcqQuestions).values({
        chapterId: chId,
        qtext: m.q,
        options: m.options,
        correctIndex: m.correct,
        explanation: m.why,
        isPyq: !!m.pyq,
        pyqTag: m.pyq ?? "Practice",
      });
      bankSize[key] = (bankSize[key] ?? 0) + 1;
    }
    for (const sq of bank.subj) {
      await db.insert(subjectiveQuestions).values({
        chapterId: chId,
        qtext: sq.q,
        marks: sq.marks,
        rubric: sq.rubric,
        modelAnswer: sq.answer,
      });
    }
  }

  // ---- attempts + xp -------------------------------------------------
  for (const [key, byUser] of Object.entries(ATTEMPTS)) {
    const chId = chapterIds[key];
    const total = bankSize[key] ?? 20;
    for (const [handle, score] of Object.entries(byUser)) {
      const answers = Array.from({ length: total }, (_, i) =>
        i < score ? pick(4) : (pick(4) + 1) % 4,
      );
      await db.insert(mcqAttempts).values({
        userId: userIds[handle],
        chapterId: chId,
        answers,
        score,
        total,
        durationSec: 240 + pick(480),
        xpEarned: 10 * score,
      });
      await db.insert(xpEvents).values({
        userId: userIds[handle],
        type: "objective",
        amount: 10 * score,
        refType: "chapter",
        refId: chId,
        note: `Objective Test · ${chapterTitles[key]} · ${score}/${total}`,
      });
    }
  }

  for (const d of SUBJECTIVE_DONE) {
    const chId = chapterIds[d.chapter];
    await db.insert(subjectiveAttempts).values({
      userId: userIds[d.handle],
      chapterId: chId,
      answers: { 1: "Self-reviewed against the model marking scheme." },
      xpEarned: 30,
    });
    await db.insert(xpEvents).values({
      userId: userIds[d.handle],
      type: "subjective",
      amount: 30,
      refType: "chapter",
      refId: chId,
      note: `Subjective Practice · ${chapterTitles[d.chapter]}`,
    });
  }

  console.log("Seed complete.");
  console.log(`  users:        ${DEMO_USERS.length}`);
  console.log(`  chapters:     ${Object.keys(chapterIds).length}`);
  console.log(`  video sets:   ${Object.keys(videosByChapter).length}`);
  console.log(`  note sets:    ${Object.keys(notesByChapter).length}`);
  console.log(`  MCQ banks:    ${Object.entries(bankSize).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`  attempts:     ${Object.values(ATTEMPTS).reduce((a, b) => a + Object.keys(b).length, 0)} objective, ${SUBJECTIVE_DONE.length} subjective`);
  void sql; // silence unused-import warning if sql is removed in future edits
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sqlite.close());
