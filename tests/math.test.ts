import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { containsMath, normalizeMath, parseMath, type MathNode } from "../src/lib/math";

/** Render a node tree as a compact signature so assertions stay readable. */
function show(nodes: MathNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
          return JSON.stringify(node.text);
        case "sup":
          return `SUP[${show(node.base)}^{${show(node.exponent)}}]`;
        case "sub":
          return `SUB[${show(node.base)}_{${show(node.subscript)}}]`;
        case "frac":
          return `FRAC(${show(node.numerator)} / ${show(node.denominator)})`;
        case "sqrt":
          return `SQRT${node.index ? `[${show(node.index)}]` : ""}(${show(node.body)})`;
      }
    })
    .join(" ");
}

/** Parse and merge, the way the renderer receives it. */
function read(tex: string): string {
  return show(normalizeMath(parseMath(tex)));
}

describe("math reader", () => {
  it("reads a fraction into numerator and denominator", () => {
    assert.equal(read("\\frac{a}{b}"), 'FRAC("a" / "b")');
    assert.equal(read("\\frac{1}{2}"), 'FRAC("1" / "2")');
  });

  it("reads a superscript, braced or single token", () => {
    assert.equal(read("x^{2}"), 'SUP["x"^{"2"}]');
    assert.equal(read("x^2"), 'SUP["x"^{"2"}]');
    assert.equal(read("E = mc^2"), '"E = m" SUP["c"^{"2"}]');
  });

  it("binds a script to the preceding atom, not the whole text run", () => {
    // Without this, "b^2" would carry " + b" as its base.
    assert.equal(
      read("a^2 + b^2 = c^2"),
      'SUP["a"^{"2"}] " + " SUP["b"^{"2"}] " = " SUP["c"^{"2"}]',
    );
  });

  it("reads a subscript, including a braced one and a trailing atom", () => {
    assert.equal(read("H_2O"), 'SUB["H"_{"2"}] "O"');
    assert.equal(read("a_{n+1}"), 'SUB["a"_{"n+1"}]');
  });

  it("reads a radical, and keeps the root index when one is given", () => {
    assert.equal(read("\\sqrt{2}"), 'SQRT("2")');
    assert.equal(read("\\sqrt[3]{x}"), 'SQRT["3"]("x")');
  });

  it("nests a radical inside a fraction, as the quadratic formula does", () => {
    assert.equal(
      read("\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"),
      'FRAC("-b " "±" " " SQRT(SUP["b"^{"2"}] " - 4ac") / "2a")',
    );
  });

  it("maps symbol commands to real characters", () => {
    assert.equal(read("\\alpha + \\beta = 90^\\circ"), '"α + β = 9" SUP["0"^{"∘"}]');
    assert.equal(read("2 \\times 3 = 6"), '"2 × 3 = 6"');
    assert.equal(read("x \\leq 5 \\neq 4"), '"x ≤ 5 ≠ 4"');
  });

  it("honours \\text and escapes such as \\%", () => {
    assert.equal(read("50\\% \\text{ of } 200"), '"50%  of  200"');
  });

  it("passes an unknown command through as readable text", () => {
    assert.equal(read("\\wibble x"), '"wibble x"');
  });

  it("leaves plain prose untouched", () => {
    assert.equal(read("The area is 24 square centimetres."), '"The area is 24 square centimetres."');
    assert.equal(read(""), "");
  });

  it("survives unbalanced braces without throwing", () => {
    // The unterminated group yields an empty denominator rather than a crash;
    // normalizeMath drops the empty text run, so nothing renders there.
    assert.equal(read("\\frac{a}{"), 'FRAC("a" / )');
    assert.equal(read("x^{"), 'SUP["x"^{}]');
  });

  it("detects whether a string carries notation worth parsing", () => {
    assert.equal(containsMath("\\frac{a}{b}"), true);
    assert.equal(containsMath("x^2"), true);
    assert.equal(containsMath("$x$"), true);
    assert.equal(containsMath("The answer is 24."), false);
  });

  it("merges adjacent text runs when normalising", () => {
    const nodes = parseMath("a \\times b");
    assert.ok(nodes.length > normalizeMath(nodes).length);
    assert.equal(normalizeMath(nodes).length, 1);
  });
});
