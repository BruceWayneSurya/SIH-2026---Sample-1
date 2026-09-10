"use client";

import type { MathNode } from "@/lib/math";

/**
 * Renders the LaTeX-subset tree from lib/math as React elements.
 *
 * Everything here is plain text plus <sup>, <sub> and flexbox, so a fraction
 * stacks and a radical draws a vinculum without any typesetting library and
 * without assigning innerHTML. The raw TeX stays available to screen readers
 * through aria-label, since a visual fraction is hard to hear.
 */

function Nodes({ nodes }: { nodes: MathNode[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <NodeView key={index} node={node} />
      ))}
    </>
  );
}

function NodeView({ node }: { node: MathNode }) {
  switch (node.kind) {
    case "text":
      return <>{node.text}</>;

    case "sup":
      return (
        <>
          <Nodes nodes={node.base} />
          <sup className="align-super text-[0.7em] leading-none">
            <Nodes nodes={node.exponent} />
          </sup>
        </>
      );

    case "sub":
      return (
        <>
          <Nodes nodes={node.base} />
          <sub className="align-sub text-[0.7em] leading-none">
            <Nodes nodes={node.subscript} />
          </sub>
        </>
      );

    case "frac":
      return (
        <span className="mx-0.5 inline-flex flex-col items-center align-middle text-center leading-none">
          <span className="border-b border-current px-1 pb-0.5">
            <Nodes nodes={node.numerator} />
          </span>
          <span className="px-1 pt-0.5">
            <Nodes nodes={node.denominator} />
          </span>
        </span>
      );

    case "sqrt":
      return (
        <span className="inline-flex items-start">
          {node.index ? (
            <sup className="-mr-0.5 text-[0.6em] leading-none">
              <Nodes nodes={node.index} />
            </sup>
          ) : null}
          <span aria-hidden="true">&radic;</span>
          <span className="border-t border-current px-0.5">
            <Nodes nodes={node.body} />
          </span>
        </span>
      );
  }
}

export function MathView({
  tex,
  nodes,
  className,
}: {
  tex: string;
  nodes: MathNode[];
  className?: string;
}) {
  return (
    <span role="math" aria-label={tex} className={className}>
      <Nodes nodes={nodes} />
    </span>
  );
}
