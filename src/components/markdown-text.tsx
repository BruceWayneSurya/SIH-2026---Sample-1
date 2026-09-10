"use client";

import { useMemo } from "react";
import katex from "katex";
import {
  normalizeModelMath,
  parseInline,
  parseMarkdown,
  type MdInline,
} from "@/lib/markdown";

/**
 * Renders model output as React elements.
 *
 * Nothing here assigns innerHTML from the model: ordinary text stays inert, so
 * a reply containing markup or a script tag is shown as text rather than
 * executed or styled as HTML. The one deliberate exception is mathematics:
 * KaTeX is handed the LaTeX between `$…$` / `$$…$$` delimiters, and KaTeX
 * escapes that input itself while producing only its own styled spans (URLs,
 * links and events stay disabled), which is the standard safe way to typeset
 * fractions, exponents and every other notation.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function MathSpan({ tex, display }: { tex: string; display: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore",
        trust: false,
      });
    } catch {
      // KaTeX with throwOnError:false almost never throws; keep the raw text
      // visible if it somehow does.
      return `<span class="katex-error">${escapeHtml(tex)}</span>`;
    }
  }, [tex, display]);

  if (display) {
    return (
      <span
        className="my-2 block overflow-x-auto text-center"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function Inline({ parts }: { parts: MdInline[] }) {
  return (
    <>
      {parts.map((part, index) => {
        switch (part.kind) {
          case "bold":
            return (
              <strong key={index} className="font-bold">
                {/* Re-parse so math inside **…** still typesets. */}
                <Inline parts={parseInline(part.text)} />
              </strong>
            );
          case "italic":
            return (
              <em key={index}>
                <Inline parts={parseInline(part.text)} />
              </em>
            );
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-navy-50 px-1 py-0.5 font-mono text-[0.85em]"
              >
                {part.text}
              </code>
            );
          case "math":
            return (
              <MathSpan key={index} tex={part.tex} display={part.display} />
            );
          default:
            return <span key={index}>{part.text}</span>;
        }
      })}
    </>
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-base font-extrabold",
  2: "text-base font-bold",
  3: "text-sm font-bold",
  4: "text-sm font-semibold",
  5: "text-sm font-semibold",
  6: "text-sm font-semibold",
};

/**
 * Inline-only variant for phrasing contexts such as <legend> and <label>,
 * where emitting a block element would be invalid nesting. Renders bold,
 * italic, inline code and inline math, and drops block structure.
 */
export function MarkdownInline({ text }: { text: string }) {
  const parts = useMemo(
    () => parseInline(normalizeModelMath(String(text ?? ""))),
    [text],
  );
  return <Inline parts={parts} />;
}

export function MarkdownText({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);

  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <p key={index} className={HEADING_CLASS[block.level] ?? HEADING_CLASS[6]}>
                <Inline parts={block.inline} />
              </p>
            );

          case "math":
            return (
              <MathSpan key={index} tex={block.tex} display />
            );

          case "list":
            return block.ordered ? (
              <ol key={index} className="ml-5 list-decimal space-y-1">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline parts={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="ml-5 list-disc space-y-1">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline parts={item} />
                  </li>
                ))}
              </ul>
            );

          case "code":
            return (
              <pre
                key={index}
                className="overflow-x-auto rounded-md bg-navy-50 p-3 font-mono text-[0.8em] leading-relaxed"
              >
                <code>{block.text}</code>
              </pre>
            );

          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-navy-200 pl-3 text-navy-700"
              >
                <Inline parts={block.inline} />
              </blockquote>
            );

          case "rule":
            return <hr key={index} className="border-line" />;

          default:
            return (
              <p key={index} className="whitespace-pre-wrap">
                <Inline parts={block.inline} />
              </p>
            );
        }
      })}
    </div>
  );
}
