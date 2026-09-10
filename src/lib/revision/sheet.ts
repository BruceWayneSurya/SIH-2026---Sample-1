/**
 * One-page, printable A4 revision sheet.
 *
 * Government schools have printers far more often than they have tablets, so
 * the deliverable is a single sheet a teacher can hand out: the chapter's
 * learning outcomes, the definition of each, the traps that cost marks, and a
 * rapid-fire check with answers. The same model renders twice —
 *   • React/HTML for the on-screen page (with `@page` print rules)
 *   • SVG for the offline pack and for a direct "Print / Save as PDF" download
 * which means the printable artefact is generated from the same data as the
 * dashboard, never hand-maintained.
 */

import type { LearningOutcome } from "../outcomes/taxonomy";

export type RevisionSheetQuestion = {
  qtext: string;
  answer: string;
  page: number | null;
  loConcept: string | null;
};

export type RevisionSheet = {
  chapterLabel: string;
  title: string;
  book: string | null;
  outcomes: {
    code: string;
    concept: string;
    statement: string;
    definition: string;
    page: number;
    keywords: string[];
    trap: string | null;
  }[];
  diagram: LearningOutcome["diagram"] | "none";
  rapidFire: RevisionSheetQuestion[];
  sources: string[];
  generatedAt: string;
  coverage: { outcomes: number; questions: number };
};

export function buildRevisionSheet(input: {
  classNo: number;
  subjectName: string;
  chapterNum: number;
  chapterTitle: string;
  book?: string | null;
  outcomes: LearningOutcome[];
  questions: {
    qtext: string;
    options: string[];
    correctIndex: number;
    loCode: string | null;
    trap?: string | null;
    textbookPage?: number | null;
  }[];
  sources: string[];
  now?: Date;
}): RevisionSheet {
  const outcomes = [...input.outcomes].sort((a, b) => a.order - b.order);
  const rapidFire = input.questions.slice(0, 5).map((question) => ({
    qtext: question.qtext,
    answer: question.options[question.correctIndex] ?? "",
    page:
      outcomes.find((outcome) => outcome.code === question.loCode)?.textbookPage ??
      null,
    loConcept:
      outcomes.find((outcome) => outcome.code === question.loCode)?.concept ?? null,
  }));

  return {
    chapterLabel: `Class ${input.classNo} · ${input.subjectName} · Chapter ${input.chapterNum}`,
    title: input.chapterTitle,
    book: input.book ?? null,
    outcomes: outcomes.map((outcome) => ({
      code: outcome.code,
      concept: outcome.concept,
      statement: outcome.statement,
      definition: outcome.definition,
      page: outcome.textbookPage,
      keywords: outcome.keywords,
      trap: outcome.misconceptions[0] ?? null,
    })),
    diagram:
      outcomes.find((outcome) => outcome.diagram !== "none")?.diagram ?? "none",
    rapidFire,
    sources: [...new Set(input.sources)].slice(0, 6),
    generatedAt: (input.now ?? new Date()).toISOString().slice(0, 10),
    coverage: { outcomes: outcomes.length, questions: input.questions.length },
  };
}

/* ------------------------------- SVG ------------------------------- */

const PAGE_WIDTH = 595; // A4 at 72 dpi
const PAGE_HEIGHT = 842;
const MARGIN = 40;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** SVG has no text wrapping — fold on word boundaries at a character budget. */
export function wrapText(text: string, maxChars: number, maxLines = 4): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = word;
    } else line = `${line} ${word}`;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line.trim());
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").length;
    if (consumed < text.length - 1)
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

