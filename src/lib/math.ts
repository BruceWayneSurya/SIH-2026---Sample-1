/**
 * LaTeX-subset reader for mathematical notation in model output.
 *
 * Models answer maths questions with TeX: \frac{a}{b}, x^{2}, \sqrt{2},
 * \alpha, H_2O. Showing that verbatim is worse than showing nothing, so the
 * subset that school maths actually uses is parsed into a tree the UI renders
 * as elements — stacked fractions, super/subscripts, radicals and real symbols.
 *
 * A full TeX engine is not warranted here and would be a large dependency for a
 * portal that ships a data-saver mode for low-bandwidth users. Anything outside
 * this subset is passed through as readable text rather than dropped.
 *
 * Pure and returns data, never markup, so nothing is interpreted as HTML.
 */

export type MathNode =
  | { kind: "text"; text: string }
  | { kind: "sup"; base: MathNode[]; exponent: MathNode[] }
  | { kind: "sub"; base: MathNode[]; subscript: MathNode[] }
  | { kind: "frac"; numerator: MathNode[]; denominator: MathNode[] }
  | { kind: "sqrt"; index?: MathNode[]; body: MathNode[] }
  | { kind: "env"; name: string; rows: MathNode[][][] };

const SYMBOLS: Record<string, string> = {
  // Greek, lower case
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ",
  lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", varpi: "ϖ", rho: "ρ",
  sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ",
  psi: "ψ", omega: "ω",
  // Greek, upper case
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  // Operators and relations
  times: "×", div: "÷", pm: "±", mp: "∓", cdot: "·", ast: "∗", star: "⋆",
  circ: "∘", bullet: "•", leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠",
  ne: "≠", approx: "≈", equiv: "≡", propto: "∝", sim: "∼", cong: "≅",
  ll: "≪", gg: "≫",
  // Sets and logic
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", supset: "⊃", subeq: "⊆",
  supseteq: "⊇", cup: "∪", cap: "∩", emptyset: "∅", varnothing: "∅",
  forall: "∀", exists: "∃", neg: "¬", land: "∧", lor: "∨",
  // Calculus and misc
  infty: "∞", partial: "∂", nabla: "∇", sum: "∑", prod: "∏", int: "∫",
  oint: "∮", angle: "∠", perp: "⊥", parallel: "∥", therefore: "∴",
  because: "∵", ldots: "…", cdots: "⋯", dots: "…", degree: "°",
  triangle: "△", square: "□", prime: "′",
  // Arrows
  rightarrow: "→", Rightarrow: "⇒", leftarrow: "←", Leftarrow: "⇐",
  leftrightarrow: "↔", Leftrightarrow: "⇔", to: "→", mapsto: "↦",
  // Typography
  quad: " ", qquad: "  ", ",": " ", ":": " ", ";": " ", "!": "", " ": " ",
};

/** Commands that take a {group} and render as their symbol. */
const WRAPPED_TEXT = new Set(["text", "mathrm", "mathbf", "mathit", "operatorname"]);

const GROUP_COMMANDS = new Set([
  "frac", "dfrac", "tfrac", "cfrac", "sqrt", "text", "mathrm", "mathbf",
  "mathit", "operatorname", "overline", "underline", "hat", "bar", "vec",
  "dot", "tilde", "left", "right", "big", "Big", "bigg", "Bigg",
]);

