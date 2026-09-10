import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeModelMath, parseInline, parseMarkdown } from "../src/lib/markdown";

function textOf(inline: { kind: string; text?: string }[]): string {
  return inline.map((part) => part.text ?? "").join("");
}

describe("markdown inline runs", () => {
  it("splits bold, italic and inline code out of plain text", () => {
    assert.deepEqual(parseInline("plain"), [{ kind: "text", text: "plain" }]);
    assert.deepEqual(parseInline("**bold**"), [{ kind: "bold", text: "bold" }]);
    assert.deepEqual(parseInline("__bold__"), [{ kind: "bold", text: "bold" }]);
    assert.deepEqual(parseInline("*ital*"), [{ kind: "italic", text: "ital" }]);
    assert.deepEqual(parseInline("`code`"), [{ kind: "code", text: "code" }]);
  });

  it("reads ** as bold rather than two italics", () => {
    const parts = parseInline("a **b** c");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "bold", "text"]);
    assert.equal(textOf([parts[1]]), "b");
  });

  it("keeps surrounding words attached to the emphasis", () => {
    const parts = parseInline("Use **Newton's second law** here");
    assert.equal(textOf(parts), "Use Newton's second law here");
    assert.equal(parts[1].kind, "bold");
  });

  it("leaves an unbalanced marker alone instead of swallowing the line", () => {
    assert.deepEqual(parseInline("5 * 3 = 15"), [
      { kind: "text", text: "5 * 3 = 15" },
    ]);
    assert.equal(textOf(parseInline("an *unfinished emphasis")), "an *unfinished emphasis");
  });

  it("does not read underscores inside an identifier as italics", () => {
    assert.deepEqual(parseInline("compare max_value and min_value"), [
      { kind: "text", text: "compare max_value and min_value" },
    ]);
    assert.deepEqual(parseInline("Set row_count then col_count"), [
      { kind: "text", text: "Set row_count then col_count" },
    ]);
  });

  it("does not let an arithmetic asterisk swallow the rest of the sentence", () => {
    const parts = parseInline("5 * 3 = 15, but *emphasis* works");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "italic", "text"]);
    assert.equal(textOf([parts[0]]), "5 * 3 = 15, but ");
    assert.equal(textOf([parts[1]]), "emphasis");
    assert.equal(textOf([parts[2]]), " works");
  });

  it("keeps chemical formulae and slashes as plain text", () => {
    assert.deepEqual(parseInline("Water is H2O and CO2; speed = distance / time"), [
      { kind: "text", text: "Water is H2O and CO2; speed = distance / time" },
    ]);
  });

  it("returns no parts for empty input", () => {
    assert.deepEqual(parseInline(""), []);
  });
});