function tspan(x: number, y: number, lines: string[], size: number, fill: string) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size + 3}">${escapeXml(line)}</tspan>`)
    .join("")}</text>`;
}

/** Fire-triangle glyph: fuel + air + heat around a small flame. */
function diagramSvg(kind: RevisionSheet["diagram"], x: number, y: number): string {
  if (kind === "fire-triangle") {
    return `
  <g transform="translate(${x},${y})">
    <polygon points="0,74 84,74 42,8" fill="#fff7ed" stroke="#f59e0b" stroke-width="1.6"/>
    <text x="42" y="48" font-size="10" text-anchor="middle" fill="#7c2d12" font-weight="bold">FUEL</text>
    <text x="8" y="90" font-size="10" fill="#7c2d12" font-weight="bold">AIR (O₂)</text>
    <text x="44" y="90" font-size="10" fill="#7c2d12" font-weight="bold">HEAT</text>
    <text x="42" y="66" font-size="8" text-anchor="middle" fill="#92400e">remove any one → no fire</text>
  </g>`;
  }
  if (kind === "flame-zones") {
    return `
  <g transform="translate(${x},${y})">
    <path d="M42 6 C62 34 70 50 62 64 C56 74 28 74 22 64 C14 50 22 34 42 6 Z" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.4"/>
    <path d="M42 20 C56 42 60 52 54 62 C50 68 34 68 30 62 C24 52 28 42 42 20 Z" fill="#fde68a" stroke="#f59e0b" stroke-width="1"/>
    <path d="M42 36 C50 50 52 56 48 61 C45 65 39 65 36 61 C32 56 34 50 42 36 Z" fill="#1e293b"/>
    <text x="92" y="26" font-size="9" fill="#334155">Outermost (blue): complete burning,</text>
    <text x="92" y="38" font-size="9" fill="#334155">plenty of air — hottest zone</text>
    <text x="92" y="56" font-size="9" fill="#334155">Middle (yellow): partial burning, soot</text>
    <text x="92" y="74" font-size="9" fill="#334155">Inner (dark): unburnt wax vapour</text>
  </g>`;
  }
  return "";
}

/**
 * Renders the sheet as a standalone SVG document. Content is capped so it always
 * fits one A4 page: 7 outcomes, 5 rapid-fire questions.
 */
export function renderRevisionSvg(sheet: RevisionSheet): string {
  const parts: string[] = [];
  let y = MARGIN;

  parts.push(
    `<rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>`,
    `<rect x="0" y="0" width="${PAGE_WIDTH}" height="6" fill="#f97316"/>`,
    `<text x="${MARGIN}" y="${y + 8}" font-size="9" fill="#f97316" font-weight="bold" letter-spacing="1.5">PRAGYAN · NCERT REVISION SHEET</text>`,
  );
  y += 26;
  parts.push(
    tspan(MARGIN, y, [sheet.chapterLabel], 10, "#64748b"),
  );
  y += 20;
  parts.push(tspan(MARGIN, y, wrapText(sheet.title, 44, 2), 20, "#0f172a"));
  y += 26 + (wrapText(sheet.title, 44, 2).length - 1) * 22;
  if (sheet.book) {
    parts.push(tspan(MARGIN, y, [`Textbook: ${sheet.book}`], 9.5, "#475569"));
    y += 16;
  }
  parts.push(
    `<line x1="${MARGIN}" y1="${y}" x2="${PAGE_WIDTH - MARGIN}" y2="${y}" stroke="#e2e8f0"/>`,
  );
  y += 18;

  const diagram = diagramSvg(sheet.diagram, PAGE_WIDTH - MARGIN - 190, y - 6);
  const outcomesBudget = diagram ? 4 : 7;
  sheet.outcomes.slice(0, outcomesBudget).forEach((outcome, index) => {
    parts.push(tspan(MARGIN, y, [`${index + 1}. ${outcome.concept}  (p. ${outcome.page})`], 11.5, "#0f172a"));
    y += 15;
    const statement = wrapText(outcome.statement, 78, 3);
    parts.push(tspan(MARGIN, y, statement, 9.5, "#334155"));
    y += statement.length * 12 + 4;
    const definition = wrapText(outcome.definition, 84, 3);
    parts.push(tspan(MARGIN, y, definition, 9, "#475569"));
    y += definition.length * 11 + 10;
  });

  if (diagram) {
    parts.push(diagram);
    y = Math.max(y, MARGIN + 40 + 140);
  }

  if (sheet.outcomes.length > outcomesBudget) {
    const rest = sheet.outcomes.slice(outcomesBudget);
    parts.push(
      tspan(MARGIN, y, ["Also in this chapter:"], 10, "#0f172a"),
    );
    y += 14;
    const line = rest
      .map((outcome) => `${outcome.concept} (p. ${outcome.page})`)
      .join(" · ");
    const wrapped = wrapText(line, 96, 2);
    parts.push(tspan(MARGIN, y, wrapped, 9, "#475569"));
    y += wrapped.length * 11 + 8;
  }

  const cautions = sheet.outcomes
    .map((outcome) => outcome.trap)
    .filter((trap): trap is string => Boolean(trap))
    .slice(0, 3);
  if (cautions.length) {
    parts.push(`<rect x="${MARGIN}" y="${y}" width="${PAGE_WIDTH - 2 * MARGIN}" height="${18 + cautions.length * 12}" fill="#fff1f2" rx="4"/>`);
    parts.push(tspan(MARGIN + 8, y + 14, ["Marks lost here"], 10, "#9f1239"));
    y += 16;
    for (const caution of cautions) {
      parts.push(tspan(MARGIN + 8, y + 10, wrapText(`• ${caution}`, 92, 1), 9, "#881337"));
      y += 12;
    }
    y += 10;
  }

  if (sheet.rapidFire.length) {
    parts.push(tspan(MARGIN, y, ["Rapid check (answers at the end)"], 11, "#0f172a"));
    y += 16;
    sheet.rapidFire.forEach((item, index) => {
      const lines = wrapText(`${index + 1}. ${item.qtext}`, 88, 2);
      parts.push(tspan(MARGIN, y, lines, 9, "#334155"));
      y += lines.length * 11 + 4;
    });
    y += 6;
    parts.push(tspan(MARGIN, y, ["Answers"], 10, "#0f172a"));
    y += 14;
    const answers = sheet.rapidFire
      .map((item, index) => `${index + 1}. ${item.answer}`)
      .join("   ");
    const wrapped = wrapText(answers, 100, 2);
    parts.push(tspan(MARGIN, y, wrapped, 9, "#166534"));
    y += wrapped.length * 11 + 8;
  }

  const footerY = PAGE_HEIGHT - MARGIN;
  parts.push(
    `<line x1="${MARGIN}" y1="${footerY - 20}" x2="${PAGE_WIDTH - MARGIN}" y2="${footerY - 20}" stroke="#e2e8f0"/>`,
    tspan(MARGIN, footerY - 6, [`Sources: ${sheet.sources.join(" · ") || "NCERT textbook"}`], 8, "#94a3b8"),
    tspan(MARGIN, footerY + 6, [`Generated ${sheet.generatedAt} from ${sheet.coverage.outcomes} learning outcomes and ${sheet.coverage.questions} chapter questions. Print or save as PDF.`], 8, "#94a3b8"),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}" role="img" aria-label="Revision sheet for ${escapeXml(sheet.title)}">${parts.join("")}</svg>`;
}