/** True when the string carries TeX that this module knows how to render. */
export function containsMath(text: string): boolean {
  return /\\[a-zA-Z]+|[$^_]|\^\{|\d\s*\/\s*\d/.test(text);
}

class Reader {
  private i = 0;
  constructor(private readonly src: string) {}

  get done(): boolean {
    return this.i >= this.src.length;
  }

  peek(): string {
    return this.src[this.i] ?? "";
  }

  /** Parse until a closing brace or the end of input. */
  parseNodes(stopAtBrace: boolean): MathNode[] {
    const nodes: MathNode[] = [];
    let buffer = "";

    const flush = () => {
      if (buffer) {
        nodes.push({ kind: "text", text: buffer });
        buffer = "";
      }
    };

    while (!this.done) {
      const char = this.peek();

      if (char === "}") {
        if (stopAtBrace) {
          this.i++;
          break;
        }
        this.i++;
        continue;
      }

      if (char === "{") {
        this.i++;
        const inner = this.parseNodes(true);
        flush();
        nodes.push(...inner);
        continue;
      }

      if (char === "^" || char === "_") {
        this.i++;
        flush();
        const argument = this.parseArgument();
        nodes.push(
          char === "^"
            ? { kind: "sup", base: this.takeBase(nodes), exponent: argument }
            : { kind: "sub", base: this.takeBase(nodes), subscript: argument },
        );
        continue;
      }

      if (char === "\\") {
        const parsed = this.parseCommand();
        if (parsed) {
          flush();
          nodes.push(parsed);
          continue;
        }
      }

      buffer += char;
      this.i++;
    }

    flush();
    return nodes;
  }

  /** A single token after ^ or _: either a {group} or one character/command. */
  /**
   * The atom a ^ or _ attaches to. TeX binds these to the immediately
   * preceding atom, not to the whole preceding text run — so in
   * "a^2 + b^2" the second superscript belongs to "b", not to " + b".
   */
  private takeBase(nodes: MathNode[]): MathNode[] {
    const last = nodes[nodes.length - 1];
    if (!last) return [];
    if (last.kind === "text" && last.text.length > 1) {
      const tail = last.text.slice(-1);
      last.text = last.text.slice(0, -1);
      return [{ kind: "text", text: tail }];
    }
    nodes.pop();
    return [last];
  }

  private parseArgument(): MathNode[] {
    while (this.peek() === " ") this.i++;
    if (this.peek() === "{") {
      this.i++;
      return this.parseNodes(true);
    }
    if (this.peek() === "\\") {
      const parsed = this.parseCommand();
      if (parsed) return [parsed];
    }
    const char = this.peek();
    if (char) {
      this.i++;
      return [{ kind: "text", text: char }];
    }
    return [];
  }

  private parseCommand(): MathNode | null {
    const start = this.i;
    this.i++; // consume the backslash

    // Escaped punctuation: \%, \&, \#, \$, \_
    const escaped = this.peek();
    if (!/[a-zA-Z]/.test(escaped)) {
      if (escaped) {
        this.i++;
        // Spacing commands (\, \; \: \! \ ) look like escaped punctuation but
        // are layout, so they must not print the character itself.
        if (Object.hasOwn(SYMBOLS, escaped))
          return { kind: "text", text: SYMBOLS[escaped] };
        return { kind: "text", text: escaped };
      }
      this.i = start + 1;
      return { kind: "text", text: "\\" };
    }

    let name = "";
    while (!this.done && /[a-zA-Z]/.test(this.peek())) {
      name += this.peek();
      this.i++;
    }

    // Sizing prefixes carry no meaning without a full TeX engine.
    if (["left", "right", "big", "Big", "bigg", "Bigg", "displaystyle", "limits"].includes(name)) {
      const next = this.peek();
      if (next === "(" || next === ")" || next === "[" || next === "]" || next === "|" || next === ".") {
        this.i++;
        return { kind: "text", text: next === "." ? "" : next };
      }
      return null;
    }

    if (name === "frac" || name === "dfrac" || name === "tfrac" || name === "cfrac") {
      const numerator = this.parseGroupArgument();
      const denominator = this.parseGroupArgument();
      return { kind: "frac", numerator, denominator };
    }

    if (name === "sqrt") {
      let index: MathNode[] | undefined;
      if (this.peek() === "[") {
        this.i++;
        const raw = this.readUntil("]");
        index = new Reader(raw).parseNodes(false);
      }
      return { kind: "sqrt", index, body: this.parseGroupArgument() };
    }

    // \begin{aligned} … \end{aligned} and friends: models lean on these for
    // multi-line working, so they are read as rows of cells rather than
    // leaking the literal \begin to the student.
    if (name === "begin") {
      const env = this.readGroupRaw().trim();
      const body = this.readEnvironmentBody(env);
      return {
        kind: "env",
        name: env,
        rows: splitRows(body).map((row) =>
          splitCells(row).map((cell) => new Reader(cell).parseNodes(false)),
        ),
      };
    }

    if (WRAPPED_TEXT.has(name)) {
      return { kind: "text", text: this.readGroupRaw() };
    }

    // Decorations keep their argument; the accent itself is dropped.
    if (["overline", "underline", "hat", "bar", "vec", "dot", "tilde", "widehat"].includes(name)) {
      const body = this.parseGroupArgument();
      return { kind: "text", text: flatten(body) };
    }

    if (Object.hasOwn(SYMBOLS, name)) {
      return { kind: "text", text: SYMBOLS[name] };
    }

    // Unknown command: keep the name so nothing silently disappears.
    return { kind: "text", text: name };
  }

  private parseGroupArgument(): MathNode[] {
    while (this.peek() === " ") this.i++;
    if (this.peek() === "{") {
      this.i++;
      return this.parseNodes(true);
    }
    const char = this.peek();
    if (char) {
      this.i++;
      return [{ kind: "text", text: char }];
    }
    return [];
  }

  private readGroupRaw(): string {
    while (this.peek() === " ") this.i++;
    if (this.peek() !== "{") return "";
    this.i++;
    return this.readUntil("}");
  }

  /** Consume everything up to and including \end{name}, tolerating a missing one. */
  private readEnvironmentBody(env: string): string {
    const stop = `\\end{${env}}`;
    const at = this.src.indexOf(stop, this.i);
    if (at === -1) {
      const rest = this.src.slice(this.i);
      this.i = this.src.length;
      return rest;
    }
    const body = this.src.slice(this.i, at);
    this.i = at + stop.length;
    return body;
  }

  private readUntil(stop: string): string {
    let out = "";
    let depth = 0;
    while (!this.done) {
      const char = this.peek();
      if (char === "{") depth++;
      else if (char === "}") {
        if (depth === 0 && stop === "}") {
          this.i++;
          break;
        }
        depth--;
      } else if (char === stop && depth === 0) {
        this.i++;
        break;
      }
      out += char;
      this.i++;
    }
    return out;
  }
}

function flatten(nodes: MathNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
          return node.text;
        case "sup":
          return `${flatten(node.base)}^${flatten(node.exponent)}`;
        case "sub":
          return `${flatten(node.base)}_${flatten(node.subscript)}`;
        case "frac":
          return `${flatten(node.numerator)}/${flatten(node.denominator)}`;
        case "sqrt":
          return `√${flatten(node.body)}`;
        case "env":
          return node.rows
            .map((row) => row.map((cell) => flatten(cell)).join(" "))
            .join(" ");
      }
    })
    .join("");
}

