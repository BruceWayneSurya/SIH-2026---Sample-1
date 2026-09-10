import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownText } from "../src/components/markdown-text";

// The AI tutor and study tools print model output, which is normally Markdown.
// These assert the UI turns it into real elements instead of showing students
// literal `**` and `###`, and that markup in a reply can never become live HTML.

function render(text: string): string {
  return renderToStaticMarkup(createElement(MarkdownText, { text }));
}

const SAMPLE = [
  "### Newton's Second Law",
  "",
  "The force on a body equals **mass times acceleration**:",
  "",
  "```",
  "F = m * a",
  "```",
  "",
  "Key points:",
  "- Force is measured in *newtons*",
  "- Use `F = m * a` for constant mass",
  "1. Identify the mass",
  "2. Measure acceleration",
  "",
  "> Always check units.",
].join("\n");

describe("AI reply rendering", () => {
  it("shows no leftover markdown punctuation to the student", () => {
    const html = render(SAMPLE);
    assert.equal(html.includes("**"), false, "literal ** survived");
    assert.equal(html.includes("###"), false, "literal ### survived");
    assert.equal(html.includes("`"), false, "literal backtick survived");
  });

  it("renders emphasis, code, lists and quotes as elements", () => {
    const html = render(SAMPLE);
    for (const tag of ["<strong", "<em", "<code", "<pre", "<ul", "<ol", "<li", "<blockquote"])
      assert.ok(html.includes(tag), `expected ${tag} in output`);
  });

  it("keeps a code block body verbatim instead of parsing it", () => {
    assert.ok(render("```\nF = m * a\n```").includes("F = m * a"));
  });

  it("leaves model output inert so markup cannot execute", () => {
    const html = render("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>");
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("<img"), false);
    assert.ok(html.includes("alert(1)"), "the text itself should still be visible");
  });

  it("renders an empty reply without throwing", () => {
    assert.equal(typeof render(""), "string");
    assert.equal(typeof render(undefined as unknown as string), "string");
  });
});
