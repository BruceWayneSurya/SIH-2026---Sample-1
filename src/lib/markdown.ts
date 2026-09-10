/**
 * Minimal Markdown reader for model output.
 *
 * The AI tutor and study tools print text produced by a language model, which
 * is normally Markdown. Rendering it verbatim shows students literal `**` and
 * `###`. A full Markdown engine is not justified for a chat bubble, and the
 * portal ships a data-saver mode for low-bandwidth users, so this covers the
 * subset models actually emit: headings, emphasis, inline code, fenced code,
 * lists, block quotes and rules.
 *
 * It is deliberately pure and returns data, never markup. The React layer turns
 * that data into elements, so model output is never interpreted as HTML.
 */

export type MdInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string };

export type MdBlock =
  | { kind: "heading"; level: number; inline: MdInline[] }
  | { kind: "paragraph"; inline: MdInline[] }
  | { kind: "list"; ordered: boolean; items: MdInline[][] }
  | { kind: "code"; text: string }
  | { kind: "quote"; inline: MdInline[] }
  | { kind: "rule" };

/** Bold first so `**x**` is not read as two italic markers. */
const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

const FENCE = /^\s*```/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^>\s?(.*)$/;
const UNORDERED = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

/** Split one line into runs of plain text, bold, italic and inline code. */
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

    const firstList = line.match(ORDERED) ? ORDERED : UNORDERED;
    if (firstList.test(line)) {
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
