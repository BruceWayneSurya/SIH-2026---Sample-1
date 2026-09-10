import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseInline, parseMarkdown } from "../src/lib/markdown";

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
    assert.equal(parts[1].text, "b");
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
    assert.equal(parts[0].text, "5 * 3 = 15, but ");
    assert.equal(parts[1].text, "emphasis");
    assert.equal(parts[2].text, " works");
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
