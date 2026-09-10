import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import { getChunkContext } from "@/lib/queries-learning";
import { subjectName } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

/**
 * What a citation chip opens: the exact paragraph the tutor quoted, in the
 * context of the paragraphs around it. This page is the answer to "how do I know
 * the AI did not make that up?" — the text is a row in `source_chunks`, it is
 * labelled with its provenance and authority, and the learner can see the
 * sentence before and after it.
 */
export default async function SourcePage({
  params,
}: {
  params: Promise<{ chunkId: string }>;
}) {
  const { chunkId } = await params;
  const id = Number(chunkId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const context = await getChunkContext(id);
  if (!context?.chunk) notFound();
  const { chunk, citation, neighbours, chapter } = context;

  const authorityChip =
    chunk.authority === "ncert"
      ? { icon: BookOpen, label: "NCERT textbook", tone: "border-navy-200 bg-navy-50 text-navy-800" }
      : chunk.authority === "student"
        ? { icon: UserRound, label: "Classmate's note — lower ranked", tone: "border-line bg-paper text-slate-600" }
        : {
            icon: GraduationCap,
            label:
              chunk.authority === "faculty_verified"
                ? "Faculty-verified source"
                : "Faculty source",
            tone: "border-leaf-500/40 bg-leaf-50 text-leaf-700",
          };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500">
        {chapter && (
          <Link
            href={`/class/${chapter.classNo}/${chapter.subjectSlug}/${chapter.slug}?tab=learn`}
            className="inline-flex items-center gap-1 hover:text-navy-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Class {chapter.classNo} ·{" "}
            {subjectName(chapter.subjectSlug)} · {chapter.title}
          </Link>
        )}
      </nav>

      <article className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-saffron-600">
          <T>Cited source</T>
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900">{citation.label}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-bold ${authorityChip.tone}`}>
            <authorityChip.icon className="h-3.5 w-3.5" />
            {authorityChip.label}
          </span>
          <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[12px] font-semibold text-slate-600">
            {chunk.docTitle}
          </span>
          <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[12px] font-semibold text-slate-600">
            {citation.label}
          </span>
        </div>

        <ol className="mt-5 space-y-3">
          {neighbours?.map((row) => {
            const isCited = row.id === chunk.id;
            return (
              <li
                key={row.id}
                className={`rounded-md border px-4 py-3 text-[14px] leading-relaxed ${
                  isCited
                    ? "border-saffron-400 bg-saffron-50 font-semibold text-navy-950"
                    : "border-line bg-white text-slate-600"
                }`}
              >
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {row.heading ? `${row.heading} · ` : ""}
                  {row.page ? `p. ${row.page}, ` : ""}para {row.para}
                  {isCited ? " — quoted by the tutor" : ""}
                </p>
                {row.text}
              </li>
            );
          })}
        </ol>

        <p className="mt-5 flex items-start gap-2 rounded-md border border-line bg-paper px-4 py-3 text-[12.5px] leading-relaxed text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" />
          <span>
            <T>
              This paragraph is stored in the portal&apos;s source index. The tutor may only answer
              from indexed paragraphs, and it cites the one it used — so an answer without a chip is
              an answer it refused to give. Faculty-verified sources outrank classmates&apos; notes
              when both match a question.
            </T>
          </span>
        </p>
      </article>
    </div>
  );
}
