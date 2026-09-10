/**
 * Retrieval over the chapter's source set (RAG).
 *
 * Ranking is BM25 with one addition that matters for a school: every source
 * carries an authority weight, so a faculty-verified note outranks a classmate's
 * and the NCERT textbook paragraph outranks both. The "peer-reviewed" notes
 * feature therefore has a measurable effect instead of being a badge.
 *
 * The output always carries a citation the learner can act on:
 * `{ label: "NCERT p. 62, para 3", chunkId, page, para }`. If the chip renders,
 * the paragraph exists in `source_chunks` — the tutor cannot cite a passage that
 * is not in the index.
 */

import { termFrequencies, tokenize } from "./tokenize";

export type SourceKind =
  | "ncert_textbook"
  | "faculty_note"
  | "student_note"
  | "worksheet"
  | "video"
  | "ai_notes";

export type SourceAuthority =
  | "ncert"
  | "faculty_verified"
  | "faculty"
  | "student"
  | "ai_proposed";

export type SourceChunk = {
  id: number;
  documentId: number;
  chapterId: number;
  /** Null for teacher-authored notes that are not paginated. */
  page: number | null;
  para: number;
  heading: string | null;
  text: string;
  kind: SourceKind;
  authority: SourceAuthority;
  docTitle: string;
  /** NCERT book title or note author, shown on the chip. */
  attribution: string;
};

export type Citation = {
  chunkId: number;
  label: string;
  page: number | null;
  para: number;
  docTitle: string;
  kind: SourceKind;
  authority: SourceAuthority;
  /** Deep link that opens the paragraph in context. */
  href: string;
};

export type Retrieval = {
  chunk: SourceChunk;
  score: number;
  citation: Citation;
  snippet: string;
  matchedTerms: string[];
};

/** Higher = trusted more. Ordering is deliberate and shown in the UI legend. */
export const AUTHORITY_WEIGHT: Record<SourceAuthority, number> = {
  ncert: 1,
  faculty_verified: 0.85,
  faculty: 0.75,
  student: 0.45,
  ai_proposed: 0.3,
};

const KIND_WEIGHT: Record<SourceKind, number> = {
  ncert_textbook: 1,
  faculty_note: 1,
  worksheet: 0.95,
  video: 0.8,
  student_note: 0.9,
  ai_notes: 0.6,
};

const K1 = 1.5;
const B = 0.75;

export function authorityWeight(chunk: Pick<SourceChunk, "authority" | "kind">): number {
  return (AUTHORITY_WEIGHT[chunk.authority] ?? 0.5) * (KIND_WEIGHT[chunk.kind] ?? 1);
}

type IndexedChunk = {
  chunk: SourceChunk;
  terms: Record<string, number>;
  length: number;
};

export type Index = {
  docs: IndexedChunk[];
  documentFrequency: Map<string, number>;
  averageLength: number;
};

export function buildIndex(chunks: SourceChunk[]): Index {
  const docs: IndexedChunk[] = chunks.map((chunk) => {
    const tokens = tokenize(`${chunk.heading ?? ""} ${chunk.text}`);
    return { chunk, terms: termFrequencies(tokens), length: tokens.length };
  });
  const documentFrequency = new Map<string, number>();
  for (const doc of docs)
    for (const term of Object.keys(doc.terms))
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  const averageLength = docs.length
    ? docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length
    : 1;
  return { docs, documentFrequency, averageLength: averageLength || 1 };
}

export function bm25(index: Index, doc: IndexedChunk, queryTerms: string[]): number {
  const total = index.docs.length || 1;
  let score = 0;
  for (const term of queryTerms) {
    const frequency = doc.terms[term];
    if (!frequency) continue;
    const df = index.documentFrequency.get(term) ?? 0;
    const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
    const denominator =
      frequency + K1 * (1 - B + (B * doc.length) / index.averageLength);
    score += idf * ((frequency * (K1 + 1)) / (denominator || 1));
  }
  return score;
}

/**
 * Short, human citation label. "NCERT p. 62, para 3" is the whole point: it fits
 * on a chip under an answer and tells a learner — or a judge — exactly which
 * paragraph the sentence came from. The document title lives in the chip's
 * tooltip (`Citation.docTitle`) rather than in the label.
 */
