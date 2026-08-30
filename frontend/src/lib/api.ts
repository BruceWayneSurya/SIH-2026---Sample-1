/**
 * Typed client for the Pragyan REST API (backend/).
 *
 * Every request uses a relative URL. Next.js rewrites /api/* and /uploads/*
 * to the backend server (see next.config.ts), so the browser talks to the same
 * origin and session cookies flow automatically — no CORS in the browser.
 */

export type ApiUser = {
  id: number;
  handle: string;
  name: string;
  email: string;
  role: "student" | "faculty";
  className: number | null;
  state: string | null;
  school: string | null;
  subjectSpecialization: string | null;
  institutionId: string | null;
  isGuest: boolean;
};

export type Stats = {
  xp: number;
  rank: number | null;
  accuracy: number | null;
  objectiveAttempts: number;
  notes: number;
  recent: {
    id: number;
    type: string;
    amount: number;
    note: string;
    createdAt: string;
  }[];
};

export type SubjectSummary = {
  slug: string;
  name: string;
  total: number;
  practiced: number;
  testable: number;
};

export type TestableChapter = {
  key: string;
  href: string;
  subject: string;
  label: string;
  best: string | null;
};

export type HomeData = {
  user: ApiUser;
  stats: Stats;
  subjects: SubjectSummary[];
  testableChapters: TestableChapter[];
  facultyQueue: { id: number; title: string; chapter: string; author: string }[];
};

export type ChapterListItem = {
  id: number;
  num: number;
  title: string;
  slug: string;
  summary: string | null;
  outcomeIds: string[];
  dikshaCode: string | null;
  videoCount: number;
  noteCount: number;
  mcqCount: number;
  pyqPct: number;
  subjCount: number;
  bestScore: number | null;
  bestTotal: number | null;
};

export type RankedNote = {
  id: number;
  title: string;
  content: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileType: "text" | "pdf" | "image";
  authorName: string;
  authorIsFaculty: boolean;
  facultyVerified: boolean;
  verifiedByName: string | null;
  upvotes: number;
  iVoted: boolean;
  rankScore: number;
  createdAt: string;
};

export type ChapterData = {
  user: ApiUser;
  chapter: {
    id: number;
    num: number;
    title: string;
    slug: string;
    outcomeIds: string[];
    dikshaCode: string | null;
    summary: string | null;
  };
  videos: {
    id: number;
    title: string;
    kind: "mp4" | "youtube";
    videoUrl: string;
    durationSec: number;
    fileSizeMb: number | null;
    markers: { t: number; label: string }[];
    slidesUrl: string | null;
    slidesTitle: string | null;
    uploadedByName: string | null;
  }[];
  mcqs: {
    id: number;
    qtext: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    isPyq: boolean;
    pyqTag: string | null;
  }[];
  subj: {
    id: number;
    qtext: string;
    marks: 2 | 3 | 5;
    rubric: { step: string; marks: number }[];
    modelAnswer: string;
  }[];
  notes: RankedNote[];
  best: { score: number; total: number; xpEarned: number } | null;
  top: {
    id: number;
    handle: string;
    name: string;
    school: string | null;
    chapterXp: number;
    bestScore: number | null;
    bestTotal: number | null;
    attempts: number;
  }[];
  pyqCount: number;
  pyqPct: number;
};

export type LeaderboardData = {
  user: ApiUser;
  classNo: number;
  myRank: number;
  board: {
    id: number;
    handle: string;
    name: string;
    school: string | null;
    state: string | null;
    xp: number;
    accuracy: number | null;
    attempts: number;
    badges: string[];
  }[];
  opts: { id: number; title: string; subjectName: string; num: number }[];
  chapter: {
    board: {
      id: number;
      handle: string;
      name: string;
      school: string | null;
      chapterXp: number;
      bestScore: number | null;
      bestTotal: number | null;
      attempts: number;
    }[];
    meta: { id: number; title: string; subjectName: string; num: number } | null;
  } | null;
};

export type AccountData = {
  user: ApiUser;
  stats: Stats;
  badges: string[];
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON (e.g. redirects)
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  getMe: () => req<{ user: ApiUser; xp: number }>("/api/me"),
  getHome: () => req<HomeData>("/api/home"),
  getAccount: () => req<AccountData>("/api/account"),
  getChapters: (classNo: number, subject: string) =>
    req<{ list: ChapterListItem[] }>(
      `/api/chapters?class=${classNo}&subject=${encodeURIComponent(subject)}`,
    ),
  getChapter: (classNo: number, subject: string, slug: string) =>
    req<ChapterData>(
      `/api/chapter/${classNo}/${encodeURIComponent(subject)}/${encodeURIComponent(slug)}`,
    ),
  getLeaderboard: (classNo: number, chapter?: number) =>
    req<LeaderboardData>(
      `/api/leaderboard?class=${classNo}${chapter ? `&chapter=${chapter}` : ""}`,
    ),
  login: (email: string, password: string) =>
    req<{ ok: boolean; redirect: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: Record<string, string>) =>
    req<{ ok: boolean; redirect: string }>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  logout: () => req<{ ok: boolean; redirect: string }>("/api/auth/logout", {
    method: "POST",
  }),
  voteNote: (id: number) =>
    req<{ ok: boolean; upvotes: number; voted: boolean; reward: number }>(
      `/api/notes/${id}/vote`,
      { method: "POST" },
    ),
  verifyNote: (id: number, verified: boolean) =>
    req<{ ok: boolean; facultyVerified: boolean }>(`/api/notes/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified }),
    }),
  getNotes: (chapterId: number) =>
    req<{ list: RankedNote[] }>(`/api/notes?chapterId=${chapterId}`),
  submitObjective: (chapterId: number, answers: number[], durationSec: number) =>
    req<{ ok: boolean; score: number; total: number; xpEarned: number; firstTime: boolean }>(
      `/api/objective/${chapterId}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, durationSec }),
      },
    ),
  submitSubjective: (chapterId: number, answers: Record<string, string>) =>
    req<{ ok: boolean; xpEarned: number; firstTime: boolean }>(
      `/api/subjective/${chapterId}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      },
    ),
};
