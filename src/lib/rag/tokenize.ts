/**
 * Tokeniser for the textbook index. Small on purpose: the corpus for a single
 * chapter is a few hundred paragraphs, so an in-process BM25 pass beats any
 * external vector store on latency, cost and — most importantly for a school —
 * the ability to run with no network at all.
 */

/** English function words carry no retrieval signal and inflate the index. */
const STOPWORDS = new Set(
  `a an the and or but if then than that this these those of in on at to for from with without by as is are was were be been being it its it's their there here we you they he she i do does did done doing not no nor so such too very can could should would may might must will shall have has had having about into over under again further once only own same few more most other some any each both between during before after above below up down out off why how what which who whom when where`.split(
    /\s+/,
  ),
);

const UNICODE_LETTERS = /[^\p{L}\p{N}\s]/gu;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(UNICODE_LETTERS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Very light suffix folding — enough to match "burns"/"burning"/"burn". */
function fold(token: string): string {
  if (token.length <= 4) return token;
  for (const suffix of ["ing", "ings", "ed", "es", "s"]) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3)
      return token.slice(0, token.length - suffix.length);
  }
  return token;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(fold)
    .filter((token) => token.length > 0);
}

export function termFrequencies(tokens: string[]): Record<string, number> {
  const frequencies: Record<string, number> = {};
  for (const token of tokens) frequencies[token] = (frequencies[token] ?? 0) + 1;
  return frequencies;
}

export function uniqueTerms(text: string): string[] {
  return [...new Set(tokenize(text))];
}
