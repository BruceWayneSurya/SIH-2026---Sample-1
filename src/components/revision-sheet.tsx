import { Printer, Download } from "lucide-react";
import type { RevisionSheet as Sheet } from "@/lib/revision/sheet";

/**
 * The printable one-page revision sheet.
 *
 * Rendered as HTML with A4 print rules (so Ctrl+P gives a clean sheet), and the
 * same model is available as a standalone SVG from /api/revision/[chapterId] for
 * a direct "save as PDF" or for the offline pack. Government schools print far
 * more often than they hand out tablets — this is the artefact that survives.
 */
export function RevisionSheetView({
  sheet,
  svgHref,
  chapterHref,
}: {
  sheet: Sheet;
  svgHref: string;
  chapterHref: string;
}) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4 shadow-sm print:hidden">
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">One-page revision sheet</h2>
          <p className="text-[12.5px] text-slate-500">
            A4 · {sheet.coverage.outcomes} outcomes · {sheet.coverage.questions} questions in the
            bank · generated {sheet.generatedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={svgHref}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-[13px] font-bold text-navy-700 hover:border-saffron-400"
          >
            <Download className="h-4 w-4" /> SVG / save as PDF
          </a>
          <a
            href={chapterHref}
            className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-3 py-2 text-[13px] font-bold text-white hover:bg-navy-700"
          >
            <Printer className="h-4 w-4" /> Print this page
          </a>
        </div>
      </header>

      <article
        id="revision-sheet"
        className="mx-auto w-full max-w-[210mm] rounded-lg border border-line bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        <div className="h-1.5 w-full rounded bg-saffron-500 print:rounded-none" aria-hidden="true" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-saffron-600">
          Pragyan · NCERT revision sheet
        </p>
        <p className="mt-1 text-[12px] font-semibold text-slate-500">{sheet.chapterLabel}</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-navy-950">{sheet.title}</h1>
        {sheet.book && <p className="mt-1 text-[12px] text-slate-500">Textbook: {sheet.book}</p>}

        <hr className="my-5 border-line" />

        <ol className="space-y-4">
          {sheet.outcomes.map((outcome, index) => (
            <li key={outcome.code} className="break-inside-avoid">
              <p className="text-[14px] font-extrabold text-navy-900">
                {index + 1}. {outcome.concept}{" "}
                <span className="font-semibold text-slate-400">(p. {outcome.page})</span>
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-navy-700">{outcome.statement}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-700">{outcome.definition}</p>
              {outcome.trap && (
                <p className="mt-1 text-[11.5px] font-semibold text-rose-700">
                  Trap: {outcome.trap} <span className="font-normal text-rose-600">(marks are lost here)</span>
                </p>
              )}
            </li>
          ))}
        </ol>

        {sheet.rapidFire.length > 0 && (
          <>
            <hr className="my-5 border-line" />
            <h2 className="text-[14px] font-extrabold text-navy-900">
              Rapid check — cover the answers and try again tomorrow
            </h2>
            <ol className="mt-2 space-y-1.5">
              {sheet.rapidFire.map((item, index) => (
                <li key={item.qtext} className="text-[12.5px] text-navy-800">
                  <span className="font-bold">{index + 1}.</span> {item.qtext}
                  {item.loConcept && (
                    <span className="ml-1 text-[11px] text-slate-400">({item.loConcept})</span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-md bg-paper px-3 py-2 text-[12px] font-semibold text-leaf-700">
              Answers: {sheet.rapidFire.map((item, index) => `${index + 1}. ${item.answer}`).join("   ")}
            </p>
          </>
        )}

        <hr className="my-5 border-line" />
        <p className="text-[10.5px] leading-relaxed text-slate-500">
          Sources: {sheet.sources.join(" · ") || "NCERT textbook"}. Generated from the chapter&apos;s
          NCERT learning outcomes and its indexed sources. Cross-check important answers with your
          teacher.
        </p>
      </article>
    </section>
  );
}
