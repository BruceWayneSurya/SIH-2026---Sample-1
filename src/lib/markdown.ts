/**
 * Minimal Markdown reader for model output.
 *
 * The AI tutor and study tools print text produced by a language model, which
 * is normally Markdown. Rendering it verbatim shows students literal `**` and
 * `###`. A full Markdown engine is not justified for a chat bubble, and the
 * portal ships a data-saver mode for low-bandwidth users, so this covers the
 * subset models actually emit: headings, emphasis, inline code, fenced code,
 * lists, block quotes, rules — and mathematics.
 *
 * Math is kept as raw LaTeX (`$x^2$`, `$$\frac{a}{b}$$`) in the data so the
 * React layer can hand it to KaTeX, which builds typeset fractions, exponents,
 * subscripts and every other notation a science answer needs.
 *
 * It is deliberately pure and returns data, never markup. The React layer turns
 * that data into elements, so model output is never interpreted as HTML.
 */

export type MdInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "math"; tex: string; display: boolean };

export type MdBlock =
  | { kind: "heading"; level: number; inline: MdInline[] }
  | { kind: "paragraph"; inline: MdInline[] }
  | { kind: "list"; ordered: boolean; items: MdInline[][] }
  | { kind: "code"; text: string }
  | { kind: "quote"; inline: MdInline[] }
  | { kind: "rule" }
  | { kind: "math"; tex: string; display: true };

/** Inline code span: a backtick, one or more non-backticks, a backtick. */
const CODE_SPAN = "`[^`]+`";

/**
 * Inline emphasis, with the flanking rules that keep prose intact.
 *
 * A delimiter only opens emphasis when the next character is not whitespace,
 * and only closes it when the previous one is not whitespace. Without that, the
 * `*` in "5 * 3" pairs with a later real marker and eats the sentence.
 * Underscores additionally must not sit inside a word, or an identifier such as
 * max_value and min_value renders as italics.
 *
 * Bold alternatives come first so `**x**` is not read as two italics, and math
 * before italic so `$a*b$` stays one formula.
 *
 * Math guards against prose dollars: the content must start and end with a
 * non-space, single-dollar spans cannot cross a line break, and a closing `$`
 * cannot sit in front of a digit — so "$5 and $10" stays plain text while
 * "$\frac{1}{2}$" becomes a fraction.
 */
const INLINE = new RegExp(
  [
    String.raw`\*\*(?=\S)[^*]+?(?<=\S)\*\*`,
    String.raw`(?<!\w)__(?=\S)[^_]+?(?<=\S)__(?!\w)`,
    CODE_SPAN,
    String.raw`\$\$(?=\S)[^$]+?(?<=\S)\$\$`,
    String.raw`\$(?=\S)[^$\n]+?(?<=\S)\$(?!\d)`,
    String.raw`\*(?=\S)[^*\n]+?(?<=\S)\*`,
    String.raw`(?<!\w)_(?=\S)[^_\n]+?(?<=\S)_(?!\w)`,
  ].join("|"),
  "g",
);

const FENCE = /^\s*```/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^>\s?(.*)$/;
const UNORDERED = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
/** Opening of a `$$ … $$` display formula that stands on its own lines. */
const DISPLAY_MATH = /^\s*\$\$/;

/**
 * LaTeX commands models write even when they forget the `$` delimiters.
 * Anything here appearing bare in prose is wrapped so it still typesets.
 */
const BARE_LATEX =
  /\\(?:frac|dfrac|tfrac|sqrt|times|div|cdot|leq|geq|le|ge|neq|ne|approx|pm|mp|to|rightarrow|Rightarrow|implies|iff|leftrightarrow|pi|theta|alpha|beta|gamma|delta|Delta|omega|Omega|lambda|mu|nu|rho|sigma|phi|Phi|epsilon|eta|tau|kappa|xi|zeta|psi|chi|deg|circ|infty|sum|prod|int|perp|parallel|angle|triangle|overline|underline|widehat|vec|hat|bar|dot|ddot|text|mathrm|mathbf|left|right|begin|end)(?![a-zA-Z])/;

/** Command plus the brace groups that follow it, e.g. \frac{a}{b}. */
const LATEX_TOKEN = /\\(?:[a-zA-Z]+)(?:\{[^{}\n]*\}){0,2}/g;

/**
 * Bare superscripts/subscripts such as x^2, 10^-19, a^{n+1}.
 * The base is a short alphanumerical run (or a closing bracket) so 10^-19 keeps
 * its whole base, the exponent is a brace group or a short signed run, and
 * trailing letters keep chemical formulae like H_2O together.
 */
const BARE_SCRIPT = /([A-Za-z0-9]{1,10}|\))([\^_])(\{[^{}\n]{1,24}\}|-?[A-Za-z0-9]{1,6})/g;

/**
 * Placeholder used while auto-wrapping, so math that is already delimited is
 * never wrapped a second time.
 */
const MATH_SENTINEL = "\u0000";

type Segment = { text: string; code: boolean };

/** Split one line of prose into code spans and plain text. */
function splitCodeSpans(line: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of line.matchAll(/`[^`]+`/g)) {
    const start = match.index ?? 0;
    if (start > cursor)
      segments.push({ text: line.slice(cursor, start), code: false });
    segments.push({ text: match[0], code: true });
    cursor = start + match[0].length;
  }
  if (cursor < line.length) segments.push({ text: line.slice(cursor), code: false });
  return segments.length ? segments : [{ text: line, code: false }];
}