describe("markdown blocks", () => {
  it("reads headings and keeps their level", () => {
    const [block] = parseMarkdown("### Photosynthesis");
    assert.equal(block.kind, "heading");
    assert.equal(block.kind === "heading" && block.level, 3);
    assert.equal(block.kind === "heading" && textOf(block.inline), "Photosynthesis");
  });

  it("groups consecutive bullets into one list", () => {
    const [block] = parseMarkdown("- Chlorophyll\n- Sunlight\n- Water");
    assert.equal(block.kind, "list");
    assert.equal(block.kind === "list" && block.ordered, false);
    assert.equal(block.kind === "list" && block.items.length, 3);
    assert.equal(
      block.kind === "list" && textOf(block.items[1]),
      "Sunlight",
    );
  });

  it("groups numbered steps into an ordered list", () => {
    const [block] = parseMarkdown("1. First\n2. Second");
    assert.equal(block.kind === "list" && block.ordered, true);
    assert.equal(block.kind === "list" && block.items.length, 2);
  });

  it("keeps fenced code verbatim so markup inside is not parsed", () => {
    const [block] = parseMarkdown("```\nlet x = **not bold**;\n```");
    assert.equal(block.kind, "code");
    assert.equal(block.kind === "code" && block.text, "let x = **not bold**;");
  });

  it("survives a code fence the model never closed", () => {
    const [block] = parseMarkdown("```\nlet x = 1;");
    assert.equal(block.kind, "code");
    assert.equal(block.kind === "code" && block.text, "let x = 1;");
  });

  it("separates a paragraph from the list that follows it", () => {
    const blocks = parseMarkdown("Here are the steps:\n- One\n- Two");
    assert.deepEqual(blocks.map((b) => b.kind), ["paragraph", "list"]);
  });

  it("reads block quotes and horizontal rules", () => {
    assert.equal(parseMarkdown("> quoted")[0].kind, "quote");
    assert.equal(parseMarkdown("---")[0].kind, "rule");
  });

  it("keeps a wrapped paragraph as one block", () => {
    const blocks = parseMarkdown("line one\nline two\n\nnext paragraph");
    assert.deepEqual(blocks.map((b) => b.kind), ["paragraph", "paragraph"]);
  });

  it("never emits markup, so nothing can be injected as HTML", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>");
    for (const block of blocks) {
      assert.equal(block.kind, "paragraph");
      if (block.kind === "paragraph") assert.ok(textOf(block.inline).includes("<"));
    }
  });

  it("tolerates nullish and CRLF input", () => {
    assert.deepEqual(parseMarkdown(undefined as unknown as string), []);
    const blocks = parseMarkdown("one\r\n- a\r\n- b");
    assert.deepEqual(blocks.map((b) => b.kind), ["paragraph", "list"]);
  });
});

describe("markdown math", () => {
  it("reads delimited inline and display math as math tokens", () => {
    const parts = parseInline("So $x^2 + y^2$ holds");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "math", "text"]);
    assert.equal(parts[1].kind === "math" && parts[1].tex, "x^2 + y^2");
    const display = parseInline("answer $$E = mc^2$$ yes");
    assert.equal(display[1].kind === "math" && display[1].display, true);
  });

  it("keeps prose dollars as plain text", () => {
    assert.deepEqual(parseInline("Costs $5 and $10 total"), [
      { kind: "text", text: "Costs $5 and $10 total" },
    ]);
  });

  it("normalises \\(…\\) and \\[…\\] delimiters", () => {
    const parts = parseInline(normalizeModelMath("So \\(\\frac{a}{b}\\) is a fraction"));
    assert.equal(parts[1].kind, "math");
    const blocks = parseMarkdown("Proof:\n\n\\[ a^2 + b^2 = c^2 \\]");
    assert.equal(blocks.some((b) => b.kind === "math"), true);
  });

  it("auto-wraps bare LaTeX commands and exponents outside code", () => {
    const blocks = parseMarkdown("Where \\frac{1}{2} means half and 10^-19 is tiny");
    const inline = blocks.flatMap((b) => (b.kind === "paragraph" ? b.inline : []));
    const tex = inline.filter((p) => p.kind === "math").map((p) => (p as { tex: string }).tex);
    assert.ok(tex.includes("\\frac{1}{2}"));
    assert.ok(tex.includes("10^-19"));

    // Code fences are never touched.
    const [code] = parseMarkdown("```\n\\frac{1}{2} and 10^-19\n```");
    assert.equal(code.kind, "code");
    assert.equal(code.kind === "code" && code.text, "\\frac{1}{2} and 10^-19");
  });

  it("does not wrap exponents a second time inside existing math", () => {
    const blocks = parseMarkdown("The area is $\\pi r^2$ exactly");
    const inline = blocks.flatMap((b) => (b.kind === "paragraph" ? b.inline : []));
    const math = inline.filter((p) => p.kind === "math");
    assert.equal(math.length, 1);
    assert.equal(math[0].kind === "math" && math[0].tex, "\\pi r^2");
  });

  it("reads a multi-line display formula as one math block", () => {
    const blocks = parseMarkdown("$$\n\\frac{1}{2} + \\frac{1}{4}\n= \\frac{3}{4}\n$$");
    assert.equal(blocks[0].kind, "math");
    assert.equal(
      blocks[0].kind === "math" && blocks[0].tex,
      "\\frac{1}{2} + \\frac{1}{4}\n= \\frac{3}{4}",
    );
  });
});
