"use client";

/**
 * Concept tree with the learner's own mastery colours.
 *
 * The tree comes from the parents in `learning_outcomes` (Combustion → Conditions
 * → Ignition temperature), so it is a real hierarchy rather than a list. Colours
 * come from the same mastery engine the teacher dashboard uses, which is only
 * possible because the portal holds assessment data — a notebook tool with no
 * marks cannot do this.
 */

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronRight, CircleDashed, PlayCircle, TriangleAlert } from "lucide-react";
import { masteryTone, type MasteryLevel } from "@/lib/outcomes/mastery";

export type ConceptNode = {
  code: string;
  concept: string;
  statement: string;
  definition: string;
  page: number;
  kind: string;
  diagram: string;
  misconceptions: string[];
  keywords: string[];
  level: MasteryLevel;
  accuracy: number;
  confidence: "low" | "medium" | "high";
  /** Video marker in the chapter lecture that matches this node, if any. */
  videoMarker: { t: number; label: string; url: string; title: string } | null;
  citations: { label: string; href: string; snippet: string }[];
  children: ConceptNode[];
};

function formatTime(seconds: number) {
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Small inline diagrams, drawn from the outcome's `diagram` field. */
function MiniDiagram({ kind }: { kind: string }) {
  if (kind === "fire-triangle") {
    return (
      <svg viewBox="0 0 120 96" className="h-24 w-28" role="img" aria-label="Fire triangle: fuel, air, heat">
        <polygon points="10,84 110,84 60,12" fill="#fff7ed" stroke="#f59e0b" strokeWidth="2" />
        <text x="60" y="64" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#7c2d12">
          FUEL
        </text>
        <text x="60" y="96" textAnchor="middle" fontSize="10" fill="#92400e">
          air (O₂) · heat
        </text>
      </svg>
    );
  }
  if (kind === "flame-zones") {
    return (
      <svg viewBox="0 0 120 96" className="h-24 w-28" role="img" aria-label="Zones of a candle flame">
        <path d="M40 8 C60 36 68 52 60 66 C54 76 26 76 20 66 C12 52 20 36 40 8 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M40 24 C54 44 58 54 52 64 C48 70 32 70 28 64 C22 54 26 44 40 24 Z" fill="#fde68a" stroke="#f59e0b" />
        <path d="M40 40 C48 52 50 58 46 63 C43 67 37 67 34 63 C30 58 32 52 40 40 Z" fill="#1e293b" />
        <text x="74" y="30" fontSize="9" fill="#334155">outer: hottest</text>
        <text x="74" y="50" fontSize="9" fill="#334155">middle: soot</text>
        <text x="74" y="70" fontSize="9" fill="#334155">inner: vapour</text>
      </svg>
    );
  }
  if (kind === "number-line") {
    return (
      <svg viewBox="0 0 140 40" className="h-12 w-36" role="img" aria-label="Number line">
        <line x1="6" y1="24" x2="134" y2="24" stroke="#334155" strokeWidth="1.5" />
        {[0, 1, 2, 3, 4].map((tick, index) => (
          <g key={tick}>
            <line x1={12 + tick * 29} y1="18" x2={12 + tick * 29} y2="30" stroke="#334155" strokeWidth="1.5" />
            <text x={12 + tick * 29} y="14" fontSize="9" textAnchor="middle" fill="#334155">
              {tick === 0 ? "0" : index === 4 ? "1" : ""}
            </text>
          </g>
        ))}
        <text x="70" y="38" fontSize="9" textAnchor="middle" fill="#0f172a" fontWeight="bold">
          divide into q equal parts
        </text>
      </svg>
    );
  }
  return null;
}

function NodeCard({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: ConceptNode;
  depth: number;
  selected: string;
  onSelect: (code: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const tone = masteryTone(node.level);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className={`flex items-start gap-2 rounded-md border px-2 py-1.5 ${
          selected === node.code ? "border-navy-400 bg-navy-50" : "border-line bg-white"
        }`}
        style={{ marginLeft: depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen(!open)}
            className="mt-0.5 rounded p-0.5 text-slate-500 hover:bg-navy-100"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="mt-1 ml-1 h-2.5 w-2.5 shrink-0 rounded-full border border-line" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.code)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
            <span className="truncate text-[13.5px] font-bold text-navy-900">{node.concept}</span>
            <span className="shrink-0 font-mono text-[10.5px] text-slate-400">{node.code}</span>
          </span>
          <span className="mt-0.5 block text-[11.5px] text-slate-500">
            {node.level === "not_started"
              ? "Not attempted — take the test to colour this node"
              : `${tone.label} · ${node.accuracy}% correct`}
          </span>
        </button>
      </div>
      {open && hasChildren && (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <NodeCard
              key={child.code}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function findNode(nodes: ConceptNode[], code: string): ConceptNode | null {
  for (const node of nodes) {
    if (node.code === code) return node;
    const child = findNode(node.children, code);
    if (child) return child;
  }
  return null;
}

export function ConceptMap({
  nodes,
  chapterTitle,
  mastered,
  total,
}: {
  nodes: ConceptNode[];
  chapterTitle: string;
  mastered: number;
  total: number;
}) {
  const [selected, setSelected] = useState(nodes[0]?.code ?? "");
  const node = findNode(nodes, selected) ?? nodes[0] ?? null;
  const tone = node ? masteryTone(node.level) : null;

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <h2 className="text-lg font-extrabold text-navy-900">Concept tree · {chapterTitle}</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">
          {mastered} of {total} outcomes secured by you. Colours come from your own quiz answers.
        </p>
        {nodes.length === 0 ? (
          <p className="mt-4 rounded-md border border-line bg-paper p-3 text-[13px] text-slate-600">
            No curated outcome map for this chapter yet. A teacher can add one in the content studio
            and the tree appears here.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {nodes.map((root) => (
              <NodeCard
                key={root.code}
                node={root}
                depth={0}
                selected={selected}
                onSelect={setSelected}
              />
            ))}
          </ul>
        )}
      </div>

      {node && tone && (
        <div className="space-y-4">
          <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${tone.chip}`}>
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${tone.dot}`} /> {tone.label}
            </span>
            <h3 className="mt-2 text-xl font-extrabold text-navy-900">{node.concept}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-navy-800">{node.statement}</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-slate-700">{node.definition}</p>

            {node.diagram !== "none" && (
              <div className="mt-3 rounded-md border border-line bg-paper p-2">
                <MiniDiagram kind={node.diagram} />
              </div>
            )}

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
              <div className="rounded-md border border-line bg-paper px-3 py-2">
                <dt className="font-bold text-slate-500">Textbook page</dt>
                <dd className="font-extrabold text-navy-800">p. {node.page}</dd>
              </div>
              <div className="rounded-md border border-line bg-paper px-3 py-2">
                <dt className="font-bold text-slate-500">Your accuracy</dt>
                <dd className="font-extrabold text-navy-800">
                  {node.level === "not_started" ? "—" : `${node.accuracy}%`}
                  <span className="ml-1 text-[11px] font-semibold text-slate-500">
                    ({node.confidence} evidence)
                  </span>
                </dd>
              </div>
            </dl>

            {node.misconceptions.length > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Common trap:</strong> {node.misconceptions[0]}
                </span>
              </p>
            )}

            {node.videoMarker && (
              <a
                href={`${node.videoMarker.url}#t=${node.videoMarker.t}`}
                className="mt-3 flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-[12.5px] font-bold text-navy-800 hover:border-navy-400"
              >
                <PlayCircle className="h-4 w-4 text-saffron-600" />
                {node.videoMarker.title} · jump to {formatTime(node.videoMarker.t)} — “
                {node.videoMarker.label}”
              </a>
            )}
          </article>

          <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-navy-900">
              <BookOpen className="h-4 w-4 text-saffron-600" /> Where this comes from
            </h3>
            {node.citations.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-slate-500">
                <CircleDashed className="mr-1 inline h-3.5 w-3.5" />
                No indexed source covers this outcome yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {node.citations.map((citation) => (
                  <li key={citation.label + citation.snippet.slice(0, 16)}>
                    <Link
                      href={citation.href}
                      className="block rounded-md border border-line bg-paper p-2.5 hover:border-navy-300"
                    >
                      <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-navy-600">
                        {citation.label}
                      </span>
                      <span className="mt-1 block text-[12.5px] text-slate-600">
                        “{citation.snippet}”
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11.5px] text-slate-500">
              Ask the tutor about this concept and it will quote these same paragraphs.
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