/** Wrap bare LaTeX tokens and bare exponents in $…$ so KaTeX picks them up. */
function wrapBareMath(prose: string): string {
  if (!prose) return prose;
  // Mask existing delimited math so the wrappers below cannot nest inside it.
  const masked: string[] = [];
  const hidden = prose.replace(
    /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g,
    (match) => {
      masked.push(match);
      return `${MATH_SENTINEL}${masked.length - 1}${MATH_SENTINEL}`;
    },
  );

  let wrapped = hidden;
  if (BARE_LATEX.test(hidden)) {
    wrapped = wrapped.replace(LATEX_TOKEN, (token) =>
      // Only wrap real commands; \{ escapes and lone backslashes stay text.
      /^\\[a-zA-Z]+/.test(token) ? `$${token}$` : token,
    );
  }
  // x^2, 10^-19, H_2O → $x^2$, $10^-19$, $H_2O$ (skip URLs and email-like text).
  if (/[\^_]/.test(wrapped) && !/:\/\/|@/.test(wrapped)) {
    wrapped = wrapped.replace(BARE_SCRIPT, (token) => `$${token}$`);
  }

  return wrapped.replace(
    new RegExp(`${MATH_SENTINEL}(\\d+)${MATH_SENTINEL}`, "g"),
    (_, index: string) => masked[Number(index)] ?? "",
  );
}

/**
 * Best-effort normalisation of model math before parsing:
 * - `\(...\)` and `\[...\]` become `$...$` / `$$...$$`
 * - bare `\frac{a}{b}`, `x^2`, `10^-19`… get wrapped in `$...$`
 *
 * Fenced code and inline code are never touched — a code sample that explains
 * `x^2` as code must stay code.
 */
export function normalizeModelMath(source: string): string {
  const text = String(source ?? "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const out: string[] = [];
  let inFence = false;
  let inDisplayMath = false;

  for (const line of lines) {
    if (inFence) {
      if (FENCE.test(line)) inFence = false;
      out.push(line);
      continue;
    }
    if (inDisplayMath) {
      out.push(line);
      if (/\$\$\s*$/.test(line)) inDisplayMath = false;
      continue;
    }
    if (FENCE.test(line)) {
      inFence = true;
      out.push(line);
      continue;
    }
    // A line that opens $$ without closing it starts a display block; its
    // body lines are already LaTeX and must not be wrapped again.
    if (/^\s*\$\$/.test(line) && !/\$\$\s*$/.test(line.replace(/^\s*\$\$/, ""))) {
      inDisplayMath = true;
      out.push(line);
      continue;
    }
    let processed = line
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, body: string) => `$${body.trim()}$`)
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, body: string) => `$$${body.trim()}$$`);
    processed = splitCodeSpans(processed)
      .map((segment) => (segment.code ? segment.text : wrapBareMath(segment.text)))
      .join("");
    out.push(processed);
  }
  return out.join("\n");
}

/** Split one line into runs of plain text, emphasis, code and mathematics. */
export function parseInline(text: string): MdInline[] {
  const parts: MdInline[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > cursor) parts.push({ kind: "text", text: text.slice(cursor, start) });
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__"))
      parts.push({ kind: "bold", text: token.slice(2, -2) });
    else if (token.startsWith("`"))
      parts.push({ kind: "code", text: token.slice(1, -1) });
    else if (token.startsWith("$$"))
      parts.push({ kind: "math", tex: token.slice(2, -2), display: true });
    else if (token.startsWith("$"))
      parts.push({ kind: "math", tex: token.slice(1, -1), display: false });
    else parts.push({ kind: "italic", text: token.slice(1, -1) });
    cursor = start + token.length;
  }
  if (cursor < text.length) parts.push({ kind: "text", text: text.slice(cursor) });
  return parts;
}

function isBlockStart(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    UNORDERED.test(line) ||
    ORDERED.test(line) ||
    DISPLAY_MATH.test(line)
  );
}

/** Turn model output into a list of blocks the UI can render as elements. */
export function parseMarkdown(source: string): MdBlock[] {
  const lines = normalizeModelMath(source).split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code: keep the body verbatim, emphasis inside is not markup.
    if (FENCE.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // step over the closing fence, or past the end if it was never sent
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    // Display formula standing on its own lines: $$ … $$ or one-line $$…$$.
    if (DISPLAY_MATH.test(line)) {
      const single = line.match(/^\s*\$\$(.+)\$\$\s*$/);
      if (single) {
        blocks.push({ kind: "math", tex: single[1].trim(), display: true });
        i++;
        continue;
      }
      const body: string[] = [line.replace(/^\s*\$\$/, "")];
      i++;
      while (i < lines.length && !/\$\$\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        body.push(lines[i].replace(/\$\$\s*$/, ""));
        i++;
      }
      blocks.push({
        kind: "math",
        tex: body.join("\n").trim(),
        display: true,
      });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        inline: parseInline(heading[2]),
      });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(lines[i].match(QUOTE)?.[1] ?? "");
        i++;
      }
      blocks.push({ kind: "quote", inline: parseInline(body.join("\n")) });
      continue;
    }

    if (ORDERED.test(line) || UNORDERED.test(line)) {
      const ordered = ORDERED.test(line);
      const items: MdInline[][] = [];
      while (i < lines.length) {
        const item = lines[i].match(ordered ? ORDERED : UNORDERED);
        if (!item) break;
        items.push(parseInline(item[1]));
        i++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // Paragraph: absorb wrapped lines until a blank line or a new block.
    const body: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      body.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "paragraph", inline: parseInline(body.join("\n")) });
  }

  return blocks;
}
