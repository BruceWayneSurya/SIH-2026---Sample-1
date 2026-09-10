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

describe("mathematics rendering", () => {
  /** What a student actually sees, with markup and attributes removed. */
  function visible(html: string): string {
    return html.replace(/<[^>]*>/g, "");
  }

  it("draws superscripts and subscripts instead of printing ^ and _", () => {
    const html = render("Water is H_2O and the area is x^2.");
    assert.ok(html.includes("<sub"), "the subscript should be a real <sub>");
    assert.ok(html.includes("<sup"), "the superscript should be a real <sup>");
    assert.equal(visible(html).includes("H_2"), false, "literal H_2 survived");
    assert.equal(visible(html).includes("x^2"), false, "literal x^2 survived");
  });

  it("stacks a fraction instead of printing \\frac", () => {
    const html = render("The value is $\\frac{3}{4}$.");
    assert.equal(visible(html).includes("\\frac"), false, "literal \\frac survived");
    assert.ok(visible(html).includes("3"), "numerator missing");
    assert.ok(visible(html).includes("4"), "denominator missing");
    assert.ok(html.includes("border-b"), "the fraction bar should be drawn");
  });

  it("draws a radical with a vinculum", () => {
    const html = render("So $\\sqrt{2}$ is irrational.");
    assert.equal(visible(html).includes("\\sqrt"), false, "literal \\sqrt survived");
    assert.ok(html.includes("&radic;") || html.includes("√"), "the radical sign is missing");
  });

  it("shows real symbols rather than command names", () => {
    const html = render("$2 \\times 3 \\leq 6$");
    assert.ok(visible(html).includes("×"), "times did not render");
    assert.ok(visible(html).includes("≤"), "less-than-or-equal did not render");
    assert.equal(visible(html).includes("\\times"), false, "literal \\times survived");
  });

  it("exposes the original TeX to assistive technology", () => {
    const html = render("$\\frac{1}{2}$");
    assert.ok(html.includes('role="math"'), "the maths should announce itself");
    assert.ok(html.includes("frac"), "the raw TeX should be the accessible label");
  });

  it("renders a standalone equation as its own block", () => {
    const html = render("Substituting:\n\n$$\nx = \\frac{-b}{2a}\n$$\n\nDone.");
    assert.equal(visible(html).includes("\\frac"), false, "literal \\frac survived");
    assert.ok(html.includes("justify-center"), "a display equation should be centred");
    assert.ok(html.includes('role="math"'), "the equation should announce itself");
  });

  it("renders exponents inside a display equation", () => {
    const html = render("$$\nx^{2} + y^{2} = r^{2}\n$$");
    assert.equal(visible(html).includes("x^2"), false, "literal x^2 survived");
    assert.ok(html.includes("<sup"), "the squared term should be a superscript");
  });

  it("renders bare TeX sent without delimiters", () => {
    const html = render("The sum is \\frac{1}{2} and the square is x^2.");
    assert.equal(visible(html).includes("\\frac"), false, "literal \\frac survived");
    assert.ok(html.includes("<sup"), "the superscript should render");
  });

  it("renders maths inside the inline variant without block elements", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownInline, { text: "Solve $x^{2} - 5x + 6 = 0$." }),
    );
    assert.ok(html.includes("<sup"), "the exponent should render inline");
    for (const tag of ["<div", "<p", "<ul", "<ol", "<pre", "<blockquote"])
      assert.equal(html.includes(tag), false, `${tag} is invalid inside a legend/label`);
  });

  it("keeps maths free of markup so nothing can be injected", () => {
    const html = render("$<script>alert(1)</script>x^{2}$");
    assert.equal(html.includes("<script>"), false);
    assert.ok(html.includes("alert(1)"), "the text itself should still be visible");
  });
});
