/**
 * Dependency-free PDF text extraction for the teacher content pipeline.
 *
 * A teacher uploads a PDF (their own notes, a worksheet, an e-textbook chapter)
 * and we need the words, not a rendering. This walks the file's content streams,
 * inflates them and pulls out the text-showing operators — no native binary, no
 * headless browser, which keeps the serverless bundle small and the deployment
 * simple.
 *
 * It handles the common case (a text layer encoded in a single-byte encoding).
 * PDFs whose text layer is a subsetted CID font with an `Identity-H` encoding —
 * some scanned-then-OCRed books — produce unusable strings; rather than pass
 * garbage to the model, `extractPdfText()` reports `unreadable` and the UI asks
 * the teacher to paste the text or photograph the page, which the vision path
 * handles.
 */

import { inflateSync, inflateRawSync, unzipSync } from "node:zlib";

export type PdfExtraction = {
  text: string;
  pages: number;
  streams: number;
  unreadable: boolean;
  reason?: string;
};

const MAX_STREAMS = 400;

function decodeLiteralString(raw: string): string {
  let out = "";
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char !== "\\") {
      out += char;
      continue;
    }
    const next = raw[index + 1];
    index += 1;
    switch (next) {
      case "n":
        out += "\n";
        break;
      case "r":
        out += "\r";
        break;
      case "t":
        out += "\t";
        break;
      case "b":
      case "f":
        out += " ";
        break;
      case "(":
      case ")":
      case "\\":
        out += next;
        break;
      default:
        if (next >= "0" && next <= "7") {
          let octal = next;
          while (octal.length < 3 && raw[index + 1] >= "0" && raw[index + 1] <= "7") {
            octal += raw[index + 1];
            index += 1;
          }
          out += String.fromCharCode(parseInt(octal, 8));
        } else out += next ?? "";
    }
  }
  return out;
}

function decodeHexString(raw: string): string {
  const hex = raw.replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let index = 0; index + 1 < hex.length; index += 2)
    out += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16));
  return out;
}

/** Pull the visible text out of one decompressed content stream. */
export function textFromContentStream(content: string): string {
  const out: string[] = [];
  const showText = /\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>/g;
  const operators = /\[((?:[^\][]|\\.)*)\]\s*TJ|(\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>)\s*Tj|\bT\*|\bTd\b|\bTD\b|\bET\b/g;
  let match: RegExpExecArray | null;
  while ((match = operators.exec(content)) !== null) {
    const token = match[0];
    if (token === "T*" || token.startsWith("Td") || token.startsWith("TD") || token === "ET") {
      out.push("\n");
      continue;
    }
    const pieces = token.match(showText);
    if (!pieces) continue;
    const line = pieces
      .map((piece) =>
        piece.startsWith("(") ? decodeLiteralString(piece.slice(1, -1)) : decodeHexString(piece.slice(1, -1)),
      )
      .join("");
    out.push(line);
  }
  return out
    .join("")
    .replace(/\r/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractStreams(bytes: Uint8Array): { content: string; streams: number } {
  const latin = Buffer.from(bytes).toString("latin1");
  const chunks: string[] = [];
  let streams = 0;
  const streamPattern = /stream\r?\n?([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamPattern.exec(latin)) !== null && streams < MAX_STREAMS) {
    streams += 1;
    const body = match[1];
    const buffer = Buffer.from(body, "latin1");
    let decoded: string | null = null;
    for (const inflate of [inflateSync, inflateRawSync, unzipSync]) {
      try {
        decoded = inflate(buffer).toString("latin1");
        break;
      } catch {
        // try the next codec
      }
    }
    const candidate = decoded ?? (/(Tj|TJ)/.test(body) ? body : null);
    if (!candidate || !/(Tj|TJ)/.test(candidate)) continue;
    const text = textFromContentStream(candidate);
    if (text) chunks.push(text);
  }
  return { content: chunks.join("\n\n"), streams };
}

function looksLikeGarbage(text: string): boolean {
  if (text.trim().length < 40) return true;
  const letters = (text.match(/[\p{L}\p{N}\s.,;:()/-]/gu) ?? []).length;
  const ratio = letters / Math.max(1, text.length);
  const words = text.split(/\s+/).filter((word) => word.length > 2);
  return ratio < 0.75 || words.length < 12;
}

export function extractPdfText(bytes: Uint8Array): PdfExtraction {
  const pageCount = (Buffer.from(bytes).toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const { content, streams } = extractStreams(bytes);
  if (streams === 0)
    return {
      text: "",
      pages: pageCount,
      streams: 0,
      unreadable: true,
      reason: "No readable text layer was found in this PDF.",
    };
  if (looksLikeGarbage(content))
    return {
      text: content,
      pages: pageCount,
      streams,
      unreadable: true,
      reason:
        "This PDF uses an embedded font encoding we cannot read reliably. Paste the text, or photograph the page and use the photo path.",
    };
  return { text: content.replace(/\n{3,}/g, "\n\n").trim(), pages: pageCount, streams, unreadable: false };
}

/** Split a long document into chapter-sized passages for the RAG index. */
export function paragraphize(text: string, maxChars = 420): string[] {
  const blocks = text
    .split(/\n\s*\n|\n(?=\s*(?:•|\d+[.)]|Chapter|CHAPTER))/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const passages: string[] = [];
  for (const block of blocks) {
    if (block.length <= maxChars * 1.6) {
      passages.push(block);
      continue;
    }
    let current = "";
    for (const sentence of block.split(/(?<=[.!?])\s+/)) {
      if ((current + " " + sentence).trim().length > maxChars) {
        if (current) passages.push(current.trim());
        current = sentence;
      } else current = `${current} ${sentence}`;
    }
    if (current.trim()) passages.push(current.trim());
  }
  return passages.filter((passage) => passage.length > 24).slice(0, 400);
}