/**
 * Split an environment body on `\\` row breaks, ignoring any that sit inside a
 * brace group so `\frac{a\\b}{c}` is not treated as two rows.
 */
function splitRows(body: string): string[] {
  const rows: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === "{") depth++;
    else if (char === "}") depth = Math.max(0, depth - 1);
    if (char === "\\" && body[i + 1] === "\\" && depth === 0) {
      rows.push(current);
      current = "";
      i++;
      continue;
    }
    current += char;
  }
  rows.push(current);
  return rows.filter((row) => row.trim() !== "");
}

/** Split one row on `&` cell separators, again respecting brace depth. */
function splitCells(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === "{") depth++;
    else if (char === "}") depth = Math.max(0, depth - 1);
    if (char === "&" && depth === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/** Parse a TeX fragment into a renderable tree. */
export function parseMath(tex: string): MathNode[] {
  return new Reader(String(tex ?? "")).parseNodes(false);
}

/** Merge adjacent text runs so the UI emits fewer, cleaner nodes. */
export function normalizeMath(nodes: MathNode[]): MathNode[] {
  const out: MathNode[] = [];
  for (const node of nodes) {
    const last = out[out.length - 1];
    if (node.kind === "text" && last?.kind === "text") {
      last.text += node.text;
      continue;
    }
    out.push(node);
  }
  return out.filter((node) => !(node.kind === "text" && node.text === ""));
}
