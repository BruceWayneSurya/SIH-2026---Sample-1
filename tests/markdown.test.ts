import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseInline, parseMarkdown, type MdInline } from "../src/lib/markdown";

function textOf(inline: MdInline[]): string {
  return inline.map((part) => (part.kind === "math" ? part.tex : part.text)).join("");
}

/** The text carried by one part, narrowing away the mathematics variant. */
function textAt(inline: MdInline[], index: number): string {
  const part = inline[index];
  return part.kind === "math" ? part.tex : part.text;
}

/** The mathematics part at an index, asserting that it is one. */
function mathAt(inline: MdInline[], index: number) {
  const part = inline[index];
  assert.equal(part?.kind, "math");
  if (part?.kind !== "math") throw new Error(`part ${index} is not mathematics`);
  return part;
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
    assert.equal(textAt(parts, 1), "b");
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
    assert.equal(textAt(parts, 0), "5 * 3 = 15, but ");
    assert.equal(textAt(parts, 1), "emphasis");
    assert.equal(textAt(parts, 2), " works");
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

describe("markdown mathematics", () => {
  it("reads delimited inline maths", () => {
    const parts = parseInline("The area is $\\frac{1}{2} b h$ here");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "math", "text"]);
    assert.equal(mathAt(parts, 1).display, false);
  });

  it("reads inline maths delimited by backslash parentheses", () => {
    const parts = parseInline("so \\(x^{2} + y^{2} = r^{2}\\) holds");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "math", "text"]);
  });

  it("marks dollar-dollar and backslash brackets as display maths", () => {
    assert.equal(mathAt(parseInline("$$x^{2}$$"), 0).display, true);
    assert.equal(mathAt(parseInline("\\[x^{2}\\]"), 0).display, true);
  });

  it("promotes a paragraph that is only an equation to a maths block", () => {
    const blocks = parseMarkdown("Substituting:\n\n$$\nx = \\frac{-b}{2a}\n$$\n\nDone.");
    assert.deepEqual(blocks.map((b) => b.kind), ["paragraph", "math", "paragraph"]);
  });

  it("reads bare TeX that the model sent without delimiters", () => {
    const parts = parseInline("So \\frac{a}{b} and x^2 both work");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "math", "text", "math", "text"]);
  });

  it("does not read an identifier or a file path as maths", () => {
    assert.deepEqual(parseInline("compare max_value and min_value"), [
      { kind: "text", text: "compare max_value and min_value" },
    ]);
    assert.deepEqual(parseInline("Save it to C:\\path\\to\\file"), [
      { kind: "text", text: "Save it to C:\\path\\to\\file" },
    ]);
  });

  it("still reads a chemical formula subscript as maths", () => {
    const parts = parseInline("Water is H_2O");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "math", "text"]);
    assert.equal(mathAt(parts, 1).tex, "H_2");
    assert.equal(textAt(parts, 2), "O");
  });

  it("keeps maths out of an inline code span", () => {
    const parts = parseInline("Type `x^2` verbatim");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "code", "text"]);
  });

  it("carries the original TeX so it can be announced", () => {
    assert.equal(mathAt(parseInline("$\\frac{1}{2}$"), 0).tex, "\\frac{1}{2}");
  });
});
