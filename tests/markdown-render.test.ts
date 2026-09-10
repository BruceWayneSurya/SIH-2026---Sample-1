import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownInline, MarkdownText } from "../src/components/markdown-text";

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

  it("renders the inline variant without block elements for <legend>/<label>", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownInline, { text: "Which is **H2O**? Use `n = m/M`." }),
    );
    assert.ok(html.includes("<strong"), "bold should still render");
    assert.ok(html.includes("<code"), "inline code should still render");
    assert.equal(html.includes("**"), false, "literal ** survived");
    for (const tag of ["<div", "<p", "<ul", "<ol", "<pre", "<blockquote"])
      assert.equal(html.includes(tag), false, `${tag} is invalid inside a legend/label`);
  });

  it("renders an empty reply without throwing", () => {
    assert.equal(typeof render(""), "string");
    assert.equal(typeof render(undefined as unknown as string), "string");
    assert.equal(
      typeof renderToStaticMarkup(createElement(MarkdownInline, { text: "" })),
      "string",
    );
  });
});

describe("AI reply math rendering", () => {
  it("typesets delimited LaTeX with KaTeX", () => {
    const html = render("Add $\\frac{1}{2} + \\frac{1}{4}$ to get $\\frac{3}{4}$");
    assert.ok(html.includes("katex"), "expected KaTeX output");
    assert.equal(html.includes("$"), false, "literal $ delimiters survived");
  });

  it("typesets fractions, exponents and roots the model wrote bare", () => {
    const html = render("The area of a circle is \\pi r^2 and 2^{10} = 1024.");
    assert.ok(html.includes("katex"), "expected KaTeX output");
    assert.ok((html.match(/katex/g) ?? []).length >= 2, "expected several formulas");
  });

  it("typesets a display formula block", () => {
    const html = render("$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$");
    assert.ok(html.includes("katex-display"), "expected display-mode KaTeX");
    assert.ok(html.includes("$$") === false, "literal $$ survived");
  });

  it("renders math inside bold and headings", () => {
    const html = render("### The identity $(a+b)^2$\n\n**Remember:** $a^2 + b^2$ alone is not enough");
    assert.ok((html.match(/katex/g) ?? []).length >= 2, "expected math in both places");
  });

  it("keeps prose dollars untouched", () => {
    const html = render("Costs $5 and $10 total");
    assert.ok(html.includes("$5"));
    assert.equal(html.includes("katex"), false, "money was parsed as math");
  });

  it("keeps broken LaTeX visible instead of throwing", () => {
    assert.equal(typeof render("$\\frac{1{$"), "string");
    assert.equal(typeof render("$$\\sqrt{$$"), "string");
  });
});