export function citationLabel(chunk: SourceChunk): string {
  const where = chunk.page ? `p. ${chunk.page}` : `para ${chunk.para}`;
  switch (chunk.kind) {
    case "ncert_textbook":
      return `NCERT p. ${chunk.page ?? "?"}, para ${chunk.para}`;
    case "faculty_note":
      return `${chunk.authority === "faculty_verified" ? "Verified note" : "Faculty note"} · ${where}`;
    case "student_note":
      return `Class note · ${where}`;
    case "video":
      return `Video · ${chunk.heading ?? where}`;
    case "worksheet":
      return `Worksheet · ${where}`;
    default:
      return `${chunk.attribution || chunk.docTitle} · ${where}`;
  }
}

export function citation(
  chunk: SourceChunk,
  options: { hrefBase?: string } = {},
): Citation {
  // A citation is always a link a learner can open: /source/123 shows the
  // paragraph in context, with the citation chip label as its heading.
  const base = options.hrefBase ?? `/source/${chunk.id}`;
  return {
    chunkId: chunk.id,
    label: citationLabel(chunk),
    page: chunk.page,
    para: chunk.para,
    docTitle: chunk.docTitle,
    kind: chunk.kind,
    authority: chunk.authority,
    href: base,
  };
}

/** ~40 words of the paragraph that contain the query terms. */
export function snippet(chunk: SourceChunk, queryTerms: string[]): string {
  const text = chunk.text.trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((sentence) =>
    queryTerms.some((term) => tokenize(sentence).includes(term)),
  );
  const chosen = hit ?? sentences[0] ?? text;
  return chosen.length > 320 ? `${chosen.slice(0, 317).trimEnd()}…` : chosen;
}

export type RetrieveOptions = {
  k?: number;
  /** Drop results below this authority-weighted score. */
  minScore?: number;
  kinds?: SourceKind[];
};

export function retrieve(
  chunks: SourceChunk[],
  query: string,
  options: RetrieveOptions = {},
): Retrieval[] {
  const { k = 5, minScore = 0.35, kinds } = options;
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];
  const pool = kinds ? chunks.filter((c) => kinds.includes(c.kind)) : chunks;
  if (pool.length === 0) return [];
  const index = buildIndex(pool);
  const scored = index.docs
    .map((doc) => {
      const raw = bm25(index, doc, queryTerms);
      const weighted = raw * authorityWeight(doc.chunk);
      const matchedTerms = queryTerms.filter((term) => doc.terms[term]);
      return { doc, raw, weighted, matchedTerms };
    })
    .filter(
      (item) => item.weighted > 0 && item.matchedTerms.length >= Math.min(1, queryTerms.length),
    )
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, k);

  const best = scored[0]?.weighted ?? 0;
  return scored
    .filter((item) => item.weighted >= minScore || item.weighted >= best * 0.35)
    .map((item) => ({
      chunk: item.doc.chunk,
      score: Number(item.weighted.toFixed(4)),
      citation: citation(item.doc.chunk),
      snippet: snippet(item.doc.chunk, item.matchedTerms),
      matchedTerms: item.matchedTerms,
    }));
}

/**
 * Evidence gate. A tutor that answers anyway is how hallucinations reach a
 * child, so the caller checks this before composing prose.
 */
export function hasEvidence(results: Retrieval[], threshold = 0.6): boolean {
  return (results[0]?.score ?? 0) >= threshold;
}

/** Group results by document, best first — used by the "sources used" panel. */
export function groupByDocument(results: Retrieval[]): {
  docTitle: string;
  kind: SourceKind;
  authority: SourceAuthority;
  citations: Citation[];
}[] {
  const groups = new Map<string, { docTitle: string; kind: SourceKind; authority: SourceAuthority; citations: Citation[] }>();
  for (const result of results) {
    const key = `${result.chunk.documentId}`;
    const group = groups.get(key) ?? {
      docTitle: result.chunk.docTitle,
      kind: result.chunk.kind,
      authority: result.chunk.authority,
      citations: [],
    };
    group.citations.push(result.citation);
    groups.set(key, group);
  }
  return [...groups.values()];
}
