"use client";

import { parseInline, parseMarkdown, type MdInline } from "@/lib/markdown";
import { MathView } from "@/components/math-view";

/**
 * Renders model output as React elements.
 *
 * Nothing here assigns innerHTML, so a reply containing markup or a script tag
 * is shown as inert text rather than executed or styled as HTML.
 */

function Inline({ parts }: { parts: MdInline[] }) {
  return (
    <>
      {parts.map((part, index) => {
        switch (part.kind) {
          case "bold":
            return (
              <strong key={index} className="font-bold">
                {part.text}
              </strong>
            );
          case "italic":
            return <em key={index}>{part.text}</em>;
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
              <MathView
                key={index}
                tex={part.tex}
                nodes={part.nodes}
                className={
                  part.display
                    ? "mx-1 inline-flex items-center"
                    : "mx-0.5 inline-flex items-center"
                }
              />
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
 * italic and inline code, and drops block structure.
 */
export function MarkdownInline({ text }: { text: string }) {
  const parts = parseInline(String(text ?? ""));
  return <Inline parts={parts} />;
}

export function MarkdownText({ text }: { text: string }) {
  const blocks = parseMarkdown(text);

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

          case "math":
            return (
              <div key={index} className="flex justify-center overflow-x-auto py-1">
                <MathView
                  tex={block.tex}
                  nodes={block.nodes}
                  className="inline-flex items-center text-base"
                />
              </div>
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
