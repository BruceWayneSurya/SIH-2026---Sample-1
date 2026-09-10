/**
 * Minimal Markdown reader for model output.
 *
 * The AI tutor and study tools print text produced by a language model, which
 * is normally Markdown. Rendering it verbatim shows students literal `**` and
 * `###`. A full Markdown engine is not justified for a chat bubble, and the
 * portal ships a data-saver mode for low-bandwidth users, so this covers the
 * subset models actually emit: headings, emphasis, inline code, fenced code,
 * lists, block quotes, rules and mathematics.
 *
 * It is deliberately pure and returns data, never markup. The React layer turns
 * that data into elements, so model output is never interpreted as HTML.
 */

import { normalizeMath, parseMath, type MathNode } from "@/lib/math";

export type MdInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "math"; tex: string; display: boolean; nodes: MathNode[] };

export type MdBlock =
  | { kind: "heading"; level: number; inline: MdInline[] }
  | { kind: "paragraph"; inline: MdInline[] }
  | { kind: "math"; tex: string; nodes: MathNode[] }
  | { kind: "list"; ordered: boolean; items: MdInline[][] }
  | { kind: "code"; text: string }
  | { kind: "quote"; inline: MdInline[] }
  | { kind: "rule" };

/** Inline code span: a backtick, one or more non-backticks, a backtick. */
const CODE_SPAN = "`[^`]+`";

/** A brace group, nested up to three levels deep. */
const GROUP = String.raw`\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}`;

/**
 * Mathematics, in the order the alternatives must be tried.
 *
 * The four delimited forms come first: `$$...$$` and `\[...\]` are display
 * equations, `$...$` and `\(...\)` inline. Models sometimes skip the
 * delimiters entirely and send raw TeX, so the last three cover the unambiguous
 * cases — fractions, radicals and script notation. A bare backslash command is
 * deliberately not matched on its own, otherwise a Windows path such as
 * `C:\path\to\file` in a reply would be eaten as mathematics.
 */
const MATH = [
  String.raw`\$\$[\s\S]+?\$\$`,
  String.raw`\\\[[\s\S]+?\\\]`,
  String.raw`\\\(.+?\\\)`,
  String.raw`\$[^$\n]+?\$`,
  String.raw`\\[dt]?frac\s*` + GROUP + String.raw`\s*` + GROUP,
  String.raw`\\sqrt\s*(?:\[[^\]\n]*\])?\s*` + GROUP,
  // Script notation. A caret in prose is essentially always mathematics, but an
  // underscore is how identifiers are spelled, so "_letter" only counts when
  // the base starts a token — otherwise max_value and min_value become maths.
  // "_digit" and a braced group are always safe, which keeps H_2O and a_{n+1}.
  String.raw`[A-Za-z0-9)\]]\s*\^\s*(?:\{[^{}\n]*\}|[A-Za-z0-9])`,
  String.raw`[A-Za-z0-9)\]]\s*_\s*(?:\{[^{}\n]*\}|\d)`,
  String.raw`(?<![A-Za-z0-9])[A-Za-z0-9)\]]\s*_\s*[A-Za-z]`,
].join("|");

/**
 * Inline emphasis, with the flanking rules that keep prose intact.
 *
 * A delimiter only opens emphasis when the next character is not whitespace,
 * and only closes it when the previous one is not whitespace. Without that, the
 * `*` in "5 * 3" pairs with a later real marker and eats the sentence.
 * Underscores additionally must not sit inside a word, or an identifier such as
 * max_value and min_value renders as italics.
 *
 * Bold alternatives come first so `**x**` is not read as two italics.
 */
const INLINE = new RegExp(
  [
    MATH,
    String.raw`\*\*(?=\S)[^*]+?(?<=\S)\*\*`,
    String.raw`(?<!\w)__(?=\S)[^_]+?(?<=\S)__(?!\w)`,
    CODE_SPAN,
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

/** A paragraph that is nothing but a display equation. */
const DISPLAY_MATH = /^\$\$([\s\S]+)\$\$$|^\\\[([\s\S]+)\\\]$/;

function toMath(token: string): MdInline {
  let tex = token;
  let display = false;

  if (tex.startsWith("$$")) {
    tex = tex.slice(2, -2);
    display = true;
  } else if (tex.startsWith("\\[")) {
    tex = tex.slice(2, -2);
    display = true;
  } else if (tex.startsWith("\\(")) {
    tex = tex.slice(2, -2);
  } else if (tex.startsWith("$")) {
    tex = tex.slice(1, -1);
  }

  tex = tex.trim();
  return { kind: "math", tex, display, nodes: normalizeMath(parseMath(tex)) };
}

/** Split one line into runs of plain text, bold, italic, code and mathematics. */
export function parseInline(text: string): MdInline[] {
  const parts: MdInline[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > cursor) parts.push({ kind: "text", text: text.slice(cursor, start) });
    const token = match[0];
    const head = token[0];
    if (head === "$" || head === "\\") parts.push(toMath(token));
    else if (token.startsWith("**") || token.startsWith("__"))
      parts.push({ kind: "bold", text: token.slice(2, -2) });
    else if (head === "`") parts.push({ kind: "code", text: token.slice(1, -1) });
    else if (token.includes("^") || token.includes("_")) parts.push(toMath(token));
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
    ORDERED.test(line)
  );
}

/** Turn model output into a list of blocks the UI can render as elements. */
export function parseMarkdown(source: string): MdBlock[] {
  const lines = String(source ?? "").replace(/\r\n/g, "\n").split("\n");
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

    // A paragraph holding only a display equation renders centred on its own
    // line instead of inside a <p>, where a block element would be invalid.
    const equation = body.join("\n").trim().match(DISPLAY_MATH);
    if (equation) {
      const tex = (equation[1] ?? equation[2] ?? "").trim();
      blocks.push({ kind: "math", tex, nodes: normalizeMath(parseMath(tex)) });
      continue;
    }

    blocks.push({ kind: "paragraph", inline: parseInline(body.join("\n")) });
  }

  return blocks;
}
